import { generateKeyBetween } from 'fractional-indexing';
import { parsePageTreeKind } from '../utils/page-tree-kind';
import type { FolderRecord } from '../yjs/page-tree';

// Never contains '0': a fractional key may not end in the smallest digit, or the next insert throws.
const JITTER_ALPHABET = '123456789abcdefghijklmnopqrstuvwxyz';
const JITTER_LENGTH = 6;

function isValidOrderKey(key: string): boolean {
  try {
    generateKeyBetween(key, null);
    return true;
  } catch {
    return false;
  }
}

function jitter(random: () => number): string {
  let out = '';
  for (let i = 0; i < JITTER_LENGTH; i += 1) {
    const position = Math.min(JITTER_ALPHABET.length - 1, Math.floor(random() * JITTER_ALPHABET.length));
    out += JITTER_ALPHABET.charAt(position);
  }
  return out;
}

/**
 * An order key that sorts after every sibling under `parentId`. Siblings with a key that is not a valid
 * fractional index (for example one written by an older version of this extension) are skipped, and a short
 * random tail keeps two clients that insert at the same moment from producing the same key.
 */
export function nextOrganizeIndex(records: readonly FolderRecord[], parentId: string | null, random: () => number = Math.random): string {
  let last: string | undefined;
  for (const record of records) {
    if (record.parentId !== parentId || parsePageTreeKind(record.type) === undefined || !isValidOrderKey(record.index)) {
      continue;
    }
    if (last === undefined || record.index > last) {
      last = record.index;
    }
  }
  return `${generateKeyBetween(last ?? null, null)}${jitter(random)}`;
}
