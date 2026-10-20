import * as Y from 'yjs';
import type { AffineSync, PushDocUpdateInput } from '../sync/affine-sync';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { encodeEmptyPageDoc } from '../yjs/encode-page-doc';
import { parsePageDoc } from '../yjs/parse-page-doc';
import { AffineClient } from './affine-client';
import type { HttpClient, HttpRequest } from './http.types';

const SERVER = 'https://affine.test';

function pageBin(text: string): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, encodeEmptyPageDoc({ title: 'Doc', pageId: 'page', noteId: 'note', paragraphId: 'p1', surfaceId: 'surface' }));
  ((doc.getMap('blocks').get('p1') as Y.Map<unknown>).get('prop:text') as Y.Text).insert(0, text);
  return Y.encodeStateAsUpdate(doc);
}

interface Harness {
  readonly client: AffineClient;
  readonly pushed: PushDocUpdateInput[];
  readonly requests: HttpRequest[];
  /** The page as the server holds it, which updates are computed against. */
  readonly bin: Uint8Array;
}

function harness(options: { readonly text?: string; readonly syncFails?: boolean; readonly withSync?: boolean } = {}): Harness {
  const pushed: PushDocUpdateInput[] = [];
  const requests: HttpRequest[] = [];
  const bin = pageBin(options.text ?? 'Hello world');
  const http: HttpClient = (request) => {
    requests.push(request);
    return Promise.resolve({ status: 200, headers: new Map(), setCookie: [], body: '', bodyBytes: bin });
  };
  const sync: AffineSync = {
    pushDocUpdate: (input) => {
      if (options.syncFails === true) {
        return Promise.reject(new Error('socket closed'));
      }
      pushed.push(input);
      return Promise.resolve();
    },
  };
  const client = new AffineClient({
    serverUrl: SERVER,
    clientVersion: '0.26.0',
    http,
    credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 't' },
    ...(options.withSync === false ? {} : { sync }),
  });
  return { client, pushed, requests, bin };
}

function textAfter(base: Uint8Array, update: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, base);
  Y.applyUpdate(doc, update);
  return parsePageDoc(Y.encodeStateAsUpdate(doc))
    .blocks.flatMap((block) => ('inlines' in block ? [block.inlines.map((span) => span.text).join('')] : []))
    .join('|');
}

describe('AffineClient inline editing', () => {
  it('fetches the current page and pushes only the change to that page', async () => {
    const { client, pushed, requests, bin } = harness();
    const saved = await client.editBlockText('w1', 'd1', 'p1', 'Hello there');
    expect(saved).toBe(true);
    expect(requests[0]?.url).toBe(`${SERVER}/api/workspaces/w1/docs/d1`);
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toMatchObject({ workspaceId: 'w1', docId: 'd1' });
    expect(textAfter(bin, pushed[0]?.update as Uint8Array)).toBe('Hello there');
  });

  it('pushes nothing when the text is unchanged', async () => {
    const { client, pushed } = harness();
    expect(await client.editBlockText('w1', 'd1', 'p1', 'Hello world')).toBe(false);
    expect(pushed).toHaveLength(0);
  });

  it('says it was the save that failed, and keeps the cause', async () => {
    const { client } = harness({ syncFails: true });
    await expect(client.editBlockText('w1', 'd1', 'p1', 'changed')).rejects.toThrow(/Failed to save your edit: .*socket closed/u);
  });

  it('refuses a block that cannot be edited without pushing anything', async () => {
    const { client, pushed } = harness();
    await expect(client.editBlockText('w1', 'd1', 'note', 'x')).rejects.toThrow('text block');
    expect(pushed).toHaveLength(0);
  });

  it('needs sync to be set up', async () => {
    const { client } = harness({ withSync: false });
    await expect(client.editBlockText('w1', 'd1', 'p1', 'changed')).rejects.toThrow('not configured');
  });

  it('appends a paragraph with a fresh id', async () => {
    const { client, pushed, bin } = harness();
    const blockId = await client.appendParagraph('w1', 'd1', 'A new line');
    expect(blockId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(pushed).toHaveLength(1);
    expect(textAfter(bin, pushed[0]?.update as Uint8Array)).toBe('Hello world|A new line');
  });

  it('does not append empty text', async () => {
    const { client, pushed } = harness();
    await expect(client.appendParagraph('w1', 'd1', '   ')).rejects.toThrow('empty');
    expect(pushed).toHaveLength(0);
  });
});
