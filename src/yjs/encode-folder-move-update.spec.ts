import * as Y from 'yjs';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { encodeFolderMoveUpdate } from './encode-folder-move-update';
import { parseFoldersTable } from './parse-folders-table';

interface EncodeFolderRow {
  readonly id: string;
  readonly parentId?: string;
  readonly type: string;
  readonly data: string;
  readonly index: string;
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
  }
  return Y.encodeStateAsUpdate(doc);
}

describe('encodeFolderMoveUpdate', () => {
  it('moves an existing doc link into another folder', () => {
    const bin = encodeFolders([
      { id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
      { id: 'f2', type: PageTreeKind.FOLDER, data: 'Specs', index: 'a1' },
      { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'page-1', index: 'a0' },
    ]);

    const update = encodeFolderMoveUpdate({
      bin,
      docId: 'page-1',
      parentId: 'f2',
      index: 'b0',
      newRecordId: 'unused',
    });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toEqual([
      { id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
      { id: 'f2', parentId: null, type: PageTreeKind.FOLDER, data: 'Specs', index: 'a1' },
      { id: 'l1', parentId: 'f2', type: PageTreeKind.DOC, data: 'page-1', index: 'b0' },
    ]);
  });

  it('creates a doc link when the page is unfiled', () => {
    const bin = encodeFolders([{ id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' }]);
    const update = encodeFolderMoveUpdate({
      bin,
      docId: 'page-1',
      parentId: 'f1',
      index: 'a1',
      newRecordId: 'l-new',
    });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toContainEqual({
      id: 'l-new',
      parentId: 'f1',
      type: PageTreeKind.DOC,
      data: 'page-1',
      index: 'a1',
    });
  });

  it('unfiles a page by deleting its organize link', () => {
    const bin = encodeFolders([
      { id: 'f1', type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' },
      { id: 'l1', parentId: 'f1', type: PageTreeKind.DOC, data: 'page-1', index: 'a0' },
    ]);
    const update = encodeFolderMoveUpdate({
      bin,
      docId: 'page-1',
      parentId: null,
      index: 'a0',
      newRecordId: 'unused',
    });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toEqual([{ id: 'f1', parentId: null, type: PageTreeKind.FOLDER, data: 'Product', index: 'a0' }]);
  });
});
