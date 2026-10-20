import type { HttpResponse } from './http.types';
import { MAX_AVATAR_BYTES, toAvatarDataUri } from './avatar-data-uri';

function response(overrides: Partial<{ status: number; type: string | undefined; bytes: Uint8Array | undefined }> = {}): HttpResponse {
  const type = 'type' in overrides ? overrides.type : 'image/png';
  const bytes = 'bytes' in overrides ? overrides.bytes : new Uint8Array([1, 2, 3]);
  return { status: overrides.status ?? 200, headers: new Map(type === undefined ? [] : [['content-type', type]]), setCookie: [], body: '', ...(bytes === undefined ? {} : { bodyBytes: bytes }) };
}

describe('toAvatarDataUri', () => {
  it('turns an image answer into a data address the page can show without asking the server', () => {
    expect(toAvatarDataUri(response())).toBe('data:image/png;base64,AQID');
  });

  it.each(['image/jpeg', 'image/webp', 'image/gif', 'image/png; charset=binary', 'IMAGE/PNG'])('accepts %s', (type) => {
    expect(toAvatarDataUri(response({ type }))).toMatch(/^data:image\/(?:jpeg|webp|gif|png);base64,/u);
  });

  it.each([
    ['an error status', response({ status: 404 })],
    ['a missing body', response({ bytes: undefined })],
    ['an empty body', response({ bytes: new Uint8Array() })],
    ['a body that is too large', response({ bytes: new Uint8Array(MAX_AVATAR_BYTES + 1) })],
    ['an SVG, which can carry script', response({ type: 'image/svg+xml' })],
    ['an HTML page', response({ type: 'text/html' })],
    ['no content type', response({ type: undefined })],
  ])('refuses %s', (_name, value) => {
    expect(toAvatarDataUri(value)).toBeUndefined();
  });
});
