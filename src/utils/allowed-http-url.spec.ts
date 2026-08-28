import { isAllowedHttpUrl } from './allowed-http-url';

describe('isAllowedHttpUrl', () => {
  it('accepts http and https urls', () => {
    expect(isAllowedHttpUrl('https://affine.example/workspace/a/b')).toBe(true);
    expect(isAllowedHttpUrl('http://localhost:3010/')).toBe(true);
  });

  it('rejects javascript and other schemes', () => {
    expect(isAllowedHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedHttpUrl('not a url')).toBe(false);
  });
});
