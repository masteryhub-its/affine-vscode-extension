import { AffineError, AffineErrorCode } from './affine-error';
import { formatAffineError } from './format-error';

describe('formatAffineError', () => {
  it('uses AffineError.message', () => {
    expect(formatAffineError(new AffineError('boom', AffineErrorCode.HTTP_ERROR))).toBe('boom');
  });

  it('uses Error.message', () => {
    expect(formatAffineError(new Error('network'))).toBe('network');
  });

  it('falls back for unknown values', () => {
    expect(formatAffineError(42)).toBe('Unexpected AFFiNE error');
  });

  it('redacts access tokens and session cookies from messages', () => {
    expect(formatAffineError(new AffineError('Bearer affine_sk_live_abc failed', AffineErrorCode.UNAUTHENTICATED))).toBe('Bearer [redacted] failed');
    expect(formatAffineError(new Error('token affine_sk_live_abc expired'))).toBe('token [redacted-token] expired');
    expect(formatAffineError(new Error('cookie affine_session=abc; affine_csrf_token=xyz'))).toBe('cookie affine_session=[redacted]; affine_csrf_token=[redacted]');
    expect(formatAffineError(new Error('sign-in failed password=supersecret'))).toBe('sign-in failed password=[redacted]');
    expect(formatAffineError(new Error('{"password":"supersecret"}'))).toBe('{"password":"[redacted]"}');
    expect(formatAffineError(new AffineError('Email and password are required', AffineErrorCode.AUTHENTICATION_FAILED))).toBe('Email and password are required');
  });
});
