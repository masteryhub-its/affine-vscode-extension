import { AffineSpaceType } from './enums/affine-space-type.enum';

const AFFINE_SPACE_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(AffineSpaceType));

export function isWorkspaceSpaceType(value: string | undefined): boolean {
  return value !== undefined && AFFINE_SPACE_TYPE_VALUES.has(value);
}
