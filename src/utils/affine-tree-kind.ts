import { AffineTreeKind } from './enums/affine-tree-kind.enum';

const AFFINE_TREE_KIND_VALUES: ReadonlySet<string> = new Set(Object.values(AffineTreeKind));

export function parseAffineTreeKind(value: unknown): AffineTreeKind | undefined {
  if (typeof value !== 'string' || !AFFINE_TREE_KIND_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineTreeKind;
}
