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

function findCode(error: unknown, depth: number): string | undefined {
  const record = asRecord(error);
  if (record === undefined || depth > 4) {
    return undefined;
  }
  if (typeof record.code === 'string' && (REASONS.has(record.code) || BEFORE_CONNECT.has(record.code) || AMBIGUOUS.has(record.code))) {
    return record.code;
  }
  const nested = Array.isArray(record.errors) ? (record.errors as readonly unknown[]) : [];
  for (const candidate of [record.cause, ...nested]) {
    const code = findCode(candidate, depth + 1);
    if (code !== undefined) {
      return code;
    }
  }
  return undefined;
}

function findReason(error: unknown): string | undefined {
  const code = findCode(error, 0);
  return code === undefined ? undefined : REASONS.get(code);
}
/** Turns undici's bare "fetch failed" into a sentence that says what to check. */
export function describeNetworkFailure(error: unknown, url: string, settingName: string = 'affine.serverUrl'): string {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Keep the raw value when it is not a URL.
  }
  const reason = findReason(error) ?? 'a network error occurred';
  return `Cannot reach ${host}: ${reason}. Check your network or VPN and the ${settingName} setting.`;
}

export type NetworkFailureKind = 'before-connect' | 'ambiguous' | 'other';

const BEFORE_CONNECT = new Set(['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH']);
const AMBIGUOUS = new Set(['ECONNRESET', 'ETIMEDOUT']);

/**
 * Whether a failed request is worth repeating. A failure before the connection opened never reached the server, so
 * any request can be repeated safely. A reset or late timeout may have happened after the server acted, so only a
 * read should be repeated. Anything else (for example a certificate problem) will not get better by waiting.
 */
export function classifyNetworkFailure(error: unknown): NetworkFailureKind {
  const code = findCode(error, 0);
  if (code === undefined) {
    return 'other';
  }
  if (BEFORE_CONNECT.has(code)) {
    return 'before-connect';
  }
  return AMBIGUOUS.has(code) ? 'ambiguous' : 'other';
}
