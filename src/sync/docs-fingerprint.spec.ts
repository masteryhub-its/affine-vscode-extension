import { docsFingerprint } from './docs-fingerprint';

describe('docsFingerprint', () => {
  it('is stable for the same ids and updatedAt values regardless of order', () => {
    const left = docsFingerprint([
      { id: 'b', workspaceId: 'ws', title: 'B', updatedAt: '2' },
      { id: 'a', workspaceId: 'ws', title: 'A', updatedAt: '1' },
    ]);
    const right = docsFingerprint([
      { id: 'a', workspaceId: 'ws', title: 'A', updatedAt: '1' },
      { id: 'b', workspaceId: 'ws', title: 'B', updatedAt: '2' },
    ]);
    expect(left).toBe(right);
  });

  it('changes when a document updatedAt changes', () => {
    const before = docsFingerprint([{ id: 'a', workspaceId: 'ws', title: 'A', updatedAt: '1' }]);
    const after = docsFingerprint([{ id: 'a', workspaceId: 'ws', title: 'A', updatedAt: '2' }]);
    expect(before).not.toBe(after);
  });
});
