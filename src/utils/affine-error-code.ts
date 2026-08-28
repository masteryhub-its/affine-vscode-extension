import { AffineErrorCode } from './enums/affine-error-code.enum';

const AFFINE_ERROR_CODE_VALUES: ReadonlySet<string> = new Set(Object.values(AffineErrorCode));

export function parseAffineErrorCode(value: string | undefined): AffineErrorCode | undefined {
  if (value === undefined || !AFFINE_ERROR_CODE_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineErrorCode;
}
