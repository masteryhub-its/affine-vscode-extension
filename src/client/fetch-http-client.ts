import { FETCH_TIMEOUT_MS } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import type { HttpClient, HttpMethod, HttpRequest, HttpResponse } from './http.types';
import { describeNetworkFailure } from './network-error';

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

export const fetchHttpClient: HttpClient = async (request: HttpRequest): Promise<HttpResponse> => {
  const init: FetchRequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
  if (request.body !== undefined) {
    init.body = request.body;
  }

  try {
    const response = await fetch(request.url, init);

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
  } catch (error: unknown) {
    if (isTimeoutError(error)) {
      return TIMEOUT_RESPONSE;
    }
    throw new AffineError(describeNetworkFailure(error, request.url, 'affine.serverUrl'), AffineErrorCode.HTTP_ERROR, { cause: error });
  }
};
