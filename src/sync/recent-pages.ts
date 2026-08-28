export interface RecentPage {
  readonly workspaceId: string;
  readonly docId: string;
  readonly title: string;
  readonly openedAt: number;
}

export const MAX_RECENT_PAGES = 8;

export function pushRecentPage(pages: readonly RecentPage[], next: RecentPage, max: number = MAX_RECENT_PAGES): readonly RecentPage[] {
  const without = pages.filter((page) => !(page.workspaceId === next.workspaceId && page.docId === next.docId));
  return [next, ...without].slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRecentPages(raw: unknown): readonly RecentPage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const pages: RecentPage[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const workspaceId = item['workspaceId'];
    const docId = item['docId'];
    const title = item['title'];
    const openedAt = item['openedAt'];
    if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
      continue;
    }
    if (typeof docId !== 'string' || docId.length === 0) {
      continue;
    }
    if (typeof title !== 'string') {
      continue;
    }
    if (typeof openedAt !== 'number' || !Number.isFinite(openedAt)) {
      continue;
    }
    pages.push({ workspaceId, docId, title, openedAt });
  }
  return pages;
}
