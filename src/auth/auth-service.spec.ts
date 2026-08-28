import * as Y from 'yjs';
import type { SecretStore } from '../client/affine.types';
import type { HttpClient, HttpRequest, HttpResponse } from '../client/http.types';
import type { AffineSettings, SettingsReader } from '../config/settings.types';
import { ACCESS_TOKEN_SECRET_KEY } from '../constants';
import { type AffineError, AffineErrorCode } from '../errors/affine-error';
import type { AffineSync, PushDocUpdateInput } from '../sync/affine-sync';
import { AuthService } from './auth-service';
import { serializeBoundCredential } from './credential-codec';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { OpenMode } from '../utils/enums/open-mode.enum';

class MemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  public get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.values.get(key));
  }

  public store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  public delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    setCookie: [],
    body: JSON.stringify(body),
  };
}

function binaryResponse(status: number, bodyBytes: Uint8Array): HttpResponse {
  return {
    status,
    headers: new Map([['content-type', 'application/octet-stream']]),
    setCookie: [],
    body: '',
    bodyBytes,
  };
}

function encodeWorkspaceRoot(id: string, title: string): Uint8Array {
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  meta.set('name', 'Workspace');
  const pages = new Y.Array<Y.Map<unknown>>();
  const item = new Y.Map<unknown>();
  item.set('id', id);
  item.set('title', title);
  pages.push([item]);
  meta.set('pages', pages);
  return Y.encodeStateAsUpdate(doc);
}

class RecordingSync implements AffineSync {
  public readonly pushes: PushDocUpdateInput[] = [];

  public pushDocUpdate(input: PushDocUpdateInput): Promise<void> {
    this.pushes.push(input);
    return Promise.resolve();
  }
}

function createFakeHttp(responses: HttpResponse[]): HttpClient {
  const queue = [...responses];
  const client: HttpClient = (_request: HttpRequest): Promise<HttpResponse> => {
    const next = queue.shift();
    if (next === undefined) {
      return Promise.reject(new Error('No fake HTTP response queued'));
    }
    return Promise.resolve(next);
  };
  return client;
}

const settings: AffineSettings = {
  serverUrl: 'https://affine.example',
  defaultWorkspaceId: undefined,
  openMode: OpenMode.EXTERNAL,
  clientVersion: '0.25.0',
};

const settingsReader: SettingsReader = {
  read: (): AffineSettings => settings,
};

describe('AuthService', () => {
  it('rejects an empty access token before calling the server', async () => {
    const auth = new AuthService({
      secrets: new MemorySecretStore(),
      settings: settingsReader,
      http: createFakeHttp([]),
    });

    await expect(auth.signInWithToken({ token: '  ' })).rejects.toMatchObject({
      code: AffineErrorCode.AUTHENTICATION_FAILED,
    } satisfies Partial<AffineError>);
  });

  it('stores a token only after currentUser succeeds', async () => {
    const secrets = new MemorySecretStore();
    const auth = new AuthService({
      secrets,
      settings: settingsReader,
      http: createFakeHttp([
        jsonResponse(200, {
          data: { currentUser: { id: 'u1', email: 'owner@example.com', name: 'Admin' } },
        }),
      ]),
    });

    const user = await auth.signInWithToken({ token: ' affine_sk_live ' });
    expect(user.email).toBe('owner@example.com');
    const stored = await secrets.get(ACCESS_TOKEN_SECRET_KEY);
    expect(stored).toContain('affine_sk_live');
    expect(stored).toContain('https://affine.example');
  });

  it('clears a credential bound to a different server url', async () => {
    const secrets = new MemorySecretStore();
    await secrets.store(
      ACCESS_TOKEN_SECRET_KEY,
      serializeBoundCredential({
        serverUrl: 'https://affine.masteryhub-its.com',
        credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'tok' },
      })
    );
    const requests: HttpRequest[] = [];
    const auth = new AuthService({
      secrets,
      settings: settingsReader,
      http: (request: HttpRequest): Promise<HttpResponse> => {
        requests.push(request);
        return Promise.reject(new Error('should not call the server'));
      },
    });

    await expect(auth.requireClient()).rejects.toMatchObject({ code: AffineErrorCode.NOT_SIGNED_IN });
    await expect(secrets.get(ACCESS_TOKEN_SECRET_KEY)).resolves.toBeUndefined();
    expect(requests).toHaveLength(0);
  });

  it('clears a legacy credential without a bound server url', async () => {
    const secrets = new MemorySecretStore();
    await secrets.store(ACCESS_TOKEN_SECRET_KEY, JSON.stringify({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'tok' }));
    const auth = new AuthService({
      secrets,
      settings: settingsReader,
      http: createFakeHttp([]),
    });

    await expect(auth.currentUser()).resolves.toBeUndefined();
    await expect(secrets.get(ACCESS_TOKEN_SECRET_KEY)).resolves.toBeUndefined();
  });

  it('does not store a token when currentUser fails', async () => {
    const secrets = new MemorySecretStore();
    const auth = new AuthService({
      secrets,
      settings: settingsReader,
      http: createFakeHttp([jsonResponse(401, {})]),
    });

    await expect(auth.signInWithToken({ token: 'bad' })).rejects.toMatchObject({ code: AffineErrorCode.AUTHENTICATION_REQUIRED });
    await expect(secrets.get(ACCESS_TOKEN_SECRET_KEY)).resolves.toBeUndefined();
  });

  it('throws NOT_SIGNED_IN when requireClient has no secret', async () => {
    const auth = new AuthService({
      secrets: new MemorySecretStore(),
      settings: settingsReader,
      http: createFakeHttp([]),
    });

    await expect(auth.requireClient()).rejects.toMatchObject({ code: AffineErrorCode.NOT_SIGNED_IN });
  });

  it('lets a signed-in client push a trash update through injected sync', async () => {
    const secrets = new MemorySecretStore();
    await secrets.store(
      ACCESS_TOKEN_SECRET_KEY,
      serializeBoundCredential({
        serverUrl: 'https://affine.example',
        credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'tok' },
      })
    );
    const sync = new RecordingSync();
    const auth = new AuthService({
      secrets,
      settings: settingsReader,
      http: createFakeHttp([binaryResponse(200, encodeWorkspaceRoot('d1', 'Spec'))]),
      createSync: () => sync,
    });

    const client = await auth.requireClient();
    await client.trashPage('ws', 'd1');

    expect(sync.pushes).toHaveLength(1);
    expect(sync.pushes[0]?.workspaceId).toBe('ws');
    expect(sync.pushes[0]?.docId).toBe('ws');
    expect(sync.pushes[0]?.update.byteLength).toBeGreaterThan(0);
  });
});
