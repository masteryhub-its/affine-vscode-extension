import type { AffineDocument, AffineWorkspace, AffineWorkspacePages } from '../client/affine.types';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageTreeNode } from '../yjs/page-tree';

export const CATALOG_SMOKE_DOC_COUNT = 250;
export const COLD_SYNC_BUDGET_MS = 2000;

export interface CatalogSmokeInput {
  readonly workspaceId: string;
  readonly name: string;
  readonly docCount: number;
}

export interface CatalogSmokeClient {
  listWorkspaces(): Promise<readonly AffineWorkspace[]>;
  listAllDocs(workspaceId: string): Promise<readonly AffineDocument[]>;
  listWorkspacePages(workspaceId: string): Promise<AffineWorkspacePages>;
}

const FOLDER_SIZE = 10;

function documentId(index: number): string {
  return `doc-${String(index).padStart(4, '0')}`;
}

function folderId(index: number): string {
  return `folder-${String(index).padStart(3, '0')}`;
}

interface CatalogSmokeTree {
  readonly documents: readonly AffineDocument[];
  readonly tree: readonly PageTreeNode[];
}

function buildTree(workspaceId: string, docCount: number): CatalogSmokeTree {
  const documents: AffineDocument[] = [];
  const folders: PageTreeNode[] = [];
  let currentDocs: PageTreeNode[] = [];
  let folderIndex = 0;
  for (let index = 0; index < docCount; index += 1) {
    const id = documentId(index);
    documents.push({ id, workspaceId, title: `Page ${index + 1}`, updatedAt: '1', tags: [] });
    currentDocs.push({ kind: PageTreeKind.DOC, id, title: `Page ${index + 1}`, children: [] });
    if (currentDocs.length === FOLDER_SIZE || index === docCount - 1) {
      folders.push({ kind: PageTreeKind.FOLDER, id: folderId(folderIndex), title: `Folder ${folderIndex + 1}`, children: currentDocs });
      folderIndex += 1;
      currentDocs = [];
    }
  }
  return { documents, tree: folders };
}

export function createCatalogSmokeClient(input: CatalogSmokeInput): CatalogSmokeClient {
  const built = buildTree(input.workspaceId, input.docCount);
  const pages: AffineWorkspacePages = {
    name: input.name,
    documents: built.documents,
    tree: built.tree,
    favorites: built.documents.slice(0, 3),
    collections: [{ id: 'col-1', title: 'Specs', docIds: built.documents.slice(0, 3).map((document) => document.id) }],
  };
  return {
    listWorkspaces: () => Promise.resolve([{ id: input.workspaceId }]),
    listAllDocs: () => Promise.resolve(built.documents),
    listWorkspacePages: () => Promise.resolve(pages),
  };
}
