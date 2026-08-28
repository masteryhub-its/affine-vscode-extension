import type { AffineWorkspace } from '../client/affine.types';

export function resolveSearchWorkspaces(defaultWorkspaceId: string | undefined, workspaces: readonly AffineWorkspace[]): readonly AffineWorkspace[] {
  if (defaultWorkspaceId === undefined) {
    return workspaces;
  }
  const match = workspaces.filter((workspace) => workspace.id === defaultWorkspaceId);
  return match.length > 0 ? match : workspaces;
}
