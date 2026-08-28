import { CSRF_HEADER } from '../constants';
import { credentialHeaders } from './credential-headers';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

describe('credentialHeaders', () => {
  it('returns nothing without a credential', () => {
    expect(credentialHeaders(undefined)).toEqual({});
  });

  it('sends a bearer token', () => {
    expect(credentialHeaders({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'affine_sk_test' })).toEqual({
      Authorization: 'Bearer affine_sk_test',
    });
  });

  it('sends session cookies and CSRF when present', () => {
    expect(
      credentialHeaders({
        kind: AffineCredentialKind.SESSION,
        cookieHeader: 'affine_session=abc',
        csrfToken: 'csrf',
      })
    ).toEqual({
      Cookie: 'affine_session=abc',
      [CSRF_HEADER]: 'csrf',
    });
  });

  it('omits CSRF when missing', () => {
    expect(
      credentialHeaders({
        kind: AffineCredentialKind.SESSION,
        cookieHeader: 'affine_session=abc',
        csrfToken: undefined,
      })
    ).toEqual({
      Cookie: 'affine_session=abc',
    });
  });
});
