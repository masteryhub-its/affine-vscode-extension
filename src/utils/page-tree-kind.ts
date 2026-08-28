import { PageTreeKind } from './enums/page-tree-kind.enum';

const PAGE_TREE_KIND_VALUES: ReadonlySet<string> = new Set(Object.values(PageTreeKind));

export function parsePageTreeKind(value: unknown): PageTreeKind | undefined {
  if (typeof value !== 'string' || !PAGE_TREE_KIND_VALUES.has(value)) {
    return undefined;
  }
  return value as PageTreeKind;
}
