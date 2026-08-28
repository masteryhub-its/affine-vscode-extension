import { findPageTreeNode, pageTreeToExplorerNodes, SIGN_IN_TREE_NODE, toDocumentNode, toFolderNode, toWorkspaceNode } from './tree-model';
import { AffineTreeKind } from '../utils/enums/affine-tree-kind.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageTreeNode } from '../yjs/page-tree';

describe('tree-model', () => {
  it('labels a workspace from its id prefix', () => {
    expect(toWorkspaceNode({ id: 'abcdefghij' })).toEqual({
      kind: AffineTreeKind.WORKSPACE,
      id: 'abcdefghij',
      label: 'Workspace abcdefgh',
    });
  });

  it('labels a document from its title', () => {
    expect(toDocumentNode({ id: 'd1', workspaceId: 'ws', title: ' Spec ', updatedAt: null })).toEqual({
      kind: AffineTreeKind.DOCUMENT,
      id: 'ws:d1',
      workspaceId: 'ws',
      docId: 'd1',
      label: 'Spec',
    });
  });

  it('labels a folder from the page-tree node', () => {
    expect(toFolderNode('ws', { kind: PageTreeKind.FOLDER, id: 'f1', title: 'Product', children: [] })).toEqual({
      kind: AffineTreeKind.FOLDER,
      id: 'ws:folder:f1',
      workspaceId: 'ws',
      folderId: 'f1',
      label: 'Product',
    });
  });

  it('maps organize folders and docs to explorer nodes', () => {
    const tree: readonly PageTreeNode[] = [
      {
        kind: PageTreeKind.FOLDER,
        id: 'f1',
        title: 'Product',
        children: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] }],
      },
      { kind: PageTreeKind.DOC, id: 'd2', title: 'Notes', children: [] },
    ];

    expect(pageTreeToExplorerNodes('ws', tree)).toEqual([
      { kind: AffineTreeKind.FOLDER, id: 'ws:folder:f1', workspaceId: 'ws', folderId: 'f1', label: 'Product' },
      { kind: AffineTreeKind.DOCUMENT, id: 'ws:d2', workspaceId: 'ws', docId: 'd2', label: 'Notes' },
    ]);
  });

  it('finds a nested page-tree node by id', () => {
    const tree: readonly PageTreeNode[] = [
      {
        kind: PageTreeKind.FOLDER,
        id: 'f1',
        title: 'Product',
        children: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] }],
      },
    ];

    expect(findPageTreeNode(tree, 'd1')).toEqual({ kind: PageTreeKind.DOC, id: 'd1', title: 'Roadmap', children: [] });
    expect(findPageTreeNode(tree, 'missing')).toBeUndefined();
  });

  it('exposes a sign-in action for the empty sidebar', () => {
    expect(SIGN_IN_TREE_NODE).toEqual({
      kind: AffineTreeKind.ACTION,
      id: 'signIn',
      label: 'Sign in to AFFiNE',
    });
  });
});
