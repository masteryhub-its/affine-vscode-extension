import type { AffineCredential, BoundAffineCredential } from '../client/affine.types';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { parseAffineCredentialKind } from '../utils/affine-credential-kind';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCredential(value: unknown): AffineCredential {
  if (!isRecord(value)) {
    throw new AffineError('Stored credential is malformed', AffineErrorCode.UNEXPECTED_RESPONSE);
  }

  const kind = parseAffineCredentialKind(value['kind']);
  if (kind === AffineCredentialKind.ACCESS_TOKEN) {
    const token = value['token'];
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new AffineError('Stored access token is empty', AffineErrorCode.UNEXPECTED_RESPONSE);
    }
    return { kind: AffineCredentialKind.ACCESS_TOKEN, token };
  }

  if (kind === AffineCredentialKind.SESSION) {
    const cookieHeader = value['cookieHeader'];
    if (typeof cookieHeader !== 'string' || cookieHeader.trim().length === 0) {
      throw new AffineError('Stored session cookie is empty', AffineErrorCode.UNEXPECTED_RESPONSE);
    }
    const csrfRaw = value['csrfToken'];
    const csrfToken = typeof csrfRaw === 'string' && csrfRaw.length > 0 ? csrfRaw : undefined;
    return { kind: AffineCredentialKind.SESSION, cookieHeader, csrfToken };
  }

  throw new AffineError('Stored credential kind is unsupported', AffineErrorCode.UNEXPECTED_RESPONSE);
}

export function serializeBoundCredential(bound: BoundAffineCredential): string {
  return JSON.stringify(bound);
}

export function deserializeBoundCredential(raw: string): BoundAffineCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause: unknown) {
    throw new AffineError('Stored credential is not valid JSON', AffineErrorCode.UNEXPECTED_RESPONSE, { cause });
  }

  if (!isRecord(parsed)) {
    throw new AffineError('Stored credential is malformed', AffineErrorCode.UNEXPECTED_RESPONSE);
  }

  const serverUrl = parsed['serverUrl'];
  if (typeof serverUrl !== 'string' || serverUrl.trim().length === 0) {
    throw new AffineError('Stored credential is not bound to a server URL', AffineErrorCode.UNEXPECTED_RESPONSE);
  }

  const credentialRaw = parsed['credential'];
  if (credentialRaw === undefined) {
    throw new AffineError('Stored credential is not bound to a server URL', AffineErrorCode.UNEXPECTED_RESPONSE);
  }

  return {
    serverUrl: serverUrl.trim(),
    credential: parseCredential(credentialRaw),
  };
}
