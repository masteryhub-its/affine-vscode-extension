import type { AffineCredential } from '../client/affine.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { AffineSpaceType } from '../utils/enums/affine-space-type.enum';
import type { PushDocUpdateInput } from './affine-sync';

export interface SocketAuth {
  readonly token: string;
}

export interface SpaceJoinPayload {
  readonly spaceType: AffineSpaceType.WORKSPACE;
  readonly spaceId: string;
  readonly clientVersion: string;
}

export interface SpacePushDocUpdatePayload {
  readonly spaceType: AffineSpaceType.WORKSPACE;
  readonly spaceId: string;
  readonly docId: string;
  readonly update: string;
  readonly updates: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function socketAuth(credential: AffineCredential): SocketAuth {
  if (credential.kind === AffineCredentialKind.ACCESS_TOKEN) {
    return { token: credential.token };
  }
  return { token: credential.cookieHeader };
}

export function spaceJoinPayload(workspaceId: string, clientVersion: string): SpaceJoinPayload {
  return {
    spaceType: AffineSpaceType.WORKSPACE,
    spaceId: workspaceId,
    clientVersion,
  };
}

export function spacePushDocUpdatePayload(input: PushDocUpdateInput): SpacePushDocUpdatePayload {
  const encoded = bytesToBase64(input.update);
  return {
    spaceType: AffineSpaceType.WORKSPACE,
    spaceId: input.workspaceId,
    docId: input.docId,
    update: encoded,
    updates: encoded,
  };
}

export function spaceAckError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const error = value['error'];
  if (isRecord(error) && typeof error['message'] === 'string' && error['message'].length > 0) {
    return error['message'];
  }
  const data = value['data'];
  if (isRecord(data) && data['success'] === false) {
    return 'AFFiNE rejected the sync session. Set affine.clientVersion to 0.26.0 or newer to match your server.';
  }
  if (isRecord(data) && data['accepted'] === false) {
    return 'AFFiNE sync request failed';
  }
  return undefined;
}
