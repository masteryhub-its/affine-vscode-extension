import { hoverTitleForAffinePage } from './hover-title';

describe('hoverTitleForAffinePage', () => {
  it('returns the catalog title for a matching workspace and doc id', () => {
    expect(
      hoverTitleForAffinePage(
        [
          { workspaceId: 'ws-1', docId: 'doc-1', title: 'API Handbook' },
          { workspaceId: 'ws-1', docId: 'doc-2', title: 'Roadmap' },
        ],
        { workspaceId: 'ws-1', docId: 'doc-2' }
      )
    ).toBe('Roadmap');
  });

  it('returns undefined when the page is not in the catalog', () => {
    expect(hoverTitleForAffinePage([{ workspaceId: 'ws-1', docId: 'doc-1', title: 'API Handbook' }], { workspaceId: 'ws-1', docId: 'missing' })).toBeUndefined();
  });
});
