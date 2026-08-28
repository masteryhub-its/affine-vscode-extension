import * as Y from 'yjs';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { encodeCreateFolderUpdate } from './encode-create-folder-update';
import { parseFoldersTable } from './parse-folders-table';

function encodeFolders(): Uint8Array {
  const doc = new Y.Doc();
  const record = doc.getMap('f1');
  record.set('id', 'f1');
  record.set('type', PageTreeKind.FOLDER);
  record.set('data', 'Product');
  record.set('index', 'a0');
  return Y.encodeStateAsUpdate(doc);
}

describe('encodeCreateFolderUpdate', () => {
  it('adds a nested organize folder', () => {
    const bin = encodeFolders();
    const update = encodeCreateFolderUpdate({
      bin,
      folderId: 'f2',
      parentId: 'f1',
      title: 'Specs',
      index: 'a1',
    });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toContainEqual({
      id: 'f2',
      parentId: 'f1',
      type: PageTreeKind.FOLDER,
      data: 'Specs',
      index: 'a1',
    });
  });

  it('adds a root organize folder when parentId is null', () => {
    const bin = encodeFolders();
    const update = encodeCreateFolderUpdate({
      bin,
      folderId: 'f-root',
      parentId: null,
      title: 'Inbox',
      index: 'a2',
    });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    Y.applyUpdate(doc, update);
    expect(parseFoldersTable(Y.encodeStateAsUpdate(doc))).toContainEqual({
      id: 'f-root',
      parentId: null,
      type: PageTreeKind.FOLDER,
      data: 'Inbox',
      index: 'a2',
    });
  });
});
