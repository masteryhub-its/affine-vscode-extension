import { parseDocumentPageUrl, type DocumentPageUrlParts } from '../client/document-url';

export function detectAffinePageUrls(text: string, serverUrl: string): readonly DocumentPageUrlParts[] {
  const origin = serverUrl.replace(/\/+$/u, '');
  const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(`${escapedOrigin}/workspace/([^/\\s]+)/([^/\\s]+)/?`, 'giu');
  const hits: DocumentPageUrlParts[] = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    if (raw === undefined) {
      continue;
    }
    const parsed = parseDocumentPageUrl(raw.endsWith('/') ? raw.slice(0, -1) : raw);
    if (parsed !== undefined) {
      hits.push(parsed);
    }
  }
  return hits;
}
