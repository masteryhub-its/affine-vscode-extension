import { socketAuth, spaceAckError, spaceJoinPayload, spacePushDocUpdatePayload } from './socket-protocol';
import { AffineSpaceType } from '../utils/enums/affine-space-type.enum';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

describe('socketAuth', () => {
  it('sends an access token as the handshake token', () => {
    expect(socketAuth({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'affine_sk_live' })).toEqual({ token: 'affine_sk_live' });
  });

  it('sends the session cookie header as the handshake token', () => {
    expect(socketAuth({ kind: AffineCredentialKind.SESSION, cookieHeader: 'affine_session=abc', csrfToken: 'csrf' })).toEqual({ token: 'affine_session=abc' });
  });
});

describe('spaceJoinPayload', () => {
  it('joins the workspace space with the client version', () => {
    expect(spaceJoinPayload('ws-1', '0.25.0')).toEqual({
      spaceType: AffineSpaceType.WORKSPACE,
      spaceId: 'ws-1',
      clientVersion: '0.25.0',
    });
  });
});

describe('spacePushDocUpdatePayload', () => {
  it('base64-encodes the yjs update for both update fields', () => {
    const update = new Uint8Array([1, 2, 255]);
    expect(spacePushDocUpdatePayload({ workspaceId: 'ws-1', docId: 'doc-1', update })).toEqual({
      spaceType: AffineSpaceType.WORKSPACE,
      spaceId: 'ws-1',
      docId: 'doc-1',
      update: Buffer.from(update).toString('base64'),
      updates: Buffer.from(update).toString('base64'),
    });
  });
});

describe('spaceAckError', () => {
  it('returns undefined for a successful ack', () => {
    expect(spaceAckError({ data: { success: true } })).toBeUndefined();
    expect(spaceAckError({ data: { accepted: true } })).toBeUndefined();
  });

  it('returns the server message when error.message is set', () => {
    expect(spaceAckError({ error: { name: 'DocNotFound', message: 'doc not found' } })).toBe('doc not found');
  });

  it('returns a fallback when the server rejects the request', () => {
    expect(spaceAckError({ data: { success: false } })).toBe('AFFiNE rejected the sync session. Set affine.clientVersion to 0.26.0 or newer to match your server.');
    expect(spaceAckError({ data: { accepted: false } })).toBe('AFFiNE sync request failed');
  });
});
