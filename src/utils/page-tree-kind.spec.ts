import { AffineTreeKind } from './enums/affine-tree-kind.enum';
import { PageTreeKind } from './enums/page-tree-kind.enum';
import { parsePageTreeKind } from './page-tree-kind';

describe('parsePageTreeKind', () => {
  it('accepts organize folder and doc kinds', () => {
    expect(parsePageTreeKind(PageTreeKind.FOLDER)).toBe(PageTreeKind.FOLDER);
    expect(parsePageTreeKind(PageTreeKind.DOC)).toBe(PageTreeKind.DOC);
  });

  it('rejects explorer document kind', () => {
    expect(parsePageTreeKind(AffineTreeKind.DOCUMENT)).toBeUndefined();
    expect(parsePageTreeKind(AffineTreeKind.WORKSPACE)).toBeUndefined();
  });
});
