import { detectAffinePageUrls } from './detect-links';

describe('detectAffinePageUrls', () => {
  const server = 'https://affine.masteryhub-its.com';

  it('detects workspace page URLs for the configured server', () => {
    const text = `See ${server}/workspace/ws-1/doc-42 and also ${server}/workspace/ws-1/doc-42/`;
    expect(detectAffinePageUrls(text, server)).toEqual([
      { serverUrl: server, workspaceId: 'ws-1', docId: 'doc-42' },
      { serverUrl: server, workspaceId: 'ws-1', docId: 'doc-42' },
    ]);
  });

  it('ignores URLs for a different origin', () => {
    expect(detectAffinePageUrls('https://app.affine.pro/workspace/ws/doc', server)).toEqual([]);
  });

  it('decodes encoded ids in the path', () => {
    expect(detectAffinePageUrls(`${server}/workspace/ws%20a/doc%2Fb`, server)).toEqual([{ serverUrl: server, workspaceId: 'ws a', docId: 'doc/b' }]);
  });
});
