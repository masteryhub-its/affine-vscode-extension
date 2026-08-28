import type { AffineDocument } from '../client/affine.types';

export function docsFingerprint(documents: readonly AffineDocument[]): string {
  return [...documents]
    .map((document) => `${document.id}:${document.updatedAt ?? ''}`)
    .sort()
    .join('|');
}
