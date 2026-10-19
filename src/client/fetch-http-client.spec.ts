import { HttpMethod } from '../utils/enums/http-method.enum';
import { fetchHttpClient } from './fetch-http-client';

interface MockFetchInit {
  readonly redirect?: string;
  readonly signal?: AbortSignal | null;
}

describe('fetchHttpClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does not follow redirects so a password POST cannot be replayed', async () => {
    let callCount = 0;
    globalThis.fetch = (url: string | URL | Request, init?: MockFetchInit): Promise<Response> => {
      callCount += 1;
      expect(url).toBe('https://affine.example/api/auth/sign-in');
      expect(init?.redirect).toBe('manual');
      return Promise.resolve(
        new Response('', {
          status: 307,
          headers: { Location: 'https://attacker.example/steal' },
        })
      );
    };

    const response = await fetchHttpClient({
      url: 'https://affine.example/api/auth/sign-in',
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'secret' }),
    });

    expect(response.status).toBe(307);
    expect(callCount).toBe(1);
  });

  it('passes an abort signal and maps a timeout rejection to HTTP 408', async () => {
    let sawSignal = false;
    globalThis.fetch = (_url: string | URL | Request, init?: MockFetchInit): Promise<Response> => {
      sawSignal = init?.signal instanceof AbortSignal;
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      return Promise.reject(timeoutError);
    };

    const response = await fetchHttpClient({
      url: 'https://affine.example/graphql',
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'query { me { id } }' }),
    });

    expect(sawSignal).toBe(true);
    expect(response.status).toBe(408);
    expect(response.body).toBe('');
  });

  it('still surfaces non-timeout network errors', async () => {
    globalThis.fetch = (): Promise<Response> => Promise.reject(new TypeError('fetch failed'));
    await expect(
      fetchHttpClient({
        url: 'https://affine.example/graphql',
        method: HttpMethod.POST,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).rejects.toThrow(/fetch failed/);
  });
});
