import * as Y from 'yjs';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { parsePageTreeKind } from '../utils/page-tree-kind';

export interface EncodeFolderMoveUpdateInput {
  readonly bin: Uint8Array;
  readonly docId: string;
  readonly parentId: string | null;
  readonly index: string;
  readonly newRecordId: string;
}

function isYMap(value: unknown): value is Y.Map<unknown> {
  return value instanceof Y.Map;
}

function findDocRecordId(doc: Y.Doc, docId: string): string | undefined {
  for (const key of doc.share.keys()) {
    let record: Y.Map<unknown>;
    try {
      record = doc.getMap(key);
    } catch {
      continue;
    }
    if (!isYMap(record) || record.get('$$DELETED') === true) {
      continue;
    }
    const type = record.get('type');
    if (parsePageTreeKind(type) === PageTreeKind.DOC && record.get('data') === docId) {
      return key;
    }
  }
  return undefined;
}

export function encodeFolderMoveUpdate(input: EncodeFolderMoveUpdateInput): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, input.bin);
  const vector = Y.encodeStateVector(doc);
  const existingId = findDocRecordId(doc, input.docId);
  if (input.parentId === null) {
    if (existingId !== undefined) {
      doc.getMap(existingId).set('$$DELETED', true);
    }
    return Y.encodeStateAsUpdate(doc, vector);
  }
  if (existingId !== undefined) {
    const record = doc.getMap(existingId);
    record.set('parentId', input.parentId);
    record.set('index', input.index);
    return Y.encodeStateAsUpdate(doc, vector);
  }
  const record = doc.getMap(input.newRecordId);
  record.set('id', input.newRecordId);
  record.set('parentId', input.parentId);
  record.set('type', PageTreeKind.DOC);
  record.set('data', input.docId);
  record.set('index', input.index);
  return Y.encodeStateAsUpdate(doc, vector);
}

export function emptyYDocBin(): Uint8Array {
  return Y.encodeStateAsUpdate(new Y.Doc());
}
