import type { AffineCredential, BoundAffineCredential } from '../client/affine.types';
import { AffineError } from '../errors/affine-error';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { deserializeBoundCredential, serializeBoundCredential } from './credential-codec';

describe('credential codec', () => {
  it('round-trips an access token bound to a server url', () => {
    const bound: BoundAffineCredential = {
      serverUrl: 'https://affine.example',
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'affine_sk_test' },
    };
    expect(deserializeBoundCredential(serializeBoundCredential(bound))).toEqual(bound);
  });

  it('round-trips a session cookie bound to a server url', () => {
    const bound: BoundAffineCredential = {
      serverUrl: 'https://affine.example',
      credential: { kind: AffineCredentialKind.SESSION, cookieHeader: 'affine_session=abc', csrfToken: 'csrf' },
    };
    expect(deserializeBoundCredential(serializeBoundCredential(bound))).toEqual(bound);
  });

  it('rejects a legacy credential without a server url', () => {
    const credential: AffineCredential = { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'affine_sk_test' };
    expect(() => deserializeBoundCredential(JSON.stringify(credential))).toThrow('Stored credential is not bound to a server URL');
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeBoundCredential('{')).toThrow(AffineError);
  });

  it('rejects an unknown kind', () => {
    expect(() => deserializeBoundCredential('{"serverUrl":"https://affine.example","credential":{"kind":"oauth"}}')).toThrow('Stored credential kind is unsupported');
  });

  it('rejects an empty token', () => {
    expect(() => deserializeBoundCredential('{"serverUrl":"https://affine.example","credential":{"kind":"accessToken","token":" "}}')).toThrow('Stored access token is empty');
  });
});
