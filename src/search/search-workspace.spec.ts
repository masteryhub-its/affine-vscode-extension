import type { AffineClient } from '../client/affine-client';
import type { AffineDocument, AffineSearchHit } from '../client/affine.types';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { searchWorkspace } from './search-workspace';

function createClient(overrides: Partial<AffineClient>): AffineClient {
  return overrides as AffineClient;
}

describe('searchWorkspace', () => {
  it('returns indexer hits when searchDocs finds results', async () => {
    const hits: readonly AffineSearchHit[] = [{ workspaceId: 'ws', docId: 'd1', title: 'API', highlight: 'API' }];
    const client = createClient({
      searchDocs: () => Promise.resolve(hits),
    });

    await expect(searchWorkspace(client, 'ws', 'api')).resolves.toEqual(hits);
  });

  it('falls back to title filter when searchDocs is empty', async () => {
    const documents: readonly AffineDocument[] = [
      { id: 'd1', workspaceId: 'ws', title: 'API Handbook', updatedAt: null },
      { id: 'd2', workspaceId: 'ws', title: 'Other', updatedAt: null },
    ];
    const client = createClient({
      searchDocs: () => Promise.resolve([]),
      listWorkspacePages: () => Promise.resolve({ name: null, documents, tree: [], favorites: [], collections: [] }),
    });

    const results = await searchWorkspace(client, 'ws', 'hand');
    expect(results.map((hit) => hit.docId)).toEqual(['d1']);
  });

  it('falls back to title filter when the indexer errors', async () => {
    const documents: readonly AffineDocument[] = [{ id: 'd1', workspaceId: 'ws', title: 'Runbook', updatedAt: null }];
    const client = createClient({
      searchDocs: () => Promise.reject(new AffineError('indexer down', AffineErrorCode.GRAPHQL_ERROR)),
      listWorkspacePages: () => Promise.resolve({ name: null, documents, tree: [], favorites: [], collections: [] }),
    });

    const results = await searchWorkspace(client, 'ws', 'run');
    expect(results.map((hit) => hit.docId)).toEqual(['d1']);
  });

  it('does not swallow authentication failures', async () => {
    const client = createClient({
      searchDocs: () => Promise.reject(new AffineError('Authentication required', AffineErrorCode.AUTHENTICATION_REQUIRED)),
    });

    await expect(searchWorkspace(client, 'ws', 'x')).rejects.toMatchObject({ code: AffineErrorCode.AUTHENTICATION_REQUIRED });
  });
});
