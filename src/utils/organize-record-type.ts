import { OrganizeRecordType } from './enums/organize-record-type.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(OrganizeRecordType));

export function parseOrganizeRecordType(value: string): OrganizeRecordType | undefined {
  if (!VALUES.has(value)) {
    return undefined;
  }
  return value as OrganizeRecordType;
}
