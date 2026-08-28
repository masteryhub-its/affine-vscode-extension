import type { AffineDocument, AffineWorkspace } from '../client/affine.types';
import { documentTitle, workspaceLabel } from '../client/document-url';
import { parseAffineTreeKind } from '../utils/affine-tree-kind';
import { AffineTreeKind } from '../utils/enums/affine-tree-kind.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageTreeNode } from '../yjs/page-tree';

export { AffineTreeKind };

export interface AffineTreeWorkspaceNode {
  readonly kind: AffineTreeKind.WORKSPACE;
  readonly id: string;
  readonly label: string;
}

export interface AffineTreeFolderNode {
  readonly kind: AffineTreeKind.FOLDER;
  readonly id: string;
  readonly workspaceId: string;
  readonly folderId: string;
  readonly label: string;
}

export interface AffineTreeDocumentNode {
  readonly kind: AffineTreeKind.DOCUMENT;
  readonly id: string;
  readonly workspaceId: string;
  readonly docId: string;
  readonly label: string;
}

export interface AffineTreeActionNode {
  readonly kind: AffineTreeKind.ACTION;
  readonly id: 'signIn';
  readonly label: string;
}

export type AffineTreeNode = AffineTreeWorkspaceNode | AffineTreeFolderNode | AffineTreeDocumentNode | AffineTreeActionNode;

export const SIGN_IN_TREE_NODE: AffineTreeActionNode = {
  kind: AffineTreeKind.ACTION,
  id: 'signIn',
  label: 'Sign in to AFFiNE',
};

export function toWorkspaceNode(workspace: AffineWorkspace, name?: string | null): AffineTreeWorkspaceNode {
  return {
    kind: AffineTreeKind.WORKSPACE,
    id: workspace.id,
    label: workspaceLabel(workspace.id, name),
  };
}

export function toFolderNode(workspaceId: string, node: PageTreeNode): AffineTreeFolderNode {
  return {
    kind: AffineTreeKind.FOLDER,
    id: `${workspaceId}:${AffineTreeKind.FOLDER}:${node.id}`,
    workspaceId,
    folderId: node.id,
    label: node.title,
  };
}

export function toDocumentNode(document: AffineDocument): AffineTreeDocumentNode {
  return {
    kind: AffineTreeKind.DOCUMENT,
    id: `${document.workspaceId}:${document.id}`,
    workspaceId: document.workspaceId,
    docId: document.id,
    label: documentTitle(document.title),
  };
}

export function pageTreeToExplorerNodes(workspaceId: string, nodes: readonly PageTreeNode[]): AffineTreeNode[] {
  return nodes.map((node) => {
    if (node.kind === PageTreeKind.FOLDER) {
      return toFolderNode(workspaceId, node);
    }
    return toDocumentNode({ id: node.id, workspaceId, title: node.title, updatedAt: null });
  });
}

export function findPageTreeNode(nodes: readonly PageTreeNode[], id: string): PageTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const nested = findPageTreeNode(node.children, id);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

export function isWorkspaceNode(node: AffineTreeNode): node is AffineTreeWorkspaceNode {
  return node.kind === AffineTreeKind.WORKSPACE;
}

export function isDocumentNode(node: AffineTreeNode): node is AffineTreeDocumentNode {
  return node.kind === AffineTreeKind.DOCUMENT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDocumentNode(value: unknown): AffineTreeDocumentNode | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (parseAffineTreeKind(value['kind']) !== AffineTreeKind.DOCUMENT) {
    return undefined;
  }
  const id = value['id'];
  const workspaceId = value['workspaceId'];
  const docId = value['docId'];
  const label = value['label'];
  if (typeof id !== 'string' || typeof workspaceId !== 'string' || typeof docId !== 'string' || typeof label !== 'string') {
    return undefined;
  }
  return { kind: AffineTreeKind.DOCUMENT, id, workspaceId, docId, label };
}
