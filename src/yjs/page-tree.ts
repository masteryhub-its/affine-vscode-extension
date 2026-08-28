import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { parsePageTreeKind } from '../utils/page-tree-kind';

export interface FolderRecord {
  readonly id: string;
  readonly parentId: string | null;
  readonly type: string;
  readonly data: string;
  readonly index: string;
}

export interface PageTreeNode {
  readonly kind: PageTreeKind;
  readonly id: string;
  readonly title: string;
  readonly children: readonly PageTreeNode[];
}

export interface PageTreePage {
  readonly id: string;
  readonly title: string | null;
  readonly parentId: string | null;
  readonly subpageIds: readonly string[];
  readonly favorite?: boolean;
  readonly tags?: readonly string[];
}

export interface BuildPageTreeInput {
  readonly pages: readonly PageTreePage[];
  readonly folders: readonly FolderRecord[];
}

function untitled(title: string | null): string {
  const trimmed = title?.trim();
  return trimmed === undefined || trimmed.length === 0 ? 'Untitled' : trimmed;
}

function compareIndex(left: FolderRecord, right: FolderRecord): number {
  return left.index.localeCompare(right.index);
}

function parentKey(parentId: string | null): string {
  return parentId === null ? '' : parentId;
}

function isOrganizeRecord(record: FolderRecord): boolean {
  return parsePageTreeKind(record.type) !== undefined;
}

function isDocRecord(record: FolderRecord): boolean {
  return parsePageTreeKind(record.type) === PageTreeKind.DOC;
}

export function buildPageTree(input: BuildPageTreeInput): readonly PageTreeNode[] {
  const organize = input.folders.filter(isOrganizeRecord);
  if (organize.length > 0) {
    return buildOrganizeTree(input.pages, organize);
  }
  if (input.pages.some((page) => page.parentId !== null || page.subpageIds.length > 0)) {
    return buildSubpageTree(input.pages);
  }
  return input.pages.map((page) => ({ kind: PageTreeKind.DOC, id: page.id, title: untitled(page.title), children: [] }));
}

function buildOrganizeTree(pages: readonly PageTreePage[], records: readonly FolderRecord[]): readonly PageTreeNode[] {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const byParent = new Map<string, FolderRecord[]>();
  for (const record of records) {
    const key = parentKey(record.parentId);
    const group = byParent.get(key);
    if (group === undefined) {
      byParent.set(key, [record]);
    } else {
      group.push(record);
    }
  }
  for (const group of byParent.values()) {
    group.sort(compareIndex);
  }
  const filed = new Set(records.filter(isDocRecord).map((record) => record.data));
  const tree = (byParent.get('') ?? []).map((record) => toOrganizeNode(record, byParent, pagesById, new Set<string>())).filter((node): node is PageTreeNode => node !== undefined);
  const unfiled = pages.filter((page) => !filed.has(page.id)).map((page) => ({ kind: PageTreeKind.DOC, id: page.id, title: untitled(page.title), children: [] }));
  return [...tree, ...unfiled];
}

function toOrganizeNode(record: FolderRecord, byParent: ReadonlyMap<string, readonly FolderRecord[]>, pagesById: ReadonlyMap<string, PageTreePage>, visiting: Set<string>): PageTreeNode | undefined {
  if (isDocRecord(record)) {
    const page = pagesById.get(record.data);
    if (page === undefined) {
      return undefined;
    }
    return { kind: PageTreeKind.DOC, id: record.data, title: untitled(page.title), children: [] };
  }
  if (visiting.has(record.id)) {
    return { kind: PageTreeKind.FOLDER, id: record.id, title: untitled(record.data), children: [] };
  }
  visiting.add(record.id);
  const children = (byParent.get(record.id) ?? []).map((child) => toOrganizeNode(child, byParent, pagesById, visiting)).filter((node): node is PageTreeNode => node !== undefined);
  visiting.delete(record.id);
  return { kind: PageTreeKind.FOLDER, id: record.id, title: untitled(record.data), children };
}

function buildSubpageTree(pages: readonly PageTreePage[]): readonly PageTreeNode[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const nested = new Set<string>();
  for (const page of pages) {
    for (const childId of page.subpageIds) {
      nested.add(childId);
    }
    if (page.parentId !== null && byId.has(page.parentId)) {
      nested.add(page.id);
    }
  }
  return pages.filter((page) => !nested.has(page.id)).map((page) => toSubpageNode(page, byId, new Set<string>()));
}

function childIdsFor(page: PageTreePage, byId: ReadonlyMap<string, PageTreePage>): readonly string[] {
  if (page.subpageIds.length > 0) {
    return page.subpageIds;
  }
  const ids: string[] = [];
  for (const candidate of byId.values()) {
    if (candidate.parentId === page.id) {
      ids.push(candidate.id);
    }
  }
  return ids;
}

function toSubpageNode(page: PageTreePage, byId: ReadonlyMap<string, PageTreePage>, visiting: Set<string>): PageTreeNode {
  if (visiting.has(page.id)) {
    return { kind: PageTreeKind.DOC, id: page.id, title: untitled(page.title), children: [] };
  }
  visiting.add(page.id);
  const children = childIdsFor(page, byId)
    .map((id) => byId.get(id))
    .filter((child): child is PageTreePage => child !== undefined)
    .map((child) => toSubpageNode(child, byId, visiting));
  visiting.delete(page.id);
  return { kind: PageTreeKind.DOC, id: page.id, title: untitled(page.title), children };
}

export interface FolderPick {
  readonly id: string | null;
  readonly label: string;
}

export function collectFolderPicks(nodes: readonly PageTreeNode[]): readonly FolderPick[] {
  const picks: FolderPick[] = [{ id: null, label: 'Workspace root' }];
  collectFolders(nodes, '', picks);
  return picks;
}

function collectFolders(nodes: readonly PageTreeNode[], prefix: string, picks: FolderPick[]): void {
  for (const node of nodes) {
    if (node.kind !== PageTreeKind.FOLDER) {
      continue;
    }
    const label = prefix.length === 0 ? node.title : `${prefix} / ${node.title}`;
    picks.push({ id: node.id, label });
    collectFolders(node.children, label, picks);
  }
}
