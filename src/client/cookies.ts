export interface CookieRecord {
  readonly name: string;
  readonly value: string;
}

const AFFINE_SESSION_COOKIE_NAMES: ReadonlySet<string> = new Set(['affine_session', 'affine_csrf_token']);

export function parseSetCookieHeaders(headers: readonly string[]): readonly CookieRecord[] {
  const cookies: CookieRecord[] = [];
  for (const header of headers) {
    const firstPair = header.split(';', 1)[0];
    if (firstPair === undefined) {
      continue;
    }
    const separator = firstPair.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const name = firstPair.slice(0, separator).trim();
    const value = firstPair.slice(separator + 1).trim();
    if (name.length === 0) {
      continue;
    }
    cookies.push({ name, value });
  }
  return cookies;
}

export function cookieHeaderFromRecords(cookies: readonly CookieRecord[]): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

export function findCookieValue(cookies: readonly CookieRecord[], name: string): string | undefined {
  const match = cookies.find((cookie) => cookie.name === name);
  return match?.value;
}

export function mergeCookies(existing: readonly CookieRecord[], incoming: readonly CookieRecord[]): readonly CookieRecord[] {
  const byName = new Map<string, CookieRecord>();
  for (const cookie of existing) {
    byName.set(cookie.name, cookie);
  }
  for (const cookie of incoming) {
    byName.set(cookie.name, cookie);
  }
  return [...byName.values()];
}

export function affineSessionCookies(cookies: readonly CookieRecord[]): readonly CookieRecord[] {
  return cookies.filter((cookie) => AFFINE_SESSION_COOKIE_NAMES.has(cookie.name));
}
