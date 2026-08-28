import * as Y from 'yjs';
import { parseTrashedPages, parseWorkspaceRoot } from './parse-workspace-root';

interface EncodeRootPageInput {
  readonly id: string;
  readonly title?: string;
  readonly trash?: boolean;
  readonly favorite?: boolean;
  readonly tags?: readonly string[];
  readonly titleAsText?: boolean;
  readonly parentId?: string;
  readonly subpageIds?: readonly string[];
}

interface EncodeRootInput {
  readonly name?: string;
  readonly pages: readonly EncodeRootPageInput[];
}

function encodeRoot(input: EncodeRootInput): Uint8Array {
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  if (input.name !== undefined) {
    meta.set('name', input.name);
  }
  const pages = new Y.Array<Y.Map<unknown>>();
  for (const page of input.pages) {
    const item = new Y.Map<unknown>();
    item.set('id', page.id);
    if (page.titleAsText === true && page.title !== undefined) {
      const text = new Y.Text();
      text.insert(0, page.title);
      item.set('title', text);
    } else if (page.title !== undefined) {
      item.set('title', page.title);
    }
    if (page.trash === true) {
      item.set('trash', true);
    }
    if (page.favorite === true) {
      item.set('favorite', true);
    }
    if (page.tags !== undefined) {
      const tags = new Y.Array<string>();
      tags.insert(0, [...page.tags]);
      item.set('tags', tags);
    }
    if (page.parentId !== undefined) {
      item.set('parentId', page.parentId);
    }
    if (page.subpageIds !== undefined) {
      const subpageIds = new Y.Array<string>();
      subpageIds.insert(0, [...page.subpageIds]);
      item.set('subpageIds', subpageIds);
    }
    pages.push([item]);
  }
  meta.set('pages', pages);
  return Y.encodeStateAsUpdate(doc);
}

describe('parseWorkspaceRoot', () => {
  it('reads the workspace name and page titles', () => {
    const bin = encodeRoot({
      name: 'MasteryHub',
      pages: [
        { id: 'page-1', title: 'Roadmap' },
        { id: 'page-2', title: '  Spec  ' },
      ],
    });

    expect(parseWorkspaceRoot(bin)).toEqual({
      name: 'MasteryHub',
      pages: [
        { id: 'page-1', title: 'Roadmap', parentId: null, subpageIds: [] },
        { id: 'page-2', title: 'Spec', parentId: null, subpageIds: [] },
      ],
    });
  });

  it('reads page parent and subpage ids', () => {
    const bin = encodeRoot({
      pages: [
        { id: 'parent', title: 'Handbook', subpageIds: ['child'] },
        { id: 'child', title: 'API', parentId: 'parent' },
      ],
    });

    expect(parseWorkspaceRoot(bin)).toEqual({
      name: null,
      pages: [
        { id: 'parent', title: 'Handbook', parentId: null, subpageIds: ['child'] },
        { id: 'child', title: 'API', parentId: 'parent', subpageIds: [] },
      ],
    });
  });

  it('drops trashed pages and pages without an id', () => {
    const bin = encodeRoot({
      pages: [
        { id: 'keep', title: 'Keep' },
        { id: 'gone', title: 'Gone', trash: true },
        { id: '', title: 'No id' },
      ],
    });

    expect(parseWorkspaceRoot(bin)).toEqual({
      name: null,
      pages: [{ id: 'keep', title: 'Keep', parentId: null, subpageIds: [] }],
    });
  });

  it('reads a Y.Text title', () => {
    const bin = encodeRoot({
      pages: [{ id: 'page-1', title: 'From text', titleAsText: true }],
    });

    expect(parseWorkspaceRoot(bin)).toEqual({
      name: null,
      pages: [{ id: 'page-1', title: 'From text', parentId: null, subpageIds: [] }],
    });
  });

  it('returns an empty catalog for an empty document', () => {
    const doc = new Y.Doc();
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(doc))).toEqual({ name: null, pages: [] });
  });
});

describe('parseTrashedPages', () => {
  it('returns only pages marked trash', () => {
    const bin = encodeRoot({
      pages: [
        { id: 'keep', title: 'Keep' },
        { id: 'gone', title: 'Gone', trash: true },
      ],
    });
    expect(parseTrashedPages(bin)).toEqual([{ id: 'gone', title: 'Gone', parentId: null, subpageIds: [] }]);
  });

  it('returns an empty list when nothing is trashed', () => {
    const bin = encodeRoot({ pages: [{ id: 'keep', title: 'Keep' }] });
    expect(parseTrashedPages(bin)).toEqual([]);
  });
});

describe('favorites and tags', () => {
  it('reads favorite and tag metadata on pages', () => {
    const bin = encodeRoot({
      pages: [{ id: 'page-1', title: 'Pinned spec', favorite: true, tags: ['docs'] }],
    });
    expect(parseWorkspaceRoot(bin).pages).toEqual([{ id: 'page-1', title: 'Pinned spec', parentId: null, subpageIds: [], favorite: true, tags: ['docs'] }]);
  });
});
