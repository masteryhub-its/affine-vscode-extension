import type { AffineWorkspacePages } from '../client/affine.types';
import type { LoadedWorkspace } from './load-workspaces';
import { PagesCache, type SnapshotStore } from './pages-cache';
import { toSnapshot, type TreeSnapshot } from './tree-snapshot';

const CONTEXT = { serverUrl: 'https://affine.example', accountKey: 'acct' };

function space(name: string): readonly LoadedWorkspace[] {
  const pages: AffineWorkspacePages = { name, documents: [], tree: [], favorites: [], collections: [] };
  return [{ workspace: { id: 'w1' }, pages }];
}

class MemoryStore implements SnapshotStore {
  public value: unknown;
  public writes: TreeSnapshot[] = [];
  public failWrites = false;

  public read(): unknown {
    return this.value;
  }

  public write(snapshot: TreeSnapshot): Promise<void> {
    if (this.failWrites) {
      return Promise.reject(new Error('disk full'));
    }
    this.writes.push(snapshot);
    this.value = JSON.parse(JSON.stringify(snapshot));
    return Promise.resolve();
  }

  public clear(): Promise<void> {
    this.value = undefined;
    return Promise.resolve();
  }
}

interface Deferred {
  readonly promise: Promise<readonly LoadedWorkspace[]>;
  resolve(value: readonly LoadedWorkspace[]): void;
  reject(error: Error): void;
}

