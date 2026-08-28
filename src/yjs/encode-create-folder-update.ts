import * as Y from 'yjs';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';

export interface EncodeCreateFolderUpdateInput {
  readonly bin: Uint8Array;
  readonly folderId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly index: string;
}

export function encodeCreateFolderUpdate(input: EncodeCreateFolderUpdateInput): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, input.bin);
  const vector = Y.encodeStateVector(doc);
  const record = doc.getMap(input.folderId);
  record.set('id', input.folderId);
  if (input.parentId !== null) {
    record.set('parentId', input.parentId);
  }
  record.set('type', PageTreeKind.FOLDER);
  record.set('data', input.title);
  record.set('index', input.index);
  return Y.encodeStateAsUpdate(doc, vector);
}
