import { DEFAULT_CLIENT_VERSION, DEFAULT_OPEN_MODE, DEFAULT_SERVER_URL } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { parseOpenMode } from '../utils/open-mode';
import { isAllowedUrlProtocol } from '../utils/url-protocol';
import type { AffineSettings, OpenMode, RawAffineSettings } from './settings.types';

export interface InspectedServerUrl {
  readonly globalValue: string | undefined;
  readonly defaultValue: string | undefined;
  readonly workspaceValue: string | undefined;
  readonly workspaceFolderValue: string | undefined;
}

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return LOOPBACK_HOSTS.has(host);
}

export function preferredServerUrlRaw(inspected: InspectedServerUrl): string {
  if (typeof inspected.globalValue === 'string' && inspected.globalValue.trim().length > 0) {
    return inspected.globalValue;
  }
  if (typeof inspected.defaultValue === 'string' && inspected.defaultValue.trim().length > 0) {
    return inspected.defaultValue;
  }
  return DEFAULT_SERVER_URL;
}

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new AffineError('Server URL is required', AffineErrorCode.INVALID_CONFIG);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (cause: unknown) {
    throw new AffineError('Server URL is invalid', AffineErrorCode.INVALID_CONFIG, { cause });
  }

  if (!isAllowedUrlProtocol(parsed.protocol)) {
    throw new AffineError('Server URL must use http or https', AffineErrorCode.INVALID_CONFIG);
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw new AffineError('Server URL must not include credentials', AffineErrorCode.INVALID_CONFIG);
  }

  if (parsed.protocol === 'http:' && !isLoopbackHost(parsed.hostname)) {
    throw new AffineError('Server URL must use https unless the host is localhost', AffineErrorCode.INVALID_CONFIG);
  }

  const path = parsed.pathname.replace(/\/+$/u, '');
  const normalizedPath = path === '/' ? '' : path;
  return `${parsed.origin}${normalizedPath}`;
}

export function normalizeOptionalId(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function normalizeOpenMode(raw: string): OpenMode {
  return parseOpenMode(raw) ?? DEFAULT_OPEN_MODE;
}

export function normalizeClientVersion(raw: string): string {
  const trimmed = raw.trim();
  const version = trimmed.length === 0 ? DEFAULT_CLIENT_VERSION : trimmed;
  return isBelowWebsocketMinimum(version) ? DEFAULT_CLIENT_VERSION : version;
}

function isBelowWebsocketMinimum(version: string): boolean {
  const match = /^(\d+)\.(\d+)/u.exec(version);
  if (match === null) {
    return false;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === 0 && minor < 26;
}

export function normalizeSettings(raw: RawAffineSettings): AffineSettings {
  return {
    serverUrl: normalizeServerUrl(raw.serverUrl.length === 0 ? DEFAULT_SERVER_URL : raw.serverUrl),
    defaultWorkspaceId: normalizeOptionalId(raw.defaultWorkspaceId),
    openMode: normalizeOpenMode(raw.openMode),
    clientVersion: normalizeClientVersion(raw.clientVersion),
  };
}
