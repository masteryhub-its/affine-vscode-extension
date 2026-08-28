import { OrganizeRecordType } from '../utils/enums/organize-record-type.enum';
import { parseOrganizeRecordType } from '../utils/organize-record-type';
import type { FolderRecord } from '../yjs/page-tree';

export interface WorkspaceCollection {
  readonly id: string;
  readonly title: string;
  readonly docIds: readonly string[];
}

export function parseCollections(folders: readonly FolderRecord[]): readonly WorkspaceCollection[] {
  const docsByParent = new Map<string, string[]>();
  for (const record of folders) {
    if (parseOrganizeRecordType(record.type) !== OrganizeRecordType.DOC || record.parentId === null) {
      continue;
    }
    const group = docsByParent.get(record.parentId);
    if (group === undefined) {
      docsByParent.set(record.parentId, [record.data]);
    } else {
      group.push(record.data);
    }
  }
  return folders
    .filter((record) => parseOrganizeRecordType(record.type) === OrganizeRecordType.COLLECTION)
    .map((record) => ({
      id: record.id,
      title: record.data.length > 0 ? record.data : 'Untitled collection',
      docIds: docsByParent.get(record.id) ?? [],
    }));
}
