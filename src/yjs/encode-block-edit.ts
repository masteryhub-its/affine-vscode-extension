import * as Y from 'yjs';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { parseAffineBlockFlavour, parseAffineNoteDisplayMode } from '../utils/affine-block';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { AffineNoteDisplayMode } from '../utils/enums/affine-note-display-mode.enum';
import { AffineParagraphType } from '../utils/enums/affine-paragraph-type.enum';

export const MAX_BLOCK_TEXT_LENGTH = 20_000;

const EDITABLE_FLAVOURS: ReadonlySet<AffineBlockFlavour> = new Set([AffineBlockFlavour.PARAGRAPH, AffineBlockFlavour.LIST]);

function fail(message: string): never {
  throw new AffineError(message, AffineErrorCode.UNEXPECTED_RESPONSE);
}

/** A block holds one line, so line breaks become spaces. */
export function normalizeBlockText(value: string): string {
  const flat = value.replace(/\r\n|\r|\n/gu, ' ');
  if (flat.length > MAX_BLOCK_TEXT_LENGTH) {
    fail(`Text is too long (more than ${MAX_BLOCK_TEXT_LENGTH} characters)`);
  }
  return flat;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

interface TextChange {
  readonly index: number;
  readonly remove: number;
  readonly insert: string;
}

/** The smallest single replacement that turns `before` into `after`, never splitting a surrogate pair. */
function diffText(before: string, after: string): TextChange {
  let prefix = 0;
  const shortest = Math.min(before.length, after.length);
  while (prefix < shortest && before.charCodeAt(prefix) === after.charCodeAt(prefix)) {
    prefix += 1;
  }
  if (prefix > 0 && isHighSurrogate(before.charCodeAt(prefix - 1))) {
    prefix -= 1;
  }
  let suffix = 0;
  while (suffix < shortest - prefix && before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)) {
    suffix += 1;
  }
  if (suffix > 0 && isLowSurrogate(before.charCodeAt(before.length - suffix))) {
    suffix -= 1;
  }
  return { index: prefix, remove: before.length - prefix - suffix, insert: after.slice(prefix, after.length - suffix) };
}

function loadDoc(bin: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  return doc;
}

function flavourOf(block: Y.Map<unknown>): AffineBlockFlavour | undefined {
  const value = block.get('sys:flavour');
  return typeof value === 'string' ? parseAffineBlockFlavour(value) : undefined;
}

function hasOnlyPlainText(text: Y.Text): boolean {
  for (const delta of text.toDelta() as readonly { insert?: unknown; attributes?: Record<string, unknown> }[]) {
    if (typeof delta.insert !== 'string') {
      return false;
    }
    if (delta.attributes !== undefined && Object.keys(delta.attributes).length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * The change that sets one text block (paragraph, heading, quote or list item) to `newText`, as a Yjs update to apply
 * on top of the current document. Only the characters that differ are touched, so edits other people make to the same
 * page at the same time still merge. A block that has formatting, links or mentions is refused instead of flattened.
 * Returns undefined when nothing changed.
 */
export function encodeBlockTextUpdate(bin: Uint8Array, blockId: string, newText: string): Uint8Array | undefined {
  const text = normalizeBlockText(newText);
  const doc = loadDoc(bin);
  const vector = Y.encodeStateVector(doc);
  const block = doc.getMap('blocks').get(blockId);
  if (!(block instanceof Y.Map)) {
    fail(`Block ${blockId} was not found`);
  }
  const flavour = flavourOf(block);
  const prop: unknown = block.get('prop:text');
  if (flavour === undefined || !EDITABLE_FLAVOURS.has(flavour) || !(prop instanceof Y.Text)) {
    fail('That block is not a text block');
  }
  if (!hasOnlyPlainText(prop)) {
    fail('This block has formatting, a link or a mention, so it can only be edited in AFFiNE');
  }
  const before = prop.toJSON();
  if (before === text) {
    return undefined;
  }
  const change = diffText(before, text);
  doc.transact(() => {
    if (change.remove > 0) {
      prop.delete(change.index, change.remove);
    }
    if (change.insert.length > 0) {
      prop.insert(change.index, change.insert);
    }
  });
  return Y.encodeStateAsUpdate(doc, vector);
}

function isEdgelessOnly(note: Y.Map<unknown>): boolean {
  const raw = note.get('prop:displayMode');
  const mode = typeof raw === 'string' ? parseAffineNoteDisplayMode(raw.toLowerCase()) : undefined;
  return mode === AffineNoteDisplayMode.EDGELESS || mode === AffineNoteDisplayMode.EDGELESS_ONLY;
}

function lastPageNote(blocks: Y.Map<unknown>): Y.Map<unknown> | undefined {
  for (const value of blocks.values()) {
    if (!(value instanceof Y.Map) || flavourOf(value) !== AffineBlockFlavour.PAGE) {
      continue;
    }
    const children: unknown = value.get('sys:children');
    if (!(children instanceof Y.Array)) {
      return undefined;
    }
    const ids = (children.toArray() as readonly unknown[]).filter((id): id is string => typeof id === 'string');
    for (const id of [...ids].reverse()) {
      const candidate = blocks.get(id);
      if (candidate instanceof Y.Map && flavourOf(candidate) === AffineBlockFlavour.NOTE && !isEdgelessOnly(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * The change that adds a new text paragraph at the end of the page, built the same way AFFiNE builds one. The id is
 * passed in so a retry of the same action can be recognised and so tests are deterministic.
 */
export function encodeAppendParagraphUpdate(bin: Uint8Array, newText: string, newBlockId: string): Uint8Array {
  const text = normalizeBlockText(newText);
  if (text.trim().length === 0) {
    fail('Text is empty');
  }
  const doc = loadDoc(bin);
  const vector = Y.encodeStateVector(doc);
  const blocks = doc.getMap('blocks');
  if (blocks.has(newBlockId)) {
    fail(`Block ${newBlockId} already exists`);
  }
  const note = lastPageNote(blocks);
  const children = note?.get('sys:children');
  if (note === undefined || !(children instanceof Y.Array)) {
    fail('This page has no note to add text to');
  }
  doc.transact(() => {
    const paragraph = new Y.Map<unknown>();
    paragraph.set('sys:id', newBlockId);
    paragraph.set('sys:flavour', AffineBlockFlavour.PARAGRAPH);
    paragraph.set('sys:children', new Y.Array<string>());
    paragraph.set('prop:type', AffineParagraphType.TEXT);
    const content = new Y.Text();
    content.insert(0, text);
    paragraph.set('prop:text', content);
    blocks.set(newBlockId, paragraph);
    children.push([newBlockId]);
  });
  return Y.encodeStateAsUpdate(doc, vector);
}
