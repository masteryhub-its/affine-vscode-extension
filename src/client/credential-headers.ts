import { CSRF_HEADER } from '../constants';
import type { AffineCredential } from './affine.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

export function credentialHeaders(credential: AffineCredential | undefined): Readonly<Record<string, string>> {
  if (credential === undefined) {
    return {};
  }

  if (credential.kind === AffineCredentialKind.ACCESS_TOKEN) {
    return { Authorization: `Bearer ${credential.token}` };
  }

  const headers: Record<string, string> = { Cookie: credential.cookieHeader };
  if (credential.csrfToken !== undefined && credential.csrfToken.length > 0) {
    headers[CSRF_HEADER] = credential.csrfToken;
  }
  return headers;
}
