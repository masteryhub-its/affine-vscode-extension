import { parseAffineErrorCode } from './affine-error-code';
import { AffineErrorCode } from './enums/affine-error-code.enum';
import { GraphqlExtensionCode } from './enums/graphql-extension-code.enum';

describe('parseAffineErrorCode', () => {
  it('accepts NOT_SIGNED_IN and other closed codes', () => {
    expect(parseAffineErrorCode(AffineErrorCode.NOT_SIGNED_IN)).toBe(AffineErrorCode.NOT_SIGNED_IN);
    expect(parseAffineErrorCode(AffineErrorCode.AUTHENTICATION_REQUIRED)).toBe(AffineErrorCode.AUTHENTICATION_REQUIRED);
  });

  it('rejects GraphQL-only extension codes', () => {
    expect(parseAffineErrorCode(GraphqlExtensionCode.WRONG_SIGN_IN_CREDENTIALS)).toBeUndefined();
    expect(parseAffineErrorCode(undefined)).toBeUndefined();
  });
});
