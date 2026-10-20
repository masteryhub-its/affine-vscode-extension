import type { HttpResponse } from './http.types';

export const MAX_AVATAR_BYTES = 512 * 1024;

const SHOWN_TYPES: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * A picture answer as a data address, or undefined when it is not a small raster image. The page then shows it
 * without asking the server, so it still appears when the page cannot sign in to the server or the network drops it.
 */
export function toAvatarDataUri(response: HttpResponse): string | undefined {
  const bytes = response.bodyBytes;
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (response.status < 200 || response.status >= 300 || bytes === undefined || bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) {
    return undefined;
  }
  if (type === undefined || !SHOWN_TYPES.has(type)) {
    return undefined;
  }
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}
