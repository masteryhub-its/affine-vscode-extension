import { clientVersionGuardMessage, isWriteCapableClientVersion, MIN_WRITE_CLIENT_VERSION } from './client-version';

describe('isWriteCapableClientVersion', () => {
  it('accepts the minimum write version and newer minors', () => {
    expect(isWriteCapableClientVersion(MIN_WRITE_CLIENT_VERSION)).toBe(true);
    expect(isWriteCapableClientVersion('0.27.0')).toBe(true);
  });

  it('rejects versions below the write floor', () => {
    expect(isWriteCapableClientVersion('0.25.0')).toBe(false);
    expect(isWriteCapableClientVersion('not-a-version')).toBe(false);
  });
});

describe('clientVersionGuardMessage', () => {
  it('returns a warning when the version cannot write', () => {
    expect(clientVersionGuardMessage('0.25.0')).toContain('0.26.0');
    expect(clientVersionGuardMessage('0.26.0')).toBeUndefined();
  });
});
