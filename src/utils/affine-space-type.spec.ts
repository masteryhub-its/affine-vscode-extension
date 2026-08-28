import { isWorkspaceSpaceType } from './affine-space-type';
import { AffineSpaceType } from './enums/affine-space-type.enum';
import { PageTreeKind } from './enums/page-tree-kind.enum';

describe('isWorkspaceSpaceType', () => {
  it('accepts the workspace space type', () => {
    expect(isWorkspaceSpaceType(AffineSpaceType.WORKSPACE)).toBe(true);
  });

  it('rejects other path segments', () => {
    expect(isWorkspaceSpaceType(PageTreeKind.FOLDER)).toBe(false);
    expect(isWorkspaceSpaceType(undefined)).toBe(false);
  });
});
