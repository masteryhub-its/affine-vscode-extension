import { isAllowedUrlProtocol } from './url-protocol';

export function isAllowedHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isAllowedUrlProtocol(parsed.protocol);
  } catch {
    return false;
  }
}
