import * as Y from 'yjs';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { buildPageTree, collectFolderPicks } from './page-tree';
import { parseFoldersTable } from './parse-folders-table';
import { OrganizeRecordType } from '../utils/enums/organize-record-type.enum';

interface EncodeFolderRow {
  readonly id: string;
  readonly parentId?: string;
  readonly type: string;
  readonly data: string;
  readonly index: string;
  readonly deleted?: boolean;
}

function encodeFolders(rows: readonly EncodeFolderRow[]): Uint8Array {
  const doc = new Y.Doc();
  for (const row of rows) {
    const record = doc.getMap(row.id);
    record.set('id', row.id);
    if (row.parentId !== undefined) {
      record.set('parentId', row.parentId);
    }
    record.set('type', row.type);
    record.set('data', row.data);
    record.set('index', row.index);
    if (row.deleted === true) {
      record.set('$$DELETED', true);
    }
  }
  return Y.encodeStateAsUpdate(doc);
}

describe('parseFoldersTable', () => {
  it('reads folder and doc records and skips deleted rows', () => {
    const bin = encodeFolders([
      { id: 'f1', type: PageTreeKind.FOLDER, data: 'Specs', index: 'a0' },
      { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'page-1', index: 'a1' },
      { id: 'gone', type: PageTreeKind.FOLDER, data: 'Trash folder', index: 'a2', deleted: true },
    ]);
    expect(parseFoldersTable(bin)).toEqual([
      { id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Specs', index: 'a0' },
      { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'page-1', index: 'a1' },
    ]);
  });

  it('ignores non-map share types in the folders document', () => {
    const doc = new Y.Doc();
    const record = doc.getMap('f1');
    record.set('id', 'f1');
    record.set('type', PageTreeKind.FOLDER);
    record.set('data', 'Product');
    record.set('index', 'a0');
    doc.getArray('not-a-row').insert(0, ['x']);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toEqual([{ id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' }]);
  });
});

describe('buildPageTree', () => {
  it('nests docs under AFFiNE organize folders and keeps unfiled pages at the root', () => {
    const tree = buildPageTree({
      pages: [
        { id: 'page-1', title: 'Roadmap', parentId: null, subpageIds: [] },
        { id: 'page-2', title: 'Notes', parentId: null, subpageIds: [] },
      ],
      folders: [
        { id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a1' },
        { id: 'f2', parentId: 'f1', type: PageTreeKind.FOLDER, data: 'Specs', index: 'a0' },
        { id: 'l1', parentId: 'f2', type: PageTreeKind.DOC, data: 'page-1', index: 'a0' },
      ],
    });

    expect(tree).toEqual([
      {
        kind: PageTreeKind.FOLDER,
        id: 'f1',
        title: 'Product',
        children: [
          {
            kind: PageTreeKind.FOLDER,
            id: 'f2',
            title: 'Specs',
            children: [{ kind: PageTreeKind.DOC, id: 'page-1', title: 'Roadmap', children: [] }],
          },
        ],
      },
      { kind: PageTreeKind.DOC, id: 'page-2', title: 'Notes', children: [] },
    ]);
  });

  it('omits organize docs that are not in the live page list', () => {
    const tree = buildPageTree({
      pages: [{ id: 'page-1', title: 'Roadmap', parentId: null, subpageIds: [] }],
      folders: [
        { id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
        { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'trashed', index: 'a0' },
        { id: 'l2', parentId: 'f1', type: PageTreeKind.DOC, data: 'page-1', index: 'a1' },
      ],
    });

    expect(tree).toEqual([
      {
        kind: PageTreeKind.FOLDER,
        id: 'f1',
        title: 'Product',
        children: [{ kind: PageTreeKind.DOC, id: 'page-1', title: 'Roadmap', children: [] }],
      },
    ]);
  });

  it('ignores tag and collection rows in the organize table', () => {
    const tree = buildPageTree({
      pages: [{ id: 'page-1', title: 'Roadmap', parentId: null, subpageIds: [] }],
      folders: [
        { id: 't1', parentId: null, type: OrganizeRecordType.TAG, data: 'tag-1', index: 'a0' },
        { id: 'c1', parentId: null, type: OrganizeRecordType.COLLECTION, data: 'col-1', index: 'a1' },
      ],
    });

    expect(tree).toEqual([{ kind: PageTreeKind.DOC, id: 'page-1', title: 'Roadmap', children: [] }]);
  });

  it('lists folders for a move picker, including nested paths', () => {
    const tree = buildPageTree({
      pages: [{ id: 'page-1', title: 'Roadmap', parentId: null, subpageIds: [] }],
      folders: [
        { id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a1' },
        { id: 'f2', parentId: 'f1', type: PageTreeKind.FOLDER, data: 'Specs', index: 'a0' },
        { id: 'l1', parentId: 'f2', type: PageTreeKind.DOC, data: 'page-1', index: 'a0' },
      ],
    });
    expect(collectFolderPicks(tree)).toEqual([
      { id: null, label: 'Workspace root' },
      { id: 'f1', label: 'Product' },
      { id: 'f2', label: 'Product / Specs' },
    ]);
  });

  it('falls back to page parent/subpage nesting when there is no organize table', () => {
    const tree = buildPageTree({
      pages: [
        { id: 'parent', title: 'Handbook', parentId: null, subpageIds: ['child'] },
        { id: 'child', title: 'API', parentId: 'parent', subpageIds: [] },
      ],
      folders: [],
    });

    expect(tree).toEqual([
      {
        kind: PageTreeKind.DOC,
        id: 'parent',
        title: 'Handbook',
        children: [{ kind: PageTreeKind.DOC, id: 'child', title: 'API', children: [] }],
      },
    ]);
  });
});
