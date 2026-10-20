import * as Y from 'yjs';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { encodeEmptyPageDoc } from '../yjs/encode-page-doc';
import { AffineClient } from './affine-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';

const SERVER = 'https://affine.test';
const STEP_MS = 25;

function rootBin(): Uint8Array {
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  meta.set('name', 'Space');
  const pages = new Y.Array<Y.Map<unknown>>();
  const page = new Y.Map<unknown>();
  page.set('id', 'doc1');
  page.set('title', 'First');
  pages.push([page]);
  meta.set('pages', pages);
  return Y.encodeStateAsUpdate(doc);
}

function pageBin(): Uint8Array {
  return encodeEmptyPageDoc({ title: 'Doc', pageId: 'page', noteId: 'note', paragraphId: 'p1', surfaceId: 'surface' });
}

interface Timed {
  readonly http: HttpClient;
  readonly maxInFlight: () => number;
  readonly requests: HttpRequest[];
}

/** Answers every request after a short pause and records how many were waiting at the same moment. */
function timedHttp(): Timed {
  let inFlight = 0;
  let max = 0;
  const requests: HttpRequest[] = [];
  const http: HttpClient = async (request) => {
    requests.push(request);
    inFlight += 1;
    max = Math.max(max, inFlight);
    await new Promise((resolve) => setTimeout(resolve, STEP_MS));
    inFlight -= 1;
    return answer(request);
  };
  return { http, maxInFlight: () => max, requests };
}

function answer(request: HttpRequest): HttpResponse {
  if (request.url.endsWith('/graphql')) {
    const body = String(request.body);
    const data = body.includes('workspaces') ? { workspaces: [{ id: 'w1' }] } : { workspace: { doc: { createdBy: { name: 'Ada', avatarUrl: null }, lastUpdatedBy: null } } };
    return { status: 200, headers: new Map(), setCookie: [], body: JSON.stringify({ data }) };
  }
  const bin = request.url.endsWith('/docs/w1') ? rootBin() : request.url.includes('db%24') || request.url.includes('db$') ? new Uint8Array() : pageBin();
  return bin.byteLength === 0 ? { status: 404, headers: new Map(), setCookie: [], body: '' } : { status: 200, headers: new Map(), setCookie: [], body: '', bodyBytes: bin };
}

function client(http: HttpClient): AffineClient {
  return new AffineClient({ serverUrl: SERVER, clientVersion: '0.26.0', http, credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 't' } });
}

describe('AffineClient speed', () => {
  it('fetches the workspace root and the folders document at the same time', async () => {
    const timed = timedHttp();
    const pages = await client(timed.http).listWorkspacePages('w1');
    expect(pages.documents.map((doc) => doc.id)).toEqual(['doc1']);
    expect(timed.maxInFlight()).toBe(2);
  });

  it('fetches a page and its authors at the same time', async () => {
    const timed = timedHttp();
    await client(timed.http).loadPagePreview('w1', 'doc1');
    expect(timed.maxInFlight()).toBeGreaterThanOrEqual(2);
  });

  it('still returns the page when the authors cannot be loaded', async () => {
    let calls = 0;
    const http: HttpClient = (request) => {
      calls += 1;
      return Promise.resolve(request.url.endsWith('/graphql') ? { status: 500, headers: new Map(), setCookie: [], body: '' } : answer(request));
    };
    const preview = await client(http).loadPagePreview('w1', 'doc1');
    expect(preview.page.title).toBe('Doc');
    expect(preview.createdBy).toBeUndefined();
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
