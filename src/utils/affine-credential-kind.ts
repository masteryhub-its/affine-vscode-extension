import { AffineCredentialKind } from './enums/affine-credential-kind.enum';

const AFFINE_CREDENTIAL_KIND_VALUES: ReadonlySet<string> = new Set(Object.values(AffineCredentialKind));

export function parseAffineCredentialKind(value: unknown): AffineCredentialKind | undefined {
  if (typeof value !== 'string' || !AFFINE_CREDENTIAL_KIND_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineCredentialKind;
}
