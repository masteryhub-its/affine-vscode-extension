import { parseAffineTreeKind } from './affine-tree-kind';
import { AffineTreeKind } from './enums/affine-tree-kind.enum';
import { PageTreeKind } from './enums/page-tree-kind.enum';

describe('parseAffineTreeKind', () => {
  it('accepts explorer node kinds', () => {
    expect(parseAffineTreeKind(AffineTreeKind.WORKSPACE)).toBe(AffineTreeKind.WORKSPACE);
    expect(parseAffineTreeKind(AffineTreeKind.FOLDER)).toBe(AffineTreeKind.FOLDER);
    expect(parseAffineTreeKind(AffineTreeKind.DOCUMENT)).toBe(AffineTreeKind.DOCUMENT);
    expect(parseAffineTreeKind(AffineTreeKind.ACTION)).toBe(AffineTreeKind.ACTION);
  });

  it('rejects other values', () => {
    expect(parseAffineTreeKind(PageTreeKind.DOC)).toBeUndefined();
    expect(parseAffineTreeKind(undefined)).toBeUndefined();
  });
});
