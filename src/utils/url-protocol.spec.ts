import { cspImgSrc, isAbsoluteHttpHref, isAllowedUrlProtocol } from './url-protocol';
import { UrlProtocol } from './enums/url-protocol.enum';

describe('isAllowedUrlProtocol', () => {
  it('allows http and https URL.protocol values', () => {
    expect(isAllowedUrlProtocol(UrlProtocol.HTTP)).toBe(true);
    expect(isAllowedUrlProtocol(UrlProtocol.HTTPS)).toBe(true);
  });

  it('rejects other schemes', () => {
    expect(isAllowedUrlProtocol('ftp:')).toBe(false);
    expect(isAllowedUrlProtocol('javascript:')).toBe(false);
  });
});

describe('isAbsoluteHttpHref', () => {
  it('accepts http and https URLs', () => {
    expect(isAbsoluteHttpHref('http://localhost:3010')).toBe(true);
    expect(isAbsoluteHttpHref('HTTPS://Example.COM/x')).toBe(true);
  });

  it('rejects non-http hrefs', () => {
    expect(isAbsoluteHttpHref('/workspace/ws/doc')).toBe(false);
    expect(isAbsoluteHttpHref('javascript:alert(1)')).toBe(false);
  });
});

describe('cspImgSrc', () => {
  it('allows only the configured server origin for Content-Security-Policy img-src', () => {
    expect(cspImgSrc('https://affine.example/path')).toBe('https://affine.example');
  });
});
