import { parseAffineCredentialKind } from './affine-credential-kind';
import { AffineCredentialKind } from './enums/affine-credential-kind.enum';

describe('parseAffineCredentialKind', () => {
  it('accepts access token and session kinds', () => {
    expect(parseAffineCredentialKind(AffineCredentialKind.ACCESS_TOKEN)).toBe(AffineCredentialKind.ACCESS_TOKEN);
    expect(parseAffineCredentialKind(AffineCredentialKind.SESSION)).toBe(AffineCredentialKind.SESSION);
  });

  it('rejects unknown kinds', () => {
    expect(parseAffineCredentialKind('oauth')).toBeUndefined();
  });
});
