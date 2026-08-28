import { AffineError, AffineErrorCode, isAuthAffineError, isNotSignedInError } from './affine-error';

describe('AffineError', () => {
  it('preserves message, code, and cause', () => {
    const cause = new Error('upstream');
    const error = new AffineError('Server URL is invalid', AffineErrorCode.INVALID_CONFIG, { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AffineError');
    expect(error.message).toBe('Server URL is invalid');
    expect(error.code).toBe(AffineErrorCode.INVALID_CONFIG);
    expect(error.cause).toBe(cause);
  });
});

describe('isNotSignedInError', () => {
  it('matches only NOT_SIGNED_IN', () => {
    expect(isNotSignedInError(new AffineError('Sign in to AFFiNE first', AffineErrorCode.NOT_SIGNED_IN))).toBe(true);
    expect(isNotSignedInError(new AffineError('boom', AffineErrorCode.HTTP_ERROR))).toBe(false);
    expect(isNotSignedInError(new Error('Sign in to AFFiNE first'))).toBe(false);
  });
});

describe('isAuthAffineError', () => {
  it('matches codes that search must not swallow', () => {
    expect(isAuthAffineError(new AffineError('required', AffineErrorCode.AUTHENTICATION_REQUIRED))).toBe(true);
    expect(isAuthAffineError(new AffineError('unauth', AffineErrorCode.UNAUTHENTICATED))).toBe(true);
    expect(isAuthAffineError(new AffineError('unsigned', AffineErrorCode.NOT_SIGNED_IN))).toBe(true);
    expect(isAuthAffineError(new AffineError('indexer', AffineErrorCode.GRAPHQL_ERROR))).toBe(false);
  });
});
