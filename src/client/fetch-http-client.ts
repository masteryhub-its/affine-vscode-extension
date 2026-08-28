import type { HttpClient, HttpMethod, HttpRequest, HttpResponse } from './http.types';

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
}

export const fetchHttpClient: HttpClient = async (request: HttpRequest): Promise<HttpResponse> => {
  const init: FetchRequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
  };
  if (request.body !== undefined) {
    init.body = request.body;
  }

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
};
