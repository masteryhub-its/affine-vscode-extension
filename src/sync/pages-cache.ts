import type { LoadedWorkspace } from './load-workspaces';
import { parseSnapshot, toSnapshot, type TreeSnapshot } from './tree-snapshot';

export interface SnapshotStore {
  /** The raw stored value; it is checked before use, so anything may come back. */
  read(): unknown;
  write(snapshot: TreeSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheContext {
  readonly serverUrl: string;
  readonly accountKey: string;
}

export type PagesSource = 'memory' | 'saved' | 'network';

export interface PagesResult {
  readonly workspaces: readonly LoadedWorkspace[];
  readonly source: PagesSource;
}

export interface PagesCacheOptions {
  readonly store: SnapshotStore;
  readonly now: () => number;
  /** Called when a background refresh found something different from what was shown. */
  readonly onRefreshed: () => void;
  /** Called when a background refresh failed; the older tree stays on screen. */
  readonly onRefreshFailed: (message: string) => void;
}

type LoadFresh = () => Promise<readonly LoadedWorkspace[]>;

interface Held {
  readonly context: CacheContext;
  readonly workspaces: readonly LoadedWorkspace[];
  readonly fingerprint: string;
}

function sameContext(left: CacheContext, right: CacheContext): boolean {
  return left.serverUrl === right.serverUrl && left.accountKey === right.accountKey;
}

/**
 * Keeps the pages tree in three layers: memory, a saved copy on disk, and the network. A read answers from the
 * fastest layer that has data for this account. When it answers from the saved copy it refreshes from the network in
 * the background and tells the caller if anything changed, so the view appears at once and then corrects itself.
 * A saved copy is only ever used for the same server and the same account.
 */
export class PagesCache {
  private held: Held | undefined;
  private refreshing = false;
  private generation = 0;

  public constructor(private readonly options: PagesCacheOptions) {}

  public async read(context: CacheContext, loadFresh: LoadFresh): Promise<PagesResult> {
    if (this.held !== undefined && sameContext(this.held.context, context)) {
      return { workspaces: this.held.workspaces, source: 'memory' };
    }
    const snapshot = parseSnapshot(this.options.store.read(), context.serverUrl, context.accountKey);
    if (snapshot !== undefined) {
      this.hold(context, snapshot.workspaces);
      this.refreshInBackground(context, loadFresh);
      return { workspaces: snapshot.workspaces, source: 'saved' };
    }
    const workspaces = await loadFresh();
    this.hold(context, workspaces);
    await this.save(context, workspaces);
    return { workspaces, source: 'network' };
  }

  /** Forgets what is in memory; the saved copy is kept, so the next read shows it and refreshes. */
  public invalidate(): void {
    this.held = undefined;
  }

  /** Forgets everything, including the saved copy. Used when signing out or reloading from scratch. */
  public async reset(): Promise<void> {
    this.generation += 1;
    this.held = undefined;
    await this.options.store.clear();
  }

  private hold(context: CacheContext, workspaces: readonly LoadedWorkspace[]): void {
    this.held = { context, workspaces, fingerprint: JSON.stringify(workspaces) };
  }

  private async save(context: CacheContext, workspaces: readonly LoadedWorkspace[]): Promise<void> {
    try {
      await this.options.store.write(toSnapshot(context.serverUrl, context.accountKey, workspaces, this.options.now()));
    } catch {
      // Not being able to save only means the next start is not instant; the data itself is fine.
    }
  }

  private refreshInBackground(context: CacheContext, loadFresh: LoadFresh): void {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    const generation = this.generation;
    void loadFresh()
      .then(async (workspaces) => {
        if (generation !== this.generation) {
          return;
        }
        const changed = this.held?.fingerprint !== JSON.stringify(workspaces);
        this.hold(context, workspaces);
        if (changed) {
          await this.save(context, workspaces);
          this.options.onRefreshed();
        }
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          this.options.onRefreshFailed(error instanceof Error ? error.message : 'Could not refresh');
        }
      })
      .finally(() => {
        this.refreshing = false;
      });
  }
}
