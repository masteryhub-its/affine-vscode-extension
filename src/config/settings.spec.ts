import { AffineError } from '../errors/affine-error';
import { normalizeClientVersion, normalizeOpenMode, normalizeOptionalId, normalizeServerUrl, normalizeSettings, preferredServerUrlRaw } from './settings';
import { OpenMode } from '../utils/enums/open-mode.enum';

describe('normalizeServerUrl', () => {
  it('strips whitespace and a trailing slash', () => {
    expect(normalizeServerUrl(' https://affine.masteryhub-its.com/ ')).toBe('https://affine.masteryhub-its.com');
  });

  it('keeps a non-root path without a trailing slash', () => {
    expect(normalizeServerUrl('https://example.com/affine/')).toBe('https://example.com/affine');
  });

  it('rejects an empty value', () => {
    expect(() => normalizeServerUrl('   ')).toThrow(AffineError);
    expect(() => normalizeServerUrl('   ')).toThrow('Server URL is required');
  });

  it('accepts an http URL on loopback', () => {
    expect(normalizeServerUrl('http://localhost:3010/')).toBe('http://localhost:3010');
  });

  it('rejects remote http URLs', () => {
    expect(() => normalizeServerUrl('http://affine.example')).toThrow('Server URL must use https unless the host is localhost');
  });

  it('rejects a non-http protocol', () => {
    expect(() => normalizeServerUrl('ftp://affine.example')).toThrow('Server URL must use http or https');
  });

  it('rejects embedded credentials', () => {
    expect(() => normalizeServerUrl('https://user:pass@affine.example')).toThrow('Server URL must not include credentials');
  });

  it('rejects a malformed URL', () => {
    expect(() => normalizeServerUrl('not a url')).toThrow('Server URL is invalid');
  });
});

describe('preferredServerUrlRaw', () => {
  it('ignores workspace and folder overrides and prefers global', () => {
    expect(
      preferredServerUrlRaw({
        globalValue: 'https://affine.masteryhub-its.com',
        defaultValue: 'https://app.affine.pro',
        workspaceValue: 'https://attacker.example',
        workspaceFolderValue: 'https://also-attacker.example',
      })
    ).toBe('https://affine.masteryhub-its.com');
  });

  it('falls back to the package default when global is unset', () => {
    expect(
      preferredServerUrlRaw({
        globalValue: undefined,
        defaultValue: 'https://app.affine.pro',
        workspaceValue: 'https://attacker.example',
        workspaceFolderValue: undefined,
      })
    ).toBe('https://app.affine.pro');
  });
});

describe('normalizeOptionalId', () => {
  it('returns undefined for blank input', () => {
    expect(normalizeOptionalId('  ')).toBeUndefined();
  });

  it('trims a real id', () => {
    expect(normalizeOptionalId('  ws-1  ')).toBe('ws-1');
  });
});

describe('normalizeOpenMode', () => {
  it('accepts a known mode', () => {
    expect(normalizeOpenMode('external')).toBe(OpenMode.EXTERNAL);
  });

  it('does not open Simple Browser because it has no AFFiNE session cookies', () => {
    expect(normalizeOpenMode('simpleBrowser')).toBe(OpenMode.EXTERNAL);
  });

  it('falls back to external for unknown values', () => {
    expect(normalizeOpenMode('iframe')).toBe(OpenMode.EXTERNAL);
  });
});

describe('normalizeClientVersion', () => {
  it('keeps a provided version', () => {
    expect(normalizeClientVersion(' 0.26.0 ')).toBe('0.26.0');
  });

  it('falls back to the default when blank', () => {
    expect(normalizeClientVersion('')).toBe('0.26.0');
  });

  it('raises a stored 0.25.x value to the websocket minimum', () => {
    expect(normalizeClientVersion('0.25.0')).toBe('0.26.0');
  });
});

describe('normalizeSettings', () => {
  it('applies defaults for empty raw settings', () => {
    expect(
      normalizeSettings({
        serverUrl: '',
        defaultWorkspaceId: '',
        openMode: '',
        clientVersion: '',
      })
    ).toEqual({
      serverUrl: 'https://affine.masteryhub-its.com',
      defaultWorkspaceId: undefined,
      openMode: OpenMode.EXTERNAL,
      clientVersion: '0.26.0',
    });
  });
});
