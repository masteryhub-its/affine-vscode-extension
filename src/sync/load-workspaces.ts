import type { AffineWorkspace, AffineWorkspacePages } from '../client/affine.types';

export interface WorkspacePagesLoader {
  listWorkspacePages(workspaceId: string): Promise<AffineWorkspacePages>;
}

export interface LoadedWorkspace {
  readonly workspace: AffineWorkspace;
  readonly pages: AffineWorkspacePages;
}

/** Loads every workspace's pages at once, in the original order, because one workspace never waits on another. */
export function loadAllWorkspacePages(loader: WorkspacePagesLoader, workspaces: readonly AffineWorkspace[]): Promise<readonly LoadedWorkspace[]> {
  return Promise.all(workspaces.map(async (workspace) => ({ workspace, pages: await loader.listWorkspacePages(workspace.id) })));
}
