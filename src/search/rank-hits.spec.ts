import { rankSearchHits } from './rank-hits';
import type { AffineSearchHit } from '../client/affine.types';

function hit(title: string, highlight: string): AffineSearchHit {
  return { workspaceId: 'ws', docId: title, title, highlight };
}

describe('rankSearchHits', () => {
  it('prefers title matches over full-text highlights', () => {
    const ranked = rankSearchHits([hit('Other', 'standup notes'), hit('Standup', 'weekly')], 'standup');
    expect(ranked.map((item) => item.title)).toEqual(['Standup', 'Other']);
  });
});
