interface ErrorWithCode {
  readonly code?: unknown;
  readonly cause?: unknown;
  readonly errors?: unknown;
}

const REASONS: ReadonlyMap<string, string> = new Map([
  ['UND_ERR_CONNECT_TIMEOUT', 'the connection timed out'],
  ['ETIMEDOUT', 'the connection timed out'],
  ['ENOTFOUND', 'the host name could not be resolved'],
  ['EAI_AGAIN', 'the host name could not be resolved'],
  ['ECONNREFUSED', 'the connection was refused'],
  ['ECONNRESET', 'the connection was reset'],
  ['EHOSTUNREACH', 'the host is unreachable'],
  ['ENETUNREACH', 'the network is unreachable'],
  ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'the TLS certificate was rejected'],
  ['SELF_SIGNED_CERT_IN_CHAIN', 'the TLS certificate was rejected'],
  ['DEPTH_ZERO_SELF_SIGNED_CERT', 'the TLS certificate was rejected'],
  ['CERT_HAS_EXPIRED', 'the TLS certificate was rejected'],
  ['ERR_TLS_CERT_ALTNAME_INVALID', 'the TLS certificate was rejected'],
]);

function asRecord(value: unknown): ErrorWithCode | undefined {
  return typeof value === 'object' && value !== null ? value : undefined;
}

function findReason(error: unknown, depth: number): string | undefined {
  const record = asRecord(error);
  if (record === undefined || depth > 4) {
    return undefined;
  }
  if (typeof record.code === 'string') {
    const reason = REASONS.get(record.code);
    if (reason !== undefined) {
      return reason;
    }
  }
  const nested = Array.isArray(record.errors) ? (record.errors as readonly unknown[]) : [];
  for (const candidate of [record.cause, ...nested]) {
    const reason = findReason(candidate, depth + 1);
    if (reason !== undefined) {
      return reason;
    }
  }
  return undefined;
}

/** Turns undici's bare "fetch failed" into a sentence that says what to check. */
export function describeNetworkFailure(error: unknown, url: string, settingName: string = 'affine.serverUrl'): string {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Keep the raw value when it is not a URL.
  }
  const reason = findReason(error, 0) ?? 'a network error occurred';
  return `Cannot reach ${host}: ${reason}. Check your network or VPN and the ${settingName} setting.`;
}
