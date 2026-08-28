import { folderQuickPickItems, isRestoreConfirmed, isTrashConfirmed, RESTORE_CONFIRM_ACTION, TRASH_CONFIRM_ACTION } from './organize-actions';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageTreeNode } from '../yjs/page-tree';

const tree: readonly PageTreeNode[] = [
  {
    kind: PageTreeKind.FOLDER,
    id: 'f1',
    title: 'Product',
    children: [{ kind: PageTreeKind.FOLDER, id: 'f2', title: 'Specs', children: [] }],
  },
  { kind: PageTreeKind.DOC, id: 'd1', title: 'Notes', children: [] },
];

describe('isTrashConfirmed', () => {
  it('accepts only the trash action label', () => {
    expect(isTrashConfirmed(TRASH_CONFIRM_ACTION)).toBe(true);
    expect(isTrashConfirmed(undefined)).toBe(false);
    expect(isTrashConfirmed('Cancel')).toBe(false);
  });
});

describe('isRestoreConfirmed', () => {
  it('accepts only the restore action label', () => {
    expect(isRestoreConfirmed(RESTORE_CONFIRM_ACTION)).toBe(true);
    expect(isRestoreConfirmed(undefined)).toBe(false);
    expect(isRestoreConfirmed('Cancel')).toBe(false);
  });
});

describe('folderQuickPickItems', () => {
  it('starts with workspace root then nested organize folders', () => {
    expect(folderQuickPickItems(tree)).toEqual([
      { label: 'Workspace root', folderId: null },
      { label: 'Product', folderId: 'f1' },
      { label: 'Product / Specs', folderId: 'f2' },
    ]);
  });
});
