import { createHash } from 'node:crypto';
import type { AffineCredential } from '../client/affine.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import type { LoadedWorkspace } from './load-workspaces';

export interface TreeSnapshot {
  readonly version: 1;
  readonly savedAt: number;
  readonly serverUrl: string;
  /** A one-way fingerprint of the credential, so a snapshot is never shown to a different account. */
  readonly accountKey: string;
  readonly workspaces: readonly LoadedWorkspace[];
}

export const TREE_SNAPSHOT_KEY = 'affine.treeSnapshot';

/** A fingerprint that identifies the signed-in account without containing the secret. */
export function accountKeyOf(credential: AffineCredential): string {
  const secret = credential.kind === AffineCredentialKind.ACCESS_TOKEN ? `token:${credential.token}` : `session:${credential.cookieHeader}`;
  return createHash('sha256').update(secret).digest('hex');
}

export function toSnapshot(serverUrl: string, accountKey: string, workspaces: readonly LoadedWorkspace[], now: number): TreeSnapshot {
  return { version: 1, savedAt: now, serverUrl, accountKey, workspaces };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTreeNode(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['kind'] === 'string' &&
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    Array.isArray(value['children']) &&
    value['children'].every(isTreeNode)
  );
}

function isLoadedWorkspace(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value['workspace']) || typeof value['workspace']['id'] !== 'string') {
    return false;
  }
  const pages = value['pages'];
  return (
    isRecord(pages) &&
    (pages['name'] === null || typeof pages['name'] === 'string') &&
    Array.isArray(pages['documents']) &&
    Array.isArray(pages['favorites']) &&
    Array.isArray(pages['collections']) &&
    Array.isArray(pages['tree']) &&
    pages['tree'].every(isTreeNode)
  );
}

/** The saved tree, or undefined when the stored value is not usable here (damaged, another server or another account). */
export function parseSnapshot(value: unknown, serverUrl: string, accountKey: string): TreeSnapshot | undefined {
  if (!isRecord(value) || value['version'] !== 1 || value['serverUrl'] !== serverUrl || value['accountKey'] !== accountKey || typeof value['savedAt'] !== 'number') {
    return undefined;
  }
  const workspaces = value['workspaces'];
  if (!Array.isArray(workspaces) || !workspaces.every(isLoadedWorkspace)) {
    return undefined;
  }
  return { version: 1, savedAt: value['savedAt'], serverUrl, accountKey, workspaces: workspaces as readonly LoadedWorkspace[] };
}
