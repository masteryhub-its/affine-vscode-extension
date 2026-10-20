import type { AffineWorkspacePages } from '../client/affine.types';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { LoadedWorkspace } from './load-workspaces';
import { accountKeyOf, parseSnapshot, toSnapshot } from './tree-snapshot';

const SERVER = 'https://affine.example';

function pages(name: string): AffineWorkspacePages {
  return {
    name,
    documents: [{ id: 'd1', workspaceId: 'w1', title: 'Doc', updatedAt: null }],
    tree: [{ kind: PageTreeKind.FOLDER, id: 'f1', title: 'Folder', children: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Doc', children: [] }] }],
    favorites: [],
    collections: [],
  };
}

const loaded: readonly LoadedWorkspace[] = [{ workspace: { id: 'w1' }, pages: pages('Space') }];

describe('accountKeyOf', () => {
  it('is the same for the same credential and different for another', () => {
    const token = { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'secret-one' } as const;
    expect(accountKeyOf(token)).toBe(accountKeyOf({ ...token }));
    expect(accountKeyOf(token)).not.toBe(accountKeyOf({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'secret-two' }));
  });

  it('covers a session cookie too', () => {
    const one = accountKeyOf({ kind: AffineCredentialKind.SESSION, cookieHeader: 'a=1', csrfToken: undefined });
    const two = accountKeyOf({ kind: AffineCredentialKind.SESSION, cookieHeader: 'a=2', csrfToken: undefined });
    expect(one).not.toBe(two);
  });

  it('does not contain the secret, so it is safe to store', () => {
    const key = accountKeyOf({ kind: AffineCredentialKind.ACCESS_TOKEN, token: 'secret-one' });
    expect(key).not.toContain('secret');
    expect(key).toMatch(/^[0-9a-f]{64}$/u);
  });
});

describe('snapshots', () => {
  it('round-trips through JSON for the same server and account', () => {
    const stored = JSON.parse(JSON.stringify(toSnapshot(SERVER, 'acct', loaded, 1000))) as unknown;
    expect(parseSnapshot(stored, SERVER, 'acct')).toEqual({ version: 1, savedAt: 1000, serverUrl: SERVER, accountKey: 'acct', workspaces: loaded });
  });

  it('is not used for another server, which could be a different organisation', () => {
    const stored = toSnapshot(SERVER, 'acct', loaded, 1);
    expect(parseSnapshot(stored, 'https://other.example', 'acct')).toBeUndefined();
  });

  it('is not used for another account on the same server', () => {
    const stored = toSnapshot(SERVER, 'acct', loaded, 1);
    expect(parseSnapshot(stored, SERVER, 'someone-else')).toBeUndefined();
  });

  it.each([
    undefined,
    null,
    'text',
    5,
    [],
    {},
    { version: 2 },
    { version: 1, serverUrl: SERVER, accountKey: 'acct', savedAt: 1 },
    { version: 1, serverUrl: SERVER, accountKey: 'acct', savedAt: 1, workspaces: 'no' },
  ])('ignores a stored value that is not a snapshot: %j', (value) => {
    expect(parseSnapshot(value, SERVER, 'acct')).toBeUndefined();
  });

  it('ignores a snapshot whose page tree is damaged, instead of crashing the view', () => {
    const damaged = JSON.parse(JSON.stringify(toSnapshot(SERVER, 'acct', loaded, 1))) as { workspaces: { pages: { tree: unknown[] } }[] };
    damaged.workspaces[0]?.pages.tree.push({ kind: 'folder', id: 5, title: 'bad', children: [] });
    expect(parseSnapshot(damaged, SERVER, 'acct')).toBeUndefined();
  });

  it('ignores a snapshot with a workspace that has no id', () => {
    const damaged = JSON.parse(JSON.stringify(toSnapshot(SERVER, 'acct', loaded, 1))) as { workspaces: { workspace: { id?: unknown } }[] };
    const first = damaged.workspaces[0];
    if (first !== undefined) {
      first.workspace.id = 7;
    }
    expect(parseSnapshot(damaged, SERVER, 'acct')).toBeUndefined();
  });
});
