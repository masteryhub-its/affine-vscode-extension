import { FETCH_TIMEOUT_MS } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { HttpMethod } from '../utils/enums/http-method.enum';
import { hedge } from './hedge';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';
import { classifyNetworkFailure, describeNetworkFailure } from './network-error';

function readSetCookie(headers: Headers): readonly string[] {
  if ('getSetCookie' in headers && typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single === null ? [] : [single];
}

interface FetchRequestInit {
  method: HttpMethod;
  headers: Readonly<Record<string, string>>;
  body?: string;
  redirect: 'manual';
  signal: AbortSignal;
}

function isTimeoutError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

const TIMEOUT_RESPONSE: HttpResponse = {
  status: 408,
  headers: new Map(),
  setCookie: [],
  body: '',
};

export interface FetchClientOptions {
  /** Pauses between attempts at a write; replaced in tests. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** How long a read waits for an answer before a second attempt starts beside it; shortened in tests. */
  readonly hedgeDelayMs?: number;
  /** How long one attempt may wait for the first sign of an answer before it is abandoned; shortened in tests. */
  readonly headersTimeoutMs?: number;
}

/** Reads are started again beside a slow one after this long. A healthy connection opens in a fraction of a second. */
const DEFAULT_HEDGE_DELAY_MS = 1000;
/** An attempt with no sign of an answer by now is abandoned; a connection that hangs would otherwise wait ten seconds. */
const DEFAULT_HEADERS_TIMEOUT_MS = 6000;
const READ_ATTEMPTS = 6;
const WRITE_ATTEMPTS = 3;
const WRITE_RETRY_DELAY_MS = 300;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** A rate-limit answer is final: asking again only makes it worse, so it ends a hedged read at once. */
class RateLimitedSignal extends Error {
  public readonly response: Response;

  public constructor(response: Response) {
    super('rate limited');
    this.response = response;
  }
}

function send(request: HttpRequest, cancel: AbortSignal): Promise<Response> {
  const init: FetchRequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
    signal: AbortSignal.any([cancel, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
  };
  if (request.body !== undefined) {
    init.body = request.body;
  }
  return fetch(request.url, init);
}

async function readResponse(response: Response): Promise<HttpResponse> {
  const headers = new Map<string, string>();
  response.headers.forEach((value, key) => {
    headers.set(key.toLowerCase(), value);
  });
  const buffer = await response.arrayBuffer();
  const bodyBytes = new Uint8Array(buffer);
  return {
    status: response.status,
    headers,
    setCookie: readSetCookie(response.headers),
    body: new TextDecoder().decode(bodyBytes),
    bodyBytes,
  };
}

function networkError(error: unknown, request: HttpRequest): AffineError {
  return new AffineError(describeNetworkFailure(error, request.url, 'affine.serverUrl'), AffineErrorCode.HTTP_ERROR, { cause: error });
}

function isWorthAnotherRead(error: Error): boolean {
  return !(error instanceof RateLimitedSignal) && (isTimeoutError(error) || classifyNetworkFailure(error) !== 'other');
}

/** What an attempt that heard nothing at all looks like, so it is described and retried like a hung connection. */
function noAnswerError(): TypeError {
  return Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('no response'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) });
}

async function attemptRead(request: HttpRequest, cancel: AbortSignal, headersTimeoutMs: number): Promise<Response> {
  const guard = new AbortController();
  let guardFired = false;
  const timer = setTimeout(() => {
    guardFired = true;
    guard.abort();
  }, headersTimeoutMs);
  try {
    const response = await send(request, AbortSignal.any([cancel, guard.signal]));
    if (response.status === 429) {
      throw new RateLimitedSignal(response);
    }
    return response;
  } catch (error: unknown) {
    throw guardFired ? noAnswerError() : error;
  } finally {
    // Once the answer has started the guard is no use: it must not cut a slow download short.
    clearTimeout(timer);
  }
}

/** A read is safe to repeat, so slow or failed attempts are overtaken by new ones running beside them. */
async function readHedged(request: HttpRequest, hedgeDelayMs: number, headersTimeoutMs: number): Promise<HttpResponse> {
  try {
    const response = await hedge((cancel) => attemptRead(request, cancel, headersTimeoutMs), { delayMs: hedgeDelayMs, maxAttempts: READ_ATTEMPTS, shouldRetry: isWorthAnotherRead });
    return await readResponse(response);
  } catch (error: unknown) {
    if (error instanceof RateLimitedSignal) {
      return readResponse(error.response);
    }
    if (isTimeoutError(error)) {
      return TIMEOUT_RESPONSE;
    }
    throw networkError(error, request);
  }
}

/** A write is only repeated when the connection never opened, because then nothing reached the server. */
async function writeOnce(request: HttpRequest, sleep: (ms: number) => Promise<void>): Promise<HttpResponse> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await readResponse(await send(request, new AbortController().signal));
    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        return TIMEOUT_RESPONSE;
      }
      if (attempt >= WRITE_ATTEMPTS || classifyNetworkFailure(error) !== 'before-connect') {
        throw networkError(error, request);
      }
      await sleep(WRITE_RETRY_DELAY_MS * attempt);
    }
  }
}

export function createFetchHttpClient(options: FetchClientOptions = {}): HttpClient {
  const sleep = options.sleep ?? defaultSleep;
  const hedgeDelayMs = options.hedgeDelayMs ?? DEFAULT_HEDGE_DELAY_MS;
  const headersTimeoutMs = options.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS;
  return (request: HttpRequest): Promise<HttpResponse> =>
    request.method === HttpMethod.GET || request.safeToRepeat === true ? readHedged(request, hedgeDelayMs, headersTimeoutMs) : writeOnce(request, sleep);
}

export const fetchHttpClient: HttpClient = createFetchHttpClient();
