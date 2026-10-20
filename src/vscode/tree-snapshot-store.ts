import type * as vscode from 'vscode';
import type { SnapshotStore } from '../sync/pages-cache';
import { TREE_SNAPSHOT_KEY, type TreeSnapshot } from '../sync/tree-snapshot';

/** Keeps the saved pages tree in the editor's own saved state, which is private to this machine and user. */
export class GlobalStateSnapshotStore implements SnapshotStore {
  public constructor(private readonly memento: vscode.Memento) {}

  public read(): unknown {
    return this.memento.get<unknown>(TREE_SNAPSHOT_KEY);
  }

  public async write(snapshot: TreeSnapshot): Promise<void> {
    await this.memento.update(TREE_SNAPSHOT_KEY, snapshot);
  }

  public async clear(): Promise<void> {
    await this.memento.update(TREE_SNAPSHOT_KEY, undefined);
  }
}
