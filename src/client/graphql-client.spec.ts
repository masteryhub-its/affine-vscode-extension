import { CLIENT_VERSION_HEADER } from '../constants';
import { type AffineError, AffineErrorCode } from '../errors/affine-error';
import { GraphQLClient } from './graphql-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { HttpMethod } from '../utils/enums/http-method.enum';

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    setCookie: [],
    body: JSON.stringify(body),
  };
}

interface FakeHttp {
  readonly client: HttpClient;
  readonly requests: HttpRequest[];
}

function createFakeHttp(responses: HttpResponse[]): FakeHttp {
  const requests: HttpRequest[] = [];
  const queue = [...responses];
  const client: HttpClient = (request: HttpRequest): Promise<HttpResponse> => {
    requests.push(request);
    const next = queue.shift();
    if (next === undefined) {
      return Promise.reject(new Error('No fake HTTP response queued'));
    }
    return Promise.resolve(next);
  };
  return { client, requests };
}

describe('GraphQLClient', () => {
  it('posts to /graphql with client version and bearer token', async () => {
    const { client, requests } = createFakeHttp([jsonResponse(200, { data: { currentUser: { id: 'u1' } } })]);
    const graphql = new GraphQLClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    const data = await graphql.request<{ currentUser: { id: string } }>({ query: 'query { currentUser { id } }' });

    expect(data.currentUser.id).toBe('u1');
    expect(requests[0]?.url).toBe('https://affine.example/graphql');
    expect(requests[0]?.method).toBe(HttpMethod.POST);
    expect(requests[0]?.headers['Authorization']).toBe('Bearer sk');
    expect(requests[0]?.headers[CLIENT_VERSION_HEADER]).toBe('0.25.0');
  });

  it('throws AUTHENTICATION_REQUIRED on HTTP 401', async () => {
    const { client } = createFakeHttp([jsonResponse(401, { errors: [{ message: 'unauth' }] })]);
    const graphql = new GraphQLClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: undefined,
    });

    await expect(graphql.request({ query: 'query { currentUser { id } }' })).rejects.toMatchObject({
      code: AffineErrorCode.AUTHENTICATION_REQUIRED,
    } satisfies Partial<AffineError>);
  });

  it('throws GraphQL errors from the payload', async () => {
    const { client } = createFakeHttp([
      jsonResponse(200, {
        data: null,
        errors: [{ message: 'Authentication required', extensions: { code: AffineErrorCode.AUTHENTICATION_REQUIRED } }],
      }),
    ]);
    const graphql = new GraphQLClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: undefined,
    });

    await expect(graphql.request({ query: 'query { currentUser { id } }' })).rejects.toMatchObject({
      code: AffineErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Authentication required',
    });
  });
});