function deferred(): Deferred {
  let resolve!: (value: readonly LoadedWorkspace[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<readonly LoadedWorkspace[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Harness {
  readonly cache: PagesCache;
  readonly store: MemoryStore;
  readonly refreshed: number[];
  readonly failures: string[];
}

function harness(store: MemoryStore = new MemoryStore()): Harness {
  const refreshed: number[] = [];
  const failures: string[] = [];
  const cache = new PagesCache({
    store,
    now: () => 1000,
    onRefreshed: () => refreshed.push(1),
    onRefreshFailed: (message) => failures.push(message),
  });
  return { cache, store, refreshed, failures };
}

describe('PagesCache', () => {
  it('loads from the network the first time and saves what it got', async () => {
    const { cache, store } = harness();
    const result = await cache.read(CONTEXT, () => Promise.resolve(space('One')));
    expect(result.source).toBe('network');
    expect(result.workspaces[0]?.pages.name).toBe('One');
    expect(store.writes).toHaveLength(1);
  });

  it('answers from memory afterwards without asking the network again', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(space('One')));
    let loads = 0;
    const second = await cache.read(CONTEXT, () => {
      loads += 1;
      return Promise.resolve(space('Two'));
    });
    expect(second.source).toBe('memory');
    expect(second.workspaces[0]?.pages.name).toBe('One');
    expect(loads).toBe(0);
  });

  it('after a restart, shows the saved tree at once and refreshes in the background', async () => {
    const store = new MemoryStore();
    store.value = JSON.parse(JSON.stringify(toSnapshot(CONTEXT.serverUrl, CONTEXT.accountKey, space('Saved'), 1)));
    const { cache, refreshed } = harness(store);
    const fresh = deferred();
    const result = await cache.read(CONTEXT, () => fresh.promise);
    expect(result.source).toBe('saved');
    expect(result.workspaces[0]?.pages.name).toBe('Saved');
    expect(refreshed).toHaveLength(0);
    fresh.resolve(space('Newer'));
    await flush();
    expect(refreshed).toHaveLength(1);
    const next = await cache.read(CONTEXT, () => Promise.reject(new Error('should not be called')));
    expect(next.source).toBe('memory');
    expect(next.workspaces[0]?.pages.name).toBe('Newer');
    expect(store.writes.at(-1)?.workspaces[0]?.pages.name).toBe('Newer');
  });

  it('does not announce a refresh when nothing changed', async () => {
    const store = new MemoryStore();
    store.value = JSON.parse(JSON.stringify(toSnapshot(CONTEXT.serverUrl, CONTEXT.accountKey, space('Same'), 1)));
    const { cache, refreshed } = harness(store);
    await cache.read(CONTEXT, () => Promise.resolve(space('Same')));
    await flush();
    expect(refreshed).toHaveLength(0);
  });

  it('keeps the saved tree and says why when the refresh fails', async () => {
    const store = new MemoryStore();
    store.value = JSON.parse(JSON.stringify(toSnapshot(CONTEXT.serverUrl, CONTEXT.accountKey, space('Saved'), 1)));
    const { cache, failures } = harness(store);
    await cache.read(CONTEXT, () => Promise.reject(new Error('Cannot reach the server')));
    await flush();
    expect(failures).toEqual(['Cannot reach the server']);
    const again = await cache.read(CONTEXT, () => Promise.reject(new Error('Cannot reach the server')));
    expect(again.workspaces[0]?.pages.name).toBe('Saved');
  });

  it('starts only one refresh however many times it is read meanwhile', async () => {
    const store = new MemoryStore();
    store.value = JSON.parse(JSON.stringify(toSnapshot(CONTEXT.serverUrl, CONTEXT.accountKey, space('Saved'), 1)));
    const { cache } = harness(store);
    const fresh = deferred();
    let loads = 0;
    const load = (): Promise<readonly LoadedWorkspace[]> => {
      loads += 1;
      return fresh.promise;
    };
    await cache.read(CONTEXT, load);
    cache.invalidate();
    await cache.read(CONTEXT, load);
    expect(loads).toBe(1);
    fresh.resolve(space('Saved'));
    await flush();
  });

  it('invalidate forgets memory, so the next read shows the saved tree and refreshes again', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(space('One')));
    cache.invalidate();
    const fresh = deferred();
    const result = await cache.read(CONTEXT, () => fresh.promise);
    expect(result.source).toBe('saved');
    fresh.resolve(space('One'));
    await flush();
  });

  it('reset forgets the saved tree as well, so the next read waits for the network', async () => {
    const { cache, store } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(space('One')));
    await cache.reset();
    expect(store.value).toBeUndefined();
    const result = await cache.read(CONTEXT, () => Promise.resolve(space('Two')));
    expect(result.source).toBe('network');
    expect(result.workspaces[0]?.pages.name).toBe('Two');
  });

  it('never shows one account’s tree to another account or server', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(space('Mine')));
    const other = await cache.read({ serverUrl: CONTEXT.serverUrl, accountKey: 'someone-else' }, () => Promise.resolve(space('Theirs')));
    expect(other.source).toBe('network');
    expect(other.workspaces[0]?.pages.name).toBe('Theirs');
    const elsewhere = await cache.read({ serverUrl: 'https://other.example', accountKey: 'acct' }, () => Promise.resolve(space('Elsewhere')));
    expect(elsewhere.source).toBe('network');
  });

  it('ignores the answer of a refresh that was started before a reset', async () => {
    const store = new MemoryStore();
    store.value = JSON.parse(JSON.stringify(toSnapshot(CONTEXT.serverUrl, CONTEXT.accountKey, space('Saved'), 1)));
    const { cache, refreshed } = harness(store);
    const stale = deferred();
    await cache.read(CONTEXT, () => stale.promise);
    await cache.reset();
    stale.resolve(space('From before the reset'));
    await flush();
    expect(refreshed).toHaveLength(0);
    expect(store.value).toBeUndefined();
  });

  it('still returns the data when saving it fails', async () => {
    const store = new MemoryStore();
    store.failWrites = true;
    const { cache } = harness(store);
    const result = await cache.read(CONTEXT, () => Promise.resolve(space('One')));
    expect(result.workspaces[0]?.pages.name).toBe('One');
  });

  it('passes a failure on when there is no saved tree to fall back to', async () => {
    const { cache } = harness();
    await expect(cache.read(CONTEXT, () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });
});
