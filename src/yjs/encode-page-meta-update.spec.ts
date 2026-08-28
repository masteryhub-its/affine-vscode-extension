import * as Y from 'yjs';
import { AffineError } from '../errors/affine-error';
import { encodeCreatePageMetaUpdate, encodePageMetaUpdate, encodeRenamePageUpdate, encodeRestorePageUpdate, encodeTrashPageUpdate } from './encode-page-meta-update';
import { parseTrashedPages, parseWorkspaceRoot } from './parse-workspace-root';

function encodeRoot(pages: readonly { readonly id: string; readonly title: string; readonly trash?: boolean }[]): Uint8Array {
  const doc = new Y.Doc();
  const meta = doc.getMap('meta');
  const list = new Y.Array<Y.Map<unknown>>();
  for (const page of pages) {
    const item = new Y.Map<unknown>();
    item.set('id', page.id);
    item.set('title', page.title);
    if (page.trash === true) {
      item.set('trash', true);
    }
    list.push([item]);
  }
  meta.set('pages', list);
  return Y.encodeStateAsUpdate(doc);
}

describe('encodePageMetaUpdate', () => {
  it('marks the page as trash in a follow-up Yjs update', () => {
    const bin = encodeRoot([
      { id: 'keep', title: 'Keep' },
      { id: 'gone', title: 'Gone' },
    ]);
    const update = encodePageMetaUpdate(bin, (pages) => {
      for (const page of pages) {
        if (page.get('id') === 'gone') {
          page.set('trash', true);
        }
      }
    });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    const pages = doc.getMap('meta').get('pages');
    expect(pages).toBeInstanceOf(Y.Array);
    const items = (pages as Y.Array<Y.Map<unknown>>).toArray();
    expect(items[0]?.get('trash')).toBeUndefined();
    expect(items[1]?.get('trash')).toBe(true);
  });
});

describe('encodeRestorePageUpdate', () => {
  it('clears trash on the matching page', () => {
    const bin = encodeRoot([
      { id: 'keep', title: 'Keep' },
      { id: 'gone', title: 'Gone', trash: true },
    ]);
    const update = encodeRestorePageUpdate(bin, 'gone');
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(doc)).pages.map((page) => page.id)).toEqual(['keep', 'gone']);
    expect(parseTrashedPages(Y.encodeStateAsUpdate(doc))).toEqual([]);
  });

  it('throws when the page is missing', () => {
    const bin = encodeRoot([{ id: 'keep', title: 'Keep' }]);
    expect(() => encodeRestorePageUpdate(bin, 'missing')).toThrow(AffineError);
  });
});

describe('encodeCreatePageMetaUpdate', () => {
  it('appends a page with the given title', () => {
    const bin = encodeRoot([{ id: 'keep', title: 'Keep' }]);
    const update = encodeCreatePageMetaUpdate(bin, { docId: 'new', title: 'New spec' });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(doc)).pages).toEqual([
      { id: 'keep', title: 'Keep', parentId: null, subpageIds: [] },
      { id: 'new', title: 'New spec', parentId: null, subpageIds: [] },
    ]);
  });
});

describe('encodeRenamePageUpdate', () => {
  it('updates the page title', () => {
    const bin = encodeRoot([{ id: 'p1', title: 'Old' }]);
    const update = encodeRenamePageUpdate(bin, { docId: 'p1', title: 'Renamed' });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseWorkspaceRoot(Y.encodeStateAsUpdate(doc)).pages[0]?.title).toBe('Renamed');
  });
});

describe('encodeTrashPageUpdate', () => {
  it('marks the page as trash', () => {
    const bin = encodeRoot([{ id: 'p1', title: 'Keep' }]);
    const update = encodeTrashPageUpdate(bin, 'p1');
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseTrashedPages(Y.encodeStateAsUpdate(doc)).map((page) => page.id)).toEqual(['p1']);
  });
});
