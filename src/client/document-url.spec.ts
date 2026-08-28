import { AffineError } from '../errors/affine-error';
import { buildDocumentUrl, buildWorkspaceBlobUrl, buildWorkspaceRootDocUrl, documentTitle, foldersTableDocId, resolveAssetUrl, resolvePreviewHref, workspaceLabel } from './document-url';

describe('buildDocumentUrl', () => {
  it('builds the AFFiNE workspace document path', () => {
    expect(buildDocumentUrl('https://affine.masteryhub-its.com', 'ws-1', 'doc-2')).toBe('https://affine.masteryhub-its.com/workspace/ws-1/doc-2');
  });

  it('encodes ids', () => {
    expect(buildDocumentUrl('https://affine.example', 'ws a', 'doc/b')).toBe('https://affine.example/workspace/ws%20a/doc%2Fb');
  });

  it('rejects blank ids', () => {
    expect(() => buildDocumentUrl('https://affine.example', ' ', 'doc')).toThrow(AffineError);
  });

  it('builds the folders table snapshot url id', () => {
    expect(foldersTableDocId('ws-1')).toBe('db$ws-1$folders');
  });

  it('builds the workspace root snapshot url', () => {
    expect(buildWorkspaceRootDocUrl('https://affine.example', 'ws-1')).toBe('https://affine.example/api/workspaces/ws-1/docs/ws-1');
  });

  it('builds a same-origin blob url', () => {
    expect(buildWorkspaceBlobUrl('https://affine.example', 'ws-1', 'blob-2')).toBe('https://affine.example/api/workspaces/ws-1/blobs/blob-2');
  });
});

describe('workspaceLabel', () => {
  it('uses the workspace name when present', () => {
    expect(workspaceLabel('abcdefghijklmnop', 'MasteryHub')).toBe('MasteryHub');
  });

  it('uses the first eight characters of the id', () => {
    expect(workspaceLabel('abcdefghijklmnop')).toBe('Workspace abcdefgh');
  });

  it('handles a short id', () => {
    expect(workspaceLabel('ab')).toBe('Workspace ab');
  });
});

describe('documentTitle', () => {
  it('returns Untitled when the title is missing', () => {
    expect(documentTitle(null)).toBe('Untitled');
    expect(documentTitle('   ')).toBe('Untitled');
  });

  it('trims a real title', () => {
    expect(documentTitle('  Spec  ')).toBe('Spec');
  });
});

describe('resolveAssetUrl', () => {
  it('prefixes a relative avatar path with the server origin', () => {
    expect(resolveAssetUrl('https://affine.example', '/api/avatars/u1')).toBe('https://affine.example/api/avatars/u1');
  });

  it('keeps a same-origin absolute url', () => {
    expect(resolveAssetUrl('https://affine.example', 'https://affine.example/api/avatars/u1')).toBe('https://affine.example/api/avatars/u1');
  });

  it('drops an off-origin absolute url', () => {
    expect(resolveAssetUrl('https://affine.example', 'http://cdn.example/a.png')).toBeUndefined();
    expect(resolveAssetUrl('https://affine.example', 'https://cdn.example/a.png')).toBeUndefined();
  });

  it('keeps a data url', () => {
    expect(resolveAssetUrl('https://affine.example', 'data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('returns undefined for a blank value', () => {
    expect(resolveAssetUrl('https://affine.example', null)).toBeUndefined();
    expect(resolveAssetUrl('https://affine.example', '  ')).toBeUndefined();
  });
});

describe('resolvePreviewHref', () => {
  it('keeps http links and prefixes server-relative paths', () => {
    expect(resolvePreviewHref('https://affine.example', 'https://example.com/spec')).toBe('https://example.com/spec');
    expect(resolvePreviewHref('https://affine.example', 'http://example.com/spec')).toBe('http://example.com/spec');
    expect(resolvePreviewHref('https://affine.example', '/workspace/ws/doc')).toBe('https://affine.example/workspace/ws/doc');
  });

  it('turns a protocol-relative href into https', () => {
    expect(resolvePreviewHref('https://affine.example', '//cdn.example/a.png')).toBe('https://cdn.example/a.png');
  });

  it('rejects javascript urls', () => {
    expect(resolvePreviewHref('https://affine.example', 'javascript:alert(1)')).toBeUndefined();
  });
});
