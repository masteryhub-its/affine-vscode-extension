import type { AffineSearchHit } from '../client/affine.types';

export function rankSearchHits(hits: readonly AffineSearchHit[], keyword: string): readonly AffineSearchHit[] {
  const needle = keyword.trim().toLowerCase();
  if (needle.length === 0) {
    return hits;
  }
  return [...hits].sort((left, right) => rank(left, needle) - rank(right, needle));
}

function rank(hit: AffineSearchHit, needle: string): number {
  if (hit.title.toLowerCase().includes(needle)) {
    return 0;
  }
  if (hit.highlight.toLowerCase().includes(needle)) {
    return 1;
  }
  return 2;
}
