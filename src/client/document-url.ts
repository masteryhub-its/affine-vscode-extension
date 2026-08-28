import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { isWorkspaceSpaceType } from '../utils/affine-space-type';
import { AffineSpaceType } from '../utils/enums/affine-space-type.enum';
import { UrlProtocol } from '../utils/enums/url-protocol.enum';
import { isAbsoluteHttpHref } from '../utils/url-protocol';
import type { AffineDocument } from './affine.types';

export function buildDocumentUrl(serverUrl: string, workspaceId: string, docId: string): string {
  if (workspaceId.trim().length === 0 || docId.trim().length === 0) {
    throw new AffineError('Workspace id and document id are required', AffineErrorCode.INVALID_CONFIG);
  }
  return `${serverUrl}/${AffineSpaceType.WORKSPACE}/${encodeURIComponent(workspaceId)}/${encodeURIComponent(docId)}`;
}

export function workspaceLabel(workspaceId: string, name?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    return trimmed;
  }
  const short = workspaceId.slice(0, 8);
  return short.length === 0 ? 'Workspace' : `Workspace ${short}`;
}

export function buildWorkspaceDocUrl(serverUrl: string, workspaceId: string, docId: string): string {
  if (workspaceId.trim().length === 0 || docId.trim().length === 0) {
    throw new AffineError('Workspace id and document id are required', AffineErrorCode.INVALID_CONFIG);
  }
  return `${serverUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/docs/${encodeURIComponent(docId)}`;
}

export function buildWorkspaceRootDocUrl(serverUrl: string, workspaceId: string): string {
  return buildWorkspaceDocUrl(serverUrl, workspaceId, workspaceId);
}

export function buildWorkspaceBlobUrl(serverUrl: string, workspaceId: string, blobId: string): string {
  if (workspaceId.trim().length === 0 || blobId.trim().length === 0) {
    throw new AffineError('Workspace id and blob id are required', AffineErrorCode.INVALID_CONFIG);
  }
  return `${serverUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/blobs/${encodeURIComponent(blobId)}`;
}

export function foldersTableDocId(workspaceId: string): string {
  if (workspaceId.trim().length === 0) {
    throw new AffineError('Workspace id is required', AffineErrorCode.INVALID_CONFIG);
  }
  return `db$${workspaceId}$folders`;
}

export function documentTitle(title: string | null | undefined): string {
  const trimmed = title?.trim();
  return trimmed === undefined || trimmed.length === 0 ? 'Untitled' : trimmed;
}

export function resolveAssetUrl(serverUrl: string, assetUrl: string | null | undefined): string | undefined {
  if (assetUrl === undefined || assetUrl === null) {
    return undefined;
  }
  const trimmed = assetUrl.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (isAbsoluteHttpHref(trimmed)) {
    try {
      const assetOrigin = new URL(trimmed).origin;
      const serverOrigin = new URL(serverUrl).origin;
      return assetOrigin === serverOrigin ? trimmed : undefined;
    } catch {
      return undefined;
    }
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${serverUrl}${path}`;
}

export function resolvePreviewHref(serverUrl: string, href: string): string | undefined {
  const trimmed = href.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return undefined;
  }
  if (isAbsoluteHttpHref(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `${UrlProtocol.HTTPS}${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${serverUrl}${trimmed}`;
  }
  try {
    return new URL(trimmed, `${serverUrl}/`).toString();
  } catch {
    return undefined;
  }
}

export interface DocumentPageUrlParts {
  readonly serverUrl: string;
  readonly workspaceId: string;
  readonly docId: string;
}

export function parseDocumentPageUrl(url: string): DocumentPageUrlParts | undefined {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter((part) => part.length > 0);
    if (!isWorkspaceSpaceType(parts[0]) || parts[1] === undefined || parts[2] === undefined) {
      return undefined;
    }
    return {
      serverUrl: `${parsed.protocol}//${parsed.host}`,
      workspaceId: decodeURIComponent(parts[1]),
      docId: decodeURIComponent(parts[2]),
    };
  } catch {
    return undefined;
  }
}

export function toSearchTitle(document: AffineDocument): string {
  return documentTitle(document.title);
}
