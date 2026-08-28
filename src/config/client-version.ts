export const MIN_WRITE_CLIENT_VERSION = '0.26.0';

export interface SemverParts {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseSemver(value: string): SemverParts | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(value.trim());
  if (match === null) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function isWriteCapableClientVersion(version: string, minimum: string = MIN_WRITE_CLIENT_VERSION): boolean {
  const current = parseSemver(version);
  const min = parseSemver(minimum);
  if (current === undefined || min === undefined) {
    return false;
  }
  if (current.major !== min.major) {
    return current.major > min.major;
  }
  if (current.minor !== min.minor) {
    return current.minor > min.minor;
  }
  return current.patch >= min.patch;
}

export function clientVersionGuardMessage(version: string): string | undefined {
  if (isWriteCapableClientVersion(version)) {
    return undefined;
  }
  return `affine.clientVersion is ${version}. Set it to ${MIN_WRITE_CLIENT_VERSION} or newer for create, rename, and restore.`;
}
