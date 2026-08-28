export interface CatalogPageRef {
  readonly workspaceId: string;
  readonly docId: string;
}

export interface CatalogPageTitle extends CatalogPageRef {
  readonly title: string;
}

export function hoverTitleForAffinePage(pages: readonly CatalogPageTitle[], ref: CatalogPageRef): string | undefined {
  const match = pages.find((page) => page.workspaceId === ref.workspaceId && page.docId === ref.docId);
  return match?.title;
}
