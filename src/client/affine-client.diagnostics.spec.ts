import { AffineClient } from './affine-client';
import type { HttpClient, HttpResponse } from './http.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

const SERVER = 'https://affine.test';

function json(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

describe('AffineClient diagnostics', () => {
  it('tells the caller when the workspace root cannot be read and the document list is used instead', async () => {
    const http: HttpClient = (request) => {
      if (request.url.endsWith('/graphql')) {
        return Promise.resolve(
          json(200, {
            data: {
              workspace: { id: 'w1', docs: { edges: [{ cursor: 'c', node: { id: 'd1', workspaceId: 'w1', title: 'Doc', updatedAt: null } }], pageInfo: { hasNextPage: false, endCursor: null } } },
            },
          })
        );
      }
      return Promise.resolve(json(500, {}));
    };
    const notes: string[] = [];
    const client = new AffineClient({
      serverUrl: SERVER,
      clientVersion: '0.26.0',
      http,
      credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 't' },
      onDiagnostic: (message) => notes.push(message),
    });
    const pages = await client.listWorkspacePages('w1');
    expect(pages.documents.map((doc) => doc.id)).toEqual(['d1']);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('w1');
    expect(notes[0]).toContain('HTTP 500');
  });
});
