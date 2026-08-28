import { collectFolderPicks, type PageTreeNode } from '../yjs/page-tree';

export const TRASH_CONFIRM_ACTION = 'Move to Trash';
export const RESTORE_CONFIRM_ACTION = 'Restore';

export interface FolderQuickPickItem {
  readonly label: string;
  readonly folderId: string | null;
}

export function isTrashConfirmed(choice: string | undefined): boolean {
  return choice === TRASH_CONFIRM_ACTION;
}

export function isRestoreConfirmed(choice: string | undefined): boolean {
  return choice === RESTORE_CONFIRM_ACTION;
}

export function folderQuickPickItems(tree: readonly PageTreeNode[]): readonly FolderQuickPickItem[] {
  return collectFolderPicks(tree).map((pick) => ({
    label: pick.label,
    folderId: pick.id,
  }));
}
