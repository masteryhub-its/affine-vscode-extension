import { HttpMethod } from '../utils/enums/http-method.enum';
import { fetchHttpClient } from './fetch-http-client';

interface MockFetchInit {
  readonly redirect?: string;
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
});
