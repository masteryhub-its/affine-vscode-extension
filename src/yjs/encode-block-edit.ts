import * as Y from 'yjs';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { parseAffineBlockFlavour, parseAffineNoteDisplayMode } from '../utils/affine-block';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { AffineNoteDisplayMode } from '../utils/enums/affine-note-display-mode.enum';
import { AffineParagraphType } from '../utils/enums/affine-paragraph-type.enum';
import type { NewBlockSpec } from '../document/new-block';
import type { InlineSegment } from './inline-markdown';

export const MAX_BLOCK_TEXT_LENGTH = 20_000;

const EDITABLE_FLAVOURS: ReadonlySet<AffineBlockFlavour> = new Set([AffineBlockFlavour.PARAGRAPH, AffineBlockFlavour.LIST, AffineBlockFlavour.CODE, AffineBlockFlavour.TABLE_CELL]);

function fail(message: string): never {
  throw new AffineError(message, AffineErrorCode.UNEXPECTED_RESPONSE);
}

/** A text block holds one line, so line breaks become spaces; a code block keeps its lines. */
export function normalizeBlockText(value: string, keepLines = false): string {
  const flat = keepLines ? value.replace(/\r\n|\r/gu, '\n') : value.replace(/\r\n|\r|\n/gu, ' ');
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

/** Mentions and linked pages stand for something other than the characters stored, so they cannot be edited as text. */
function hasOnlyEditableText(text: Y.Text): boolean {
  for (const delta of text.toDelta() as readonly { insert?: unknown; attributes?: Record<string, unknown> }[]) {
    if (typeof delta.insert !== 'string') {
      return false;
    }
    if (delta.attributes !== undefined && ('mention' in delta.attributes || 'reference' in delta.attributes)) {
      return false;
    }
  }
  return true;
}

/**
 * The change that sets one text block (paragraph, heading, quote or list item) to `newText`, as a Yjs update to apply
 * on top of the current document. Only the characters that differ are touched, so edits other people make to the same
 * page at the same time still merge. Formatting and links on the text that stays are kept; a block with a mention or linked page is refused.
 * Returns undefined when nothing changed.
 */
export function encodeBlockTextUpdate(bin: Uint8Array, blockId: string, newText: string): Uint8Array | undefined {
  const doc = loadDoc(bin);
  const vector = Y.encodeStateVector(doc);
  const block = doc.getMap('blocks').get(blockId);
  if (!(block instanceof Y.Map)) {
    fail(`Block ${blockId} was not found`);
  }
  const flavour = flavourOf(block);
  const text = normalizeBlockText(newText, flavour === AffineBlockFlavour.CODE);
  const prop: unknown = block.get('prop:text');
  if (flavour === undefined || !EDITABLE_FLAVOURS.has(flavour) || !(prop instanceof Y.Text)) {
    fail('That block is not a text block');
  }
  if (!hasOnlyEditableText(prop)) {
    fail('This block has a mention or a linked page, so it can only be edited in AFFiNE');
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

const HEADING_TYPES: readonly AffineParagraphType[] = [AffineParagraphType.H1, AffineParagraphType.H2, AffineParagraphType.H3, AffineParagraphType.H4, AffineParagraphType.H5, AffineParagraphType.H6];

function segmentsText(segments: readonly InlineSegment[]): string {
  return segments.map((segment) => segment.text).join('');
}

/** Fills a new text with its pieces, formatting each one; a piece has no line breaks because a block holds one line. */
function writeSegments(content: Y.Text, segments: readonly InlineSegment[]): void {
  // A delta states each piece's formatting exactly, so a plain piece after a bold one does not inherit bold.
  content.applyDelta(segments.map((segment) => ({ insert: normalizeBlockText(segment.text), attributes: { ...segment.attributes } })));
}

function newTextBlock(id: string, flavour: AffineBlockFlavour, props: ReadonlyMap<string, unknown>, content: Y.Text): Y.Map<unknown> {
  const block = new Y.Map<unknown>();
  block.set('sys:id', id);
  block.set('sys:flavour', flavour);
  block.set('sys:children', new Y.Array<string>());
  for (const [key, value] of props) {
    block.set(key, value);
  }
  block.set('prop:text', content);
  return block;
}

function formattedText(segments: readonly InlineSegment[]): Y.Text {
  const content = new Y.Text();
  writeSegments(content, segments);
  return content;
}

function newCodeBlock(id: string, language: string, text: string): Y.Map<unknown> {
  const content = new Y.Text();
  content.insert(0, normalizeBlockText(text, true));
  return newTextBlock(id, AffineBlockFlavour.CODE, new Map([['prop:language', language]]), content);
}

function buildBlock(id: string, spec: NewBlockSpec): Y.Map<unknown> {
  switch (spec.kind) {
    case 'paragraph':
      return newTextBlock(id, AffineBlockFlavour.PARAGRAPH, new Map([['prop:type', AffineParagraphType.TEXT]]), formattedText(spec.segments));
    case 'quote':
      return newTextBlock(id, AffineBlockFlavour.PARAGRAPH, new Map([['prop:type', AffineParagraphType.QUOTE]]), formattedText(spec.segments));
    case 'heading':
      return newTextBlock(id, AffineBlockFlavour.PARAGRAPH, new Map([['prop:type', HEADING_TYPES[spec.level - 1] ?? AffineParagraphType.H1]]), formattedText(spec.segments));
    case 'list':
      return newTextBlock(
        id,
        AffineBlockFlavour.LIST,
        new Map<string, unknown>([
          ['prop:type', spec.list],
          ['prop:checked', spec.checked],
        ]),
        formattedText(spec.segments)
      );
    case 'code':
      return newCodeBlock(id, spec.language, spec.text);
    case 'divider': {
      const block = new Y.Map<unknown>();
      block.set('sys:id', id);
      block.set('sys:flavour', AffineBlockFlavour.DIVIDER);
      block.set('sys:children', new Y.Array<string>());
      return block;
    }
  }
}

function specText(spec: NewBlockSpec): string {
  if (spec.kind === 'divider') {
    return '';
  }
  return spec.kind === 'code' ? spec.text : segmentsText(spec.segments);
}

function checkNewBlock(spec: NewBlockSpec): void {
  if (normalizeBlockText(specText(spec), spec.kind === 'code').length > MAX_BLOCK_TEXT_LENGTH) {
    fail(`Text is too long (more than ${MAX_BLOCK_TEXT_LENGTH} characters)`);
  }
  if ((spec.kind === 'paragraph' || spec.kind === 'heading' || spec.kind === 'quote') && specText(spec).trim().length === 0) {
    fail('Text is empty');
  }
}

/**
 * The change that adds new blocks at the end of the page, in order and all together, built the same way AFFiNE builds
 * them: paragraphs, headings, quotes, list items, code blocks and dividers, with bold, links and the like on the text.
 * Ids come from `newId`, so a retry can be recognised and tests are deterministic. Nothing is added if any block is
 * not acceptable.
 */
export function encodeAppendBlocksUpdate(bin: Uint8Array, specs: readonly NewBlockSpec[], newId: () => string): Uint8Array {
  specs.forEach(checkNewBlock);
  const doc = loadDoc(bin);
  const vector = Y.encodeStateVector(doc);
  const blocks = doc.getMap('blocks');
  const note = lastPageNote(blocks);
  const children = note?.get('sys:children');
  if (note === undefined || !(children instanceof Y.Array)) {
    fail('This page has no note to add text to');
  }
  const ids = specs.map(() => newId());
  const taken = ids.find((id) => blocks.has(id));
  if (taken !== undefined) {
    fail(`Block ${taken} already exists`);
  }
  doc.transact(() => {
    specs.forEach((spec, index) => {
      const id = ids[index] ?? '';
      blocks.set(id, buildBlock(id, spec));
    });
    children.push(ids);
  });
  return Y.encodeStateAsUpdate(doc, vector);
}

/** A whole page with new blocks added at its end, for saving as a new page. */
export function encodePageWithBlocks(bin: Uint8Array, specs: readonly NewBlockSpec[], newId: () => string): Uint8Array {
  return specs.length === 0 ? bin : Y.mergeUpdates([bin, encodeAppendBlocksUpdate(bin, specs, newId)]);
}

/** The change that adds one new block at the end of the page. */
export function encodeAppendBlockUpdate(bin: Uint8Array, spec: NewBlockSpec, newBlockId: string): Uint8Array {
  return encodeAppendBlocksUpdate(bin, [spec], () => newBlockId);
}

/** The change that adds a plain text paragraph at the end of the page. */
export function encodeAppendParagraphUpdate(bin: Uint8Array, newText: string, newBlockId: string): Uint8Array {
  return encodeAppendBlockUpdate(bin, { kind: 'paragraph', segments: [{ text: newText }] }, newBlockId);
}
