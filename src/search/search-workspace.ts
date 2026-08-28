import type { AffineClient } from '../client/affine-client';
import type { AffineSearchHit } from '../client/affine.types';
import { isAuthAffineError } from '../errors/affine-error';
import { documentsToSearchHits, filterDocumentsByTitle } from './title-search';

export async function searchWorkspace(client: AffineClient, workspaceId: string, keyword: string): Promise<readonly AffineSearchHit[]> {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const hits = await client.searchDocs(workspaceId, trimmed);
    if (hits.length > 0) {
      return hits;
    }
  } catch (error: unknown) {
    if (isAuthAffineError(error)) {
      throw error;
    }
  }

  const pages = await client.listWorkspacePages(workspaceId);
  return documentsToSearchHits(filterDocumentsByTitle(pages.documents, trimmed));
}
