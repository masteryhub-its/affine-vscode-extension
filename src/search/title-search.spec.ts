import type { AffineDocument } from '../client/affine.types';
import { documentsToSearchHits, filterDocumentsByTitle } from './title-search';

const docs: readonly AffineDocument[] = [
  { id: '1', workspaceId: 'ws', title: 'API Handbook', updatedAt: null },
  { id: '2', workspaceId: 'ws', title: 'Runbook', updatedAt: null },
  { id: '3', workspaceId: 'ws', title: null, updatedAt: null },
];

describe('filterDocumentsByTitle', () => {
  it('matches case-insensitively', () => {
    expect(filterDocumentsByTitle(docs, 'hand').map((doc) => doc.id)).toEqual(['1']);
  });

  it('returns all documents for a blank keyword', () => {
    expect(filterDocumentsByTitle(docs, '  ')).toHaveLength(3);
  });
});

describe('documentsToSearchHits', () => {
  it('uses Untitled for a missing title', () => {
    const untitled = docs[2];
    if (untitled === undefined) {
      throw new Error('fixture missing');
    }
    expect(documentsToSearchHits([untitled])[0]?.title).toBe('Untitled');
  });
});
