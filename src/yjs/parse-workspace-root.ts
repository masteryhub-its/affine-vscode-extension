import * as Y from 'yjs';
import type { PageTreePage } from './page-tree';

export interface WorkspaceRootMeta {
  readonly name: string | null;
  readonly pages: readonly PageTreePage[];
}

function isYMap(value: unknown): value is Y.Map<unknown> {
  return value instanceof Y.Map;
}

function isYArray(value: unknown): value is Y.Array<unknown> {
  return value instanceof Y.Array;
}

function yValueToTitle(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (value instanceof Y.Text) {
    const trimmed = value.toJSON().trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  return null;
}

function yStringArray(value: unknown): readonly string[] {
  if (!isYArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length > 0) {
      ids.push(item);
    }
  }
  return ids;
}

function yParentId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readPage(item: Y.Map<unknown>): PageTreePage | undefined {
  const id = item.get('id');
  if (typeof id !== 'string' || id.trim().length === 0) {
    return undefined;
  }
  const page: PageTreePage = {
    id,
    title: yValueToTitle(item.get('title')),
    parentId: yParentId(item.get('parentId')),
    subpageIds: yStringArray(item.get('subpageIds')),
  };
  const tags = yStringArray(item.get('tags'));
  return {
    ...page,
    ...(item.get('favorite') === true ? { favorite: true } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
}

function readPages(bin: Uint8Array, trashed: boolean): readonly PageTreePage[] {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  const pagesValue = doc.getMap('meta').get('pages');
  const pages: PageTreePage[] = [];
  if (!isYArray(pagesValue)) {
    return pages;
  }
  for (const item of pagesValue) {
    if (!isYMap(item) || (item.get('trash') === true) !== trashed) {
      continue;
    }
    const page = readPage(item);
    if (page !== undefined) {
      pages.push(page);
    }
  }
  return pages;
}

export function parseWorkspaceRoot(bin: Uint8Array): WorkspaceRootMeta {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  return {
    name: yValueToTitle(doc.getMap('meta').get('name')),
    pages: readPages(bin, false),
  };
}

export function parseTrashedPages(bin: Uint8Array): readonly PageTreePage[] {
  return readPages(bin, true);
}
