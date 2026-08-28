import type { AffineClient } from '../client/affine-client';
import { CatalogCache } from '../sync/catalog-cache';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { loadSidebarCatalog, type CachedCatalogWorkspace } from './load-catalog';

describe('loadSidebarCatalog', () => {
  it('uses workspace names and page titles from the root document', async () => {
    const client = {
      listWorkspaces: () => Promise.resolve([{ id: 'abcdefghij' }]),
      listWorkspacePages: () =>
        Promise.resolve({
          name: 'MasteryHub',
          documents: [{ id: 'd1', workspaceId: 'abcdefghij', title: 'Roadmap', updatedAt: null }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] }],
          favorites: [],
          collections: [],
        }),
    } as unknown as AffineClient;

    await expect(loadSidebarCatalog(client)).resolves.toEqual([
      {
        id: 'abcdefghij',
        label: 'MasteryHub',
        documents: [{ id: 'd1', title: 'Roadmap', tags: [] }],
        tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] }],
        favorites: [],
        collections: [],
      },
    ]);
  });

  it('labels missing titles as Untitled', async () => {
    const client = {
      listWorkspaces: () => Promise.resolve([{ id: 'abcdefghij' }]),
      listWorkspacePages: () =>
        Promise.resolve({
          name: null,
          documents: [{ id: 'd1', workspaceId: 'abcdefghij', title: null, updatedAt: null }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Untitled', children: [] }],
          favorites: [],
          collections: [],
        }),
    } as unknown as AffineClient;

    await expect(loadSidebarCatalog(client)).resolves.toEqual([
      {
        id: 'abcdefghij',
        label: 'Workspace abcdefgh',
        documents: [{ id: 'd1', title: 'Untitled', tags: [] }],
        tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Untitled', children: [] }],
        favorites: [],
        collections: [],
      },
    ]);
  });

  it('skips the Yjs page fetch when the GraphQL fingerprint is unchanged', async () => {
    let pageFetches = 0;
    const docs = [{ id: 'd1', workspaceId: 'abcdefghij', title: 'Roadmap', updatedAt: '1' }];
    const workspace = {
      id: 'abcdefghij',
      label: 'MasteryHub',
      documents: [{ id: 'd1', title: 'Roadmap', tags: [] }],
      tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] }],
      favorites: [],
      collections: [],
    };
    const client = {
      listWorkspaces: () => Promise.resolve([{ id: 'abcdefghij' }]),
      listAllDocs: () => Promise.resolve(docs),
      listWorkspacePages: () => {
        pageFetches += 1;
        return Promise.resolve({
          name: 'MasteryHub',
          documents: docs,
          tree: workspace.tree,
          favorites: [],
          collections: [],
        });
      },
    } as unknown as AffineClient;
    const cache = new CatalogCache<CachedCatalogWorkspace>(60_000);
    await loadSidebarCatalog(client, { cache, now: 1_000 });
    await loadSidebarCatalog(client, { cache, now: 2_000 });
    expect(pageFetches).toBe(1);
  });
});
