import type { AffineClient } from '../client/affine-client';
import type { AffineSearchHit, AffineWorkspace } from '../client/affine.types';
import { searchWorkspace } from './search-workspace';
import { rankSearchHits } from './rank-hits';

export interface SearchAllWorkspacesInput {
  readonly client: AffineClient;
  readonly workspaces: readonly AffineWorkspace[];
  readonly keyword: string;
}

export async function searchAllWorkspaces(input: SearchAllWorkspacesInput): Promise<readonly AffineSearchHit[]> {
  const hits: AffineSearchHit[] = [];
  for (const workspace of input.workspaces) {
    hits.push(...(await searchWorkspace(input.client, workspace.id, input.keyword)));
  }
  return rankSearchHits(hits, input.keyword);
}
