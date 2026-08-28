import type { AffineDocument, AffineSearchHit } from '../client/affine.types';
import { documentTitle } from '../client/document-url';

export function filterDocumentsByTitle(documents: readonly AffineDocument[], keyword: string): readonly AffineDocument[] {
  const needle = keyword.trim().toLowerCase();
  if (needle.length === 0) {
    return documents;
  }
  return documents.filter((document) => documentTitle(document.title).toLowerCase().includes(needle));
}

export function documentsToSearchHits(documents: readonly AffineDocument[]): readonly AffineSearchHit[] {
  return documents.map((document) => ({
    workspaceId: document.workspaceId,
    docId: document.id,
    title: documentTitle(document.title),
    highlight: documentTitle(document.title),
  }));
}
