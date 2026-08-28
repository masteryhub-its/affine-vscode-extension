import { isAffineError } from './affine-error';

const REDACTED_BEARER = 'Bearer [redacted]';
const REDACTED_SESSION = 'affine_session=[redacted]';
const REDACTED_CSRF = 'affine_csrf_token=[redacted]';

function redactSensitiveText(message: string): string {
  return message
    .replace(/\bBearer\s+\S+/giu, REDACTED_BEARER)
    .replace(/\baffine_sk_[A-Za-z0-9_-]+/giu, '[redacted-token]')
    .replace(/\baffine_session=[^;\s]+/giu, REDACTED_SESSION)
    .replace(/\baffine_csrf_token=[^;\s]+/giu, REDACTED_CSRF)
    .replace(/\bpassword=[^&\s]+/giu, 'password=[redacted]')
    .replace(/("password"\s*:\s*")[^"]+/giu, '$1[redacted]');
}

export function formatAffineError(error: unknown): string {
  if (isAffineError(error)) {
    return redactSensitiveText(error.message);
  }
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  return 'Unexpected AFFiNE error';
}
