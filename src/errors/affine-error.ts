import { AffineErrorCode } from '../utils/enums/affine-error-code.enum';

export { AffineErrorCode };

export interface AffineErrorOptions {
  readonly cause?: unknown;
}

export class AffineError extends Error {
  public readonly code: AffineErrorCode;

  public constructor(message: string, code: AffineErrorCode, options?: AffineErrorOptions) {
    super(message, options);
    this.name = 'AffineError';
    this.code = code;
  }
}

export function isAffineError(error: unknown): error is AffineError {
  return error instanceof AffineError;
}

const AUTH_ERROR_CODES: ReadonlySet<AffineErrorCode> = new Set([AffineErrorCode.AUTHENTICATION_REQUIRED, AffineErrorCode.UNAUTHENTICATED, AffineErrorCode.NOT_SIGNED_IN]);

export function isNotSignedInError(error: unknown): boolean {
  return isAffineError(error) && error.code === AffineErrorCode.NOT_SIGNED_IN;
}

export function isAuthAffineError(error: unknown): boolean {
  return isAffineError(error) && AUTH_ERROR_CODES.has(error.code);
}
