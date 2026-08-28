import { UrlProtocol } from './enums/url-protocol.enum';

const URL_PROTOCOL_VALUES: ReadonlySet<string> = new Set(Object.values(UrlProtocol));

export function isAllowedUrlProtocol(protocol: string): boolean {
  return URL_PROTOCOL_VALUES.has(protocol);
}

export function isAbsoluteHttpHref(href: string): boolean {
  const lower = href.toLowerCase();
  return Object.values(UrlProtocol).some((protocol) => lower.startsWith(`${protocol}//`));
}

export function cspImgSrc(serverUrl: string): string {
  try {
    return new URL(serverUrl).origin;
  } catch {
    return serverUrl;
  }
}
