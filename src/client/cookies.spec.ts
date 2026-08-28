import { affineSessionCookies, cookieHeaderFromRecords, findCookieValue, mergeCookies, parseSetCookieHeaders } from './cookies';

describe('parseSetCookieHeaders', () => {
  it('extracts name/value and ignores attributes', () => {
    const cookies = parseSetCookieHeaders(['affine_session=abc; Path=/; HttpOnly; Secure', 'affine_csrf_token=xyz; Path=/']);

    expect(cookies).toEqual([
      { name: 'affine_session', value: 'abc' },
      { name: 'affine_csrf_token', value: 'xyz' },
    ]);
  });

  it('skips malformed entries', () => {
    expect(parseSetCookieHeaders(['=novalue', 'nosep', ''])).toEqual([]);
  });
});

describe('cookieHeaderFromRecords', () => {
  it('joins cookies for a Cookie request header', () => {
    expect(
      cookieHeaderFromRecords([
        { name: 'affine_session', value: 'abc' },
        { name: 'affine_csrf_token', value: 'xyz' },
      ])
    ).toBe('affine_session=abc; affine_csrf_token=xyz');
  });
});

describe('findCookieValue', () => {
  it('returns the matching cookie value', () => {
    expect(findCookieValue([{ name: 'affine_csrf_token', value: 'xyz' }], 'affine_csrf_token')).toBe('xyz');
  });
});

describe('mergeCookies', () => {
  it('overwrites cookies with the same name', () => {
    const merged = mergeCookies(
      [{ name: 'affine_session', value: 'old' }],
      [
        { name: 'affine_session', value: 'new' },
        { name: 'affine_user_id', value: 'u1' },
      ]
    );

    expect(merged).toEqual([
      { name: 'affine_session', value: 'new' },
      { name: 'affine_user_id', value: 'u1' },
    ]);
  });
});

describe('affineSessionCookies', () => {
  it('keeps only affine_session and affine_csrf_token', () => {
    expect(
      affineSessionCookies([
        { name: 'affine_session', value: 'abc' },
        { name: 'tracking', value: 'nope' },
        { name: 'affine_csrf_token', value: 'xyz' },
        { name: 'other', value: 'drop' },
      ])
    ).toEqual([
      { name: 'affine_session', value: 'abc' },
      { name: 'affine_csrf_token', value: 'xyz' },
    ]);
  });
});
