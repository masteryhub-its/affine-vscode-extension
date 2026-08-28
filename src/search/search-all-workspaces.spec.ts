import type { AffineClient } from '../client/affine-client';
import type { AffineSearchHit } from '../client/affine.types';
import { searchAllWorkspaces } from './search-all-workspaces';

function createClient(overrides: Partial<AffineClient>): AffineClient {
  return overrides as AffineClient;
}

describe('searchAllWorkspaces', () => {
  it('concatenates hits from each workspace', async () => {
    const client = createClient({
      searchDocs: (workspaceId: string): Promise<readonly AffineSearchHit[]> => Promise.resolve([{ workspaceId, docId: `${workspaceId}-1`, title: 'API', highlight: 'API' }]),
    });

    const hits = await searchAllWorkspaces({
      client,
      workspaces: [{ id: 'ws-a' }, { id: 'ws-b' }],
      keyword: 'api',
    });

    expect(hits.map((hit) => hit.docId)).toEqual(['ws-a-1', 'ws-b-1']);
  });
});
