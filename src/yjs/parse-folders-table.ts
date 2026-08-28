import * as Y from 'yjs';
import type { FolderRecord } from './page-tree';

function isYMap(value: unknown): value is Y.Map<unknown> {
  return value instanceof Y.Map;
}

function readString(record: Y.Map<unknown>, key: string): string {
  const value = record.get(key);
  return typeof value === 'string' ? value : '';
}

function readParentId(record: Y.Map<unknown>): string | null {
  const value = record.get('parentId');
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function parseFoldersTable(bin: Uint8Array): readonly FolderRecord[] {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  const records: FolderRecord[] = [];
  for (const key of doc.share.keys()) {
    let record: Y.Map<unknown>;
    try {
      record = doc.getMap(key);
    } catch {
      continue;
    }
    if (!isYMap(record) || record.get('$$DELETED') === true || record.size === 0) {
      continue;
    }
    const id = readString(record, 'id');
    const type = readString(record, 'type');
    const data = readString(record, 'data');
    if (id.length === 0 || type.length === 0) {
      continue;
    }
    records.push({
      id,
      parentId: readParentId(record),
      type,
      data,
      index: readString(record, 'index'),
    });
  }
  return records;
}
