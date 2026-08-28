import * as Y from 'yjs';
import { ACCESS_TOKEN_NAME } from '../constants';
import { AffineClient } from './affine-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';
import type { AffineSync, PushDocUpdateInput } from '../sync/affine-sync';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { parsePageDoc } from '../yjs/parse-page-doc';
import { parseTrashedPages, parseWorkspaceRoot } from '../yjs/parse-workspace-root';
import { parseFoldersTable } from '../yjs/parse-folders-table';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { HttpMethod } from '../utils/enums/http-method.enum';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';

function jsonResponse(status: number, body: unknown, setCookie: readonly string[] = []): HttpResponse {
  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    setCookie,
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

interface EncodeWorkspaceRootPageInput {
  readonly id: string;
  readonly title: string;
  readonly trash?: boolean;
}

interface EncodeWorkspaceRootInput {
  readonly name: string;
  readonly pages: readonly EncodeWorkspaceRootPageInput[];
}

interface EncodeFolderRow {
  readonly id: string;
  readonly parentId?: string;
  readonly type: PageTreeKind;
  readonly data: string;
  readonly index: string;
}

function encodeFolders(rows: readonly EncodeFolderRow[]): Uint8Array {
  const doc = new Y.Doc();
  for (const row of rows) {
    const record = doc.getMap(row.id);
    record.set('id', row.id);
    if (row.parentId !== undefined) {
      record.set('parentId', row.parentId);
    }
    record.set('type', row.type);
    record.set('data', row.data);
    record.set('index', row.index);
  }
  return Y.encodeStateAsUpdate(doc);
}

function encodeWorkspaceRoot(input: EncodeWorkspaceRootInput): Uint8Array {
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  meta.set('name', input.name);
  const pages = new Y.Array<Y.Map<unknown>>();
  for (const page of input.pages) {
    const item = new Y.Map<unknown>();
    item.set('id', page.id);
    item.set('title', page.title);
    if (page.trash === true) {
      item.set('trash', true);
    }
    pages.push([item]);
  }
  meta.set('pages', pages);
  return Y.encodeStateAsUpdate(doc);
}

function encodeMiniPage(): Uint8Array {
  const doc = new Y.Doc();
  const root = doc.getMap('blocks');
  const page = new Y.Map<unknown>();
  page.set('sys:id', 'page');
  page.set('sys:flavour', 'affine:page');
  const pageChildren = new Y.Array<string>();
  pageChildren.insert(0, ['note']);
  page.set('sys:children', pageChildren);
  const title = new Y.Text();
  title.insert(0, 'Standup');
  page.set('prop:title', title);
  root.set('page', page);
  const note = new Y.Map<unknown>();
  note.set('sys:id', 'note');
  note.set('sys:flavour', 'affine:note');
  const noteChildren = new Y.Array<string>();
  noteChildren.insert(0, ['p1']);
  note.set('sys:children', noteChildren);
  root.set('note', note);
  const paragraph = new Y.Map<unknown>();
  paragraph.set('sys:id', 'p1');
  paragraph.set('sys:flavour', 'affine:paragraph');
  paragraph.set('prop:type', 'text');
  const text = new Y.Text();
  text.insert(0, 'Hello');
  paragraph.set('prop:text', text);
  paragraph.set('sys:children', new Y.Array<string>());
  root.set('p1', paragraph);
  return Y.encodeStateAsUpdate(doc);
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

class RecordingSync implements AffineSync {
  public readonly pushes: PushDocUpdateInput[] = [];

  public pushDocUpdate(input: PushDocUpdateInput): Promise<void> {
    this.pushes.push(input);
    return Promise.resolve();
  }
}

describe('AffineClient', () => {
  it('returns the current user', async () => {
    const { client } = createFakeHttp([
      jsonResponse(200, {
        data: { currentUser: { id: 'u1', email: 'owner@example.com', name: 'Admin', avatarUrl: '/api/avatars/u1' } },
      }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.currentUser()).resolves.toEqual({
      id: 'u1',
      email: 'owner@example.com',
      name: 'Admin',
      avatarUrl: 'https://affine.example/api/avatars/u1',
    });
  });

  it('paginates documents until hasNextPage is false', async () => {
    const { client, requests } = createFakeHttp([
      jsonResponse(200, {
        data: {
          workspace: {
            id: 'ws',
            docs: {
              edges: [{ cursor: 'c1', node: { id: 'd1', workspaceId: 'ws', title: 'One', updatedAt: null } }],
              pageInfo: { hasNextPage: true, endCursor: 'c1' },
            },
          },
        },
      }),
      jsonResponse(200, {
        data: {
          workspace: {
            id: 'ws',
            docs: {
              edges: [{ cursor: 'c2', node: { id: 'd2', workspaceId: 'ws', title: 'Two', updatedAt: null } }],
              pageInfo: { hasNextPage: false, endCursor: 'c2' },
            },
          },
        },
      }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    const docs = await affine.listAllDocs('ws');
    expect(docs.map((doc) => doc.id)).toEqual(['d1', 'd2']);
    expect(requests).toHaveLength(2);
    expect(JSON.parse(requests[1]?.body ?? '{}')).toMatchObject({ variables: { after: 'c1' } });
  });

  it('exchanges email/password for an access token when generateUserAccessToken works', async () => {
    const { client, requests } = createFakeHttp([
      jsonResponse(200, { user: { id: 'u1' } }, ['affine_session=sess; HttpOnly', 'affine_csrf_token=csrf; Path=/']),
      jsonResponse(200, { data: { generateUserAccessToken: { id: 'tok1', token: 'affine_sk_new' } } }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: undefined,
    });

    const credential = await affine.signInWithPassword({ email: 'owner@example.com', password: 'secret' });

    expect(credential).toEqual({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'affine_sk_new' });
    expect(requests[0]?.url).toBe('https://affine.example/api/auth/sign-in');
    expect(requests[1]?.headers['Cookie']).toBe('affine_session=sess; affine_csrf_token=csrf');
    expect(JSON.parse(requests[1]?.body ?? '{}')).toMatchObject({ variables: { name: ACCESS_TOKEN_NAME } });
  });

  it('falls back to the session cookie when token minting fails', async () => {
    const { client } = createFakeHttp([
      jsonResponse(200, { user: { id: 'u1' } }, ['affine_session=sess; HttpOnly', 'tracking=drop-me; Path=/', 'affine_csrf_token=csrf; Path=/']),
      jsonResponse(200, { data: null, errors: [{ message: 'denied' }] }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: undefined,
    });

    await expect(affine.signInWithPassword({ email: 'a@b.c', password: 'x' })).resolves.toEqual({
      kind: AffineCredentialKind.SESSION,
      cookieHeader: 'affine_session=sess; affine_csrf_token=csrf',
      csrfToken: 'csrf',
    });
  });

  it('reads page titles from the workspace root document', async () => {
    const { client, requests } = createFakeHttp([binaryResponse(200, encodeWorkspaceRoot({ name: 'MasteryHub', pages: [{ id: 'p1', title: 'Roadmap' }] })), binaryResponse(404, new Uint8Array())]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.listWorkspacePages('ws-1')).resolves.toEqual({
      name: 'MasteryHub',
      documents: [{ id: 'p1', workspaceId: 'ws-1', title: 'Roadmap', updatedAt: null }],
      tree: [{ kind: PageTreeKind.DOC, id: 'p1', title: 'Roadmap', children: [] }],
      favorites: [],
      collections: [],
    });
    expect(requests[0]?.url).toBe('https://affine.example/api/workspaces/ws-1/docs/ws-1');
    expect(requests[1]?.url).toBe('https://affine.example/api/workspaces/ws-1/docs/db%24ws-1%24folders');
    expect(requests[0]?.method).toBe(HttpMethod.GET);
    expect(requests[0]?.headers['Authorization']).toBe('Bearer sk');
  });

  it('nests pages under AFFiNE organize folders', async () => {
    const { client, requests } = createFakeHttp([
      binaryResponse(
        200,
        encodeWorkspaceRoot({
          name: 'MasteryHub',
          pages: [
            { id: 'p1', title: 'Roadmap' },
            { id: 'p2', title: 'Notes' },
          ],
        })
      ),
      binaryResponse(
        200,
        encodeFolders([
          { id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
          { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'p1', index: 'a0' },
        ])
      ),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.listWorkspacePages('ws-1')).resolves.toEqual({
      name: 'MasteryHub',
      documents: [
        { id: 'p1', workspaceId: 'ws-1', title: 'Roadmap', updatedAt: null },
        { id: 'p2', workspaceId: 'ws-1', title: 'Notes', updatedAt: null },
      ],
      tree: [
        {
          kind: PageTreeKind.FOLDER,
          id: 'f1',
          title: 'Product',
          children: [{ kind: PageTreeKind.DOC, id: 'p1', title: 'Roadmap', children: [] }],
        },
        { kind: PageTreeKind.DOC, id: 'p2', title: 'Notes', children: [] },
      ],
      favorites: [],
      collections: [],
    });
    expect(requests[1]?.url).toBe('https://affine.example/api/workspaces/ws-1/docs/db%24ws-1%24folders');
  });

  it('falls back to GraphQL docs when the root document cannot be loaded', async () => {
    const { client } = createFakeHttp([
      binaryResponse(404, new Uint8Array()),
      jsonResponse(200, {
        data: {
          workspace: {
            id: 'ws-1',
            docs: {
              edges: [
                { cursor: 'c1', node: { id: 'ws-1', workspaceId: 'ws-1', title: null, updatedAt: null } },
                { cursor: 'c2', node: { id: 'db$collection', workspaceId: 'ws-1', title: null, updatedAt: null } },
                { cursor: 'c3', node: { id: 'p1', workspaceId: 'ws-1', title: 'Kept', updatedAt: null } },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'c3' },
            },
          },
        },
      }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.listWorkspacePages('ws-1')).resolves.toEqual({
      name: null,
      documents: [{ id: 'p1', workspaceId: 'ws-1', title: 'Kept', updatedAt: null }],
      tree: [{ kind: PageTreeKind.DOC, id: 'p1', title: 'Kept', children: [] }],
      favorites: [],
      collections: [],
    });
  });

  it('loads a page Yjs document into parsed blocks', async () => {
    const { client, requests } = createFakeHttp([binaryResponse(200, encodeMiniPage())]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.loadPageDoc('ws-1', 'doc-1')).resolves.toEqual({
      title: 'Standup',
      edgelessOnly: false,
      blocks: [
        {
          kind: PageBlockKind.PARAGRAPH,
          inlines: [{ text: 'Hello', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
        },
      ],
    });
    expect(requests[0]?.url).toBe('https://affine.example/api/workspaces/ws-1/docs/doc-1');
    expect(requests[0]?.headers['Authorization']).toBe('Bearer sk');
  });

  it('loads a page preview with authors and resolved avatar urls', async () => {
    const { client } = createFakeHttp([
      binaryResponse(200, encodeMiniPage()),
      jsonResponse(200, {
        data: {
          workspace: {
            doc: {
              createdBy: { name: 'Ada', avatarUrl: '/api/avatars/a' },
              lastUpdatedBy: { name: 'Sara', avatarUrl: null },
            },
          },
        },
      }),
    ]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    await expect(affine.loadPagePreview('ws-1', 'doc-1')).resolves.toEqual({
      page: {
        title: 'Standup',
        edgelessOnly: false,
        blocks: [
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [{ text: 'Hello', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
          },
        ],
      },
      createdBy: { name: 'Ada', avatarUrl: 'https://affine.example/api/avatars/a' },
      updatedBy: { name: 'Sara', avatarUrl: undefined },
      mentionPeople: {},
    });
  });

  it('still returns the page when author lookup fails', async () => {
    const { client } = createFakeHttp([binaryResponse(200, encodeMiniPage()), jsonResponse(200, { data: null, errors: [{ message: 'denied' }] })]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });

    const preview = await affine.loadPagePreview('ws-1', 'doc-1');
    expect(preview.page.title).toBe('Standup');
    expect(preview.createdBy).toBeUndefined();
    expect(preview.updatedBy).toBeUndefined();
    expect(preview.mentionPeople).toEqual({});
  });

  it('trashes a page by pushing a workspace root update', async () => {
    const root = encodeWorkspaceRoot({
      name: 'MasteryHub',
      pages: [
        { id: 'p1', title: 'Keep' },
        { id: 'p2', title: 'Gone' },
      ],
    });
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    await affine.trashPage('ws-1', 'p2');
    expect(sync.pushes).toHaveLength(1);
    expect(sync.pushes[0]?.docId).toBe('ws-1');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, root);
    Y.applyUpdate(merged, sync.pushes[0]?.update ?? new Uint8Array());
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(merged)).pages.map((page) => page.id)).toEqual(['p1']);
  });

  it('moves a page into a folder by pushing a folders table update', async () => {
    const folders = encodeFolders([
      { id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
      { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'p1', index: 'a0' },
    ]);
    const sync = new RecordingSync();
    const { client, requests } = createFakeHttp([binaryResponse(200, folders)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.25.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    await affine.movePage('ws-1', 'p1', 'f2');
    expect(requests[0]?.url).toBe('https://affine.example/api/workspaces/ws-1/docs/db%24ws-1%24folders');
    expect(sync.pushes[0]?.docId).toBe('db$ws-1$folders');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, folders);
    Y.applyUpdate(merged, sync.pushes[0]?.update ?? new Uint8Array());
    const rows = parseFoldersTable(Y.encodeStateAsUpdate(merged));
    const moved = rows.find((row) => row.id === 'l1');
    expect(moved?.parentId).toBe('f2');
    expect(moved?.type).toBe(PageTreeKind.DOC);
    expect(moved?.data).toBe('p1');
    expect(moved?.index.length).toBeGreaterThan(0);
  });

  it('restores a trashed page by pushing a workspace root update', async () => {
    const root = encodeWorkspaceRoot({
      name: 'MasteryHub',
      pages: [
        { id: 'p1', title: 'Keep' },
        { id: 'p2', title: 'Gone', trash: true },
      ],
    });
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    await affine.restorePage('ws-1', 'p2');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, root);
    Y.applyUpdate(merged, sync.pushes[0]?.update ?? new Uint8Array());
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(merged)).pages.map((page) => page.id)).toEqual(['p1', 'p2']);
    expect(parseTrashedPages(Y.encodeStateAsUpdate(merged))).toEqual([]);
  });

  it('lists trashed pages from the workspace root', async () => {
    const root = encodeWorkspaceRoot({
      name: 'MasteryHub',
      pages: [
        { id: 'p1', title: 'Keep' },
        { id: 'p2', title: 'Gone', trash: true },
      ],
    });
    const { client } = createFakeHttp([binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
    });
    await expect(affine.listTrashedPages('ws-1')).resolves.toEqual([{ id: 'p2', title: 'Gone', parentId: null, subpageIds: [] }]);
  });

  it('creates a page and registers it in workspace meta', async () => {
    const root = encodeWorkspaceRoot({ name: 'MasteryHub', pages: [{ id: 'p1', title: 'Keep' }] });
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    const created = await affine.createPage({ workspaceId: 'ws-1', title: 'New spec', folderId: null });
    expect(created.title).toBe('New spec');
    expect(created.workspaceId).toBe('ws-1');
    expect(sync.pushes).toHaveLength(2);
    const pagePush = sync.pushes.find((push) => push.docId === created.id);
    const metaPush = sync.pushes.find((push) => push.docId === 'ws-1');
    expect(pagePush).toBeDefined();
    expect(parsePageDoc(pagePush?.update ?? new Uint8Array()).title).toBe('New spec');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, root);
    Y.applyUpdate(merged, metaPush?.update ?? new Uint8Array());
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(merged)).pages.map((page) => page.title)).toEqual(['Keep', 'New spec']);
  });

  it('creates an organize folder', async () => {
    const folders = encodeFolders([{ id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' }]);
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, folders)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    await affine.createFolder({ workspaceId: 'ws-1', title: 'Specs', parentId: 'f1' });
    expect(sync.pushes[0]?.docId).toBe('db$ws-1$folders');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, folders);
    Y.applyUpdate(merged, sync.pushes[0]?.update ?? new Uint8Array());
    expect(parseFoldersTable(Y.encodeStateAsUpdate(merged)).some((row) => row.data === 'Specs' && row.parentId === 'f1')).toBe(true);
  });

  it('renames a page title in workspace meta', async () => {
    const root = encodeWorkspaceRoot({ name: 'MasteryHub', pages: [{ id: 'p1', title: 'Old' }] });
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    await affine.renamePage('ws-1', 'p1', 'Renamed');
    const merged = new Y.Doc();
    Y.applyUpdate(merged, root);
    Y.applyUpdate(merged, sync.pushes[0]?.update ?? new Uint8Array());
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(merged)).pages[0]?.title).toBe('Renamed');
  });

  it('duplicates a page document and registers a copy in workspace meta', async () => {
    const root = encodeWorkspaceRoot({ name: 'MasteryHub', pages: [{ id: 'p1', title: 'Spec' }] });
    const pageBin = encodeMiniPage();
    const sync = new RecordingSync();
    const { client } = createFakeHttp([binaryResponse(200, pageBin), binaryResponse(200, root)]);
    const affine = new AffineClient({
      serverUrl: 'https://affine.example',
      clientVersion: '0.26.0',
      http: client,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'sk' },
      sync,
    });

    const copy = await affine.duplicatePage('ws-1', 'p1');
    expect(copy.title).toBe('Copy of Spec');
    expect(copy.id).not.toBe('p1');
    expect(sync.pushes).toHaveLength(2);
    expect(parsePageDoc(sync.pushes[0]?.update ?? new Uint8Array()).title).toBe('Standup');
  });
});
