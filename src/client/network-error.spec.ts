import { classifyNetworkFailure, describeNetworkFailure } from './network-error';

function fetchFailed(code: string): TypeError {
  return Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('boom'), { code }) });
}

describe('describeNetworkFailure', () => {
  it.each([
    ['UND_ERR_CONNECT_TIMEOUT', 'the connection timed out'],
    ['ENOTFOUND', 'the host name could not be resolved'],
    ['ECONNREFUSED', 'the connection was refused'],
    ['ECONNRESET', 'the connection was reset'],
    ['EHOSTUNREACH', 'the host is unreachable'],
    ['CERT_HAS_EXPIRED', 'the TLS certificate was rejected'],
  ])('explains %s', (code, reason) => {
    expect(describeNetworkFailure(fetchFailed(code), 'https://server.example/graphql')).toContain(reason);
  });

  it('names the host, not the full URL with its path or query', () => {
    const message = describeNetworkFailure(fetchFailed('ECONNREFUSED'), 'https://server.example/api/v1/users/me/?token=secret');
    expect(message).toContain('server.example');
    expect(message).not.toContain('token=secret');
    expect(message).not.toContain('/api/v1');
  });

  it('finds the reason inside an AggregateError from a dual-stack connect', () => {
    const aggregate = Object.assign(new AggregateError([Object.assign(new Error('a'), { code: 'ETIMEDOUT' })], 'x'), {});
    const error = Object.assign(new TypeError('fetch failed'), { cause: aggregate });
    expect(describeNetworkFailure(error, 'https://server.example')).toContain('timed out');
  });

  it('falls back to a generic reason and never throws on odd input', () => {
    expect(describeNetworkFailure(new Error('x'), 'https://server.example')).toContain('a network error occurred');
    expect(describeNetworkFailure(undefined, 'not a url')).toContain('not a url');
    expect(describeNetworkFailure('text', 'https://server.example')).toContain('Cannot reach');
  });

  it('tells the user which setting to check', () => {
    expect(describeNetworkFailure(fetchFailed('ENOTFOUND'), 'https://server.example', 'my.setting')).toContain('my.setting');
  });
});

describe('classifyNetworkFailure', () => {
  it.each(['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH'])('treats %s as a failure before anything was sent', (code) => {
    expect(classifyNetworkFailure(fetchFailed(code))).toBe('before-connect');
  });

  it.each(['ECONNRESET', 'ETIMEDOUT'])('treats %s as possibly after the request was sent', (code) => {
    expect(classifyNetworkFailure(fetchFailed(code))).toBe('ambiguous');
  });

  it.each(['CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SOMETHING_ELSE'])('does not treat %s as worth retrying', (code) => {
    expect(classifyNetworkFailure(fetchFailed(code))).toBe('other');
  });

  it('finds the code inside an AggregateError and ignores non-errors', () => {
    const aggregate = new AggregateError([Object.assign(new Error('a'), { code: 'UND_ERR_CONNECT_TIMEOUT' })], 'x');
    expect(classifyNetworkFailure(Object.assign(new TypeError('fetch failed'), { cause: aggregate }))).toBe('before-connect');
    expect(classifyNetworkFailure(undefined)).toBe('other');
    expect(classifyNetworkFailure('text')).toBe('other');
  });
});
