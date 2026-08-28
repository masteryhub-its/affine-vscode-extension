import * as Y from 'yjs';
import { headingLevel, pageListKind, parseAffineBlockFlavour, parseAffineNoteDisplayMode, parseAffineParagraphType, parseAffineReferenceType } from '../utils/affine-block';
import { parseCssColor } from '../utils/css-color';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { AffineNoteDisplayMode } from '../utils/enums/affine-note-display-mode.enum';
import { AffineParagraphType } from '../utils/enums/affine-paragraph-type.enum';
import { AffineReferenceType } from '../utils/enums/affine-reference-type.enum';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import type { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { HeadingLevel } from '../utils/heading-level';

export interface PageInlineSpan {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly strike: boolean;
  readonly underline: boolean;
  readonly code: boolean;
  readonly link: string | undefined;
  readonly mentionUserId: string | undefined;
  readonly linkedDocId: string | undefined;
  readonly background?: string;
  readonly color?: string;
}

export interface HeadingPageBlock {
  readonly kind: PageBlockKind.HEADING;
  readonly level: HeadingLevel;
  readonly inlines: readonly PageInlineSpan[];
}

export interface ParagraphPageBlock {
  readonly kind: PageBlockKind.PARAGRAPH;
  readonly inlines: readonly PageInlineSpan[];
}

export interface QuotePageBlock {
  readonly kind: PageBlockKind.QUOTE;
  readonly inlines: readonly PageInlineSpan[];
}

export interface ListPageBlock {
  readonly kind: PageBlockKind.LIST;
  readonly list: PageListKind;
  readonly checked: boolean;
  readonly depth: number;
  readonly inlines: readonly PageInlineSpan[];
}

export interface CodePageBlock {
  readonly kind: PageBlockKind.CODE;
  readonly language: string;
  readonly text: string;
}

export interface DividerPageBlock {
  readonly kind: PageBlockKind.DIVIDER;
}

export interface BookmarkPageBlock {
  readonly kind: PageBlockKind.BOOKMARK;
  readonly url: string;
  readonly title: string;
}

export interface ImagePageBlock {
  readonly kind: PageBlockKind.IMAGE;
  readonly caption: string;
  readonly sourceId: string;
}

export interface LatexPageBlock {
  readonly kind: PageBlockKind.LATEX;
  readonly latex: string;
}

export interface LinkedDocPageBlock {
  readonly kind: PageBlockKind.LINKED_DOC;
  readonly docId: string;
  readonly title: string;
}

export interface TablePageBlock {
  readonly kind: PageBlockKind.TABLE;
  readonly rows: readonly (readonly string[])[];
}

export interface CalloutPageBlock {
  readonly kind: PageBlockKind.CALLOUT;
  readonly emoji: string;
  readonly inlines: readonly PageInlineSpan[];
}

export interface AttachmentPageBlock {
  readonly kind: PageBlockKind.ATTACHMENT;
  readonly name: string;
  readonly size: string;
  readonly sourceId: string;
}

export type PageBlock =
  | HeadingPageBlock
  | ParagraphPageBlock
  | QuotePageBlock
  | ListPageBlock
  | CodePageBlock
  | DividerPageBlock
  | BookmarkPageBlock
  | ImagePageBlock
  | LatexPageBlock
  | LinkedDocPageBlock
  | TablePageBlock
  | CalloutPageBlock
  | AttachmentPageBlock;

export interface ParsedPage {
  readonly title: string;
  readonly edgelessOnly: boolean;
  readonly blocks: readonly PageBlock[];
}

function isYMap(value: unknown): value is Y.Map<unknown> {
  return value instanceof Y.Map;
}

function isYArray(value: unknown): value is Y.Array<unknown> {
  return value instanceof Y.Array;
}

function isYText(value: unknown): value is Y.Text {
  return value instanceof Y.Text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(block: Y.Map<unknown>, key: string): string {
  const value = block.get(key);
  if (typeof value === 'string') {
    return value;
  }
  if (isYText(value)) {
    return value.toJSON();
  }
  return '';
}

function readChildren(block: Y.Map<unknown>): readonly string[] {
  const value = block.get('sys:children');
  if (!isYArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0) {
      ids.push(item);
    }
  }
  return ids;
}

function emptyInlines(): readonly PageInlineSpan[] {
  return [];
}

function readInlines(block: Y.Map<unknown>): readonly PageInlineSpan[] {
  const value = block.get('prop:text');
  if (typeof value === 'string') {
    return value.length === 0 ? emptyInlines() : [plainSpan(value)];
  }
  if (!isYText(value)) {
    return emptyInlines();
  }
  const spans: PageInlineSpan[] = [];
  for (const delta of value.toDelta()) {
    if (!isRecord(delta)) {
      continue;
    }
    const attrs = isRecord(delta['attributes']) ? delta['attributes'] : {};
    const mentionUserId = mentionIdFromValue(delta['insert']) ?? mentionIdFromValue(attrs['mention']);
    if (mentionUserId !== undefined) {
      spans.push({ ...plainSpan('@mention'), mentionUserId });
      continue;
    }
    const linkedDocId = linkedDocIdFromValue(delta['insert']) ?? linkedDocIdFromValue(attrs['reference']);
    if (typeof delta['insert'] === 'string' && delta['insert'].length > 0) {
      const background = parseCssColor(attrs['background']);
      const color = parseCssColor(attrs['color']);
      spans.push({
        ...plainSpan(linkedDocId === undefined ? delta['insert'] : 'Linked page'),
        bold: attrs['bold'] === true,
        italic: attrs['italic'] === true,
        strike: attrs['strike'] === true,
        underline: attrs['underline'] === true,
        code: attrs['code'] === true,
        link: readLink(attrs),
        linkedDocId,
        ...(background === undefined ? {} : { background }),
        ...(color === undefined ? {} : { color }),
      });
      continue;
    }
    if (linkedDocId !== undefined) {
      spans.push({ ...plainSpan('Linked page'), linkedDocId });
    }
  }
  return spans;
}

function readLink(attrs: Record<string, unknown>): string | undefined {
  const link = attrs['link'];
  if (typeof link === 'string' && link.length > 0) {
    return link;
  }
  if (isRecord(link) && typeof link['url'] === 'string' && link['url'].length > 0) {
    return link['url'];
  }
  return undefined;
}

function mentionIdFromValue(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const nested = value['mention'];
  if (isRecord(nested) && typeof nested['member'] === 'string' && nested['member'].length > 0) {
    return nested['member'];
  }
  if (typeof value['member'] === 'string' && value['member'].length > 0) {
    return value['member'];
  }
  return undefined;
}

function linkedDocIdFromValue(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const pageId = value['pageId'];
  if (typeof pageId === 'string' && pageId.length > 0 && (parseAffineReferenceType(value['type']) === AffineReferenceType.LINKED_PAGE || value['type'] === undefined)) {
    return pageId;
  }
  return undefined;
}

function plainSpan(text: string): PageInlineSpan {
  return {
    text,
    bold: false,
    italic: false,
    strike: false,
    underline: false,
    code: false,
    link: undefined,
    mentionUserId: undefined,
    linkedDocId: undefined,
  };
}

function isEdgelessOnlyNote(block: Y.Map<unknown>): boolean {
  const mode = parseAffineNoteDisplayMode(readString(block, 'prop:displayMode').toLowerCase());
  return mode === AffineNoteDisplayMode.EDGELESS || mode === AffineNoteDisplayMode.EDGELESS_ONLY;
}

function findPageId(blocks: Y.Map<unknown>): string | undefined {
  for (const [id, value] of blocks) {
    if (isYMap(value) && parseAffineBlockFlavour(readString(value, 'sys:flavour')) === AffineBlockFlavour.PAGE) {
      return id;
    }
  }
  return undefined;
}

function walk(blocks: Y.Map<unknown>, id: string, depth: number, visiting: Set<string>, out: PageBlock[]): void {
  if (visiting.has(id)) {
    return;
  }
  const value = blocks.get(id);
  if (!isYMap(value)) {
    return;
  }
  visiting.add(id);
  const flavour = parseAffineBlockFlavour(readString(value, 'sys:flavour'));
  if (flavour === AffineBlockFlavour.SURFACE) {
    return;
  }
  if (flavour === AffineBlockFlavour.NOTE) {
    if (!isEdgelessOnlyNote(value)) {
      for (const child of readChildren(value)) {
        walk(blocks, child, 0, visiting, out);
      }
    }
    return;
  }
  if (flavour === AffineBlockFlavour.PARAGRAPH) {
    const paragraphType = parseAffineParagraphType(readString(value, 'prop:type'));
    const inlines = readInlines(value);
    const level = paragraphType === undefined ? undefined : headingLevel(paragraphType);
    if (level !== undefined) {
      out.push({ kind: PageBlockKind.HEADING, level, inlines });
    } else if (paragraphType === AffineParagraphType.QUOTE) {
      out.push({ kind: PageBlockKind.QUOTE, inlines });
    } else {
      out.push({ kind: PageBlockKind.PARAGRAPH, inlines });
    }
    return;
  }
  if (flavour === AffineBlockFlavour.LIST) {
    out.push({
      kind: PageBlockKind.LIST,
      list: pageListKind(readString(value, 'prop:type')),
      checked: value.get('prop:checked') === true,
      depth,
      inlines: readInlines(value),
    });
    for (const child of readChildren(value)) {
      walk(blocks, child, depth + 1, visiting, out);
    }
    return;
  }
  if (flavour === AffineBlockFlavour.CODE) {
    out.push({ kind: PageBlockKind.CODE, language: readString(value, 'prop:language'), text: readString(value, 'prop:text') });
    return;
  }
  if (flavour === AffineBlockFlavour.DIVIDER) {
    out.push({ kind: PageBlockKind.DIVIDER });
    return;
  }
  if (flavour === AffineBlockFlavour.BOOKMARK) {
    const url = readString(value, 'prop:url');
    const title = readString(value, 'prop:title') || url;
    if (url.length > 0 || title.length > 0) {
      out.push({ kind: PageBlockKind.BOOKMARK, url, title });
    }
    return;
  }
  if (flavour === AffineBlockFlavour.EMBED_LINKED_DOC || flavour === AffineBlockFlavour.EMBED_SYNCED_DOC) {
    const docId = readString(value, 'prop:pageId');
    if (docId.length > 0) {
      out.push({ kind: PageBlockKind.LINKED_DOC, docId, title: readString(value, 'prop:title') || 'Linked page' });
    }
    return;
  }
  if (flavour === AffineBlockFlavour.IMAGE) {
    out.push({
      kind: PageBlockKind.IMAGE,
      caption: readString(value, 'prop:caption'),
      sourceId: readString(value, 'prop:sourceId'),
    });
    return;
  }
  if (flavour === AffineBlockFlavour.LATEX) {
    out.push({ kind: PageBlockKind.LATEX, latex: readString(value, 'prop:latex') });
    return;
  }
  if (flavour === AffineBlockFlavour.TABLE) {
    out.push({ kind: PageBlockKind.TABLE, rows: readTableRows(blocks, value) });
    return;
  }
  if (flavour === AffineBlockFlavour.CALLOUT) {
    const childInlines = readCalloutInlines(blocks, value);
    out.push({
      kind: PageBlockKind.CALLOUT,
      emoji: readString(value, 'prop:emoji') || '💡',
      inlines: childInlines.length > 0 ? childInlines : readInlines(value),
    });
    return;
  }
  if (flavour === AffineBlockFlavour.ATTACHMENT) {
    const name = readString(value, 'prop:name') || readString(value, 'prop:sourceId') || 'Attachment';
    const sizeValue = value.get('prop:size');
    const size = typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? String(sizeValue) : readString(value, 'prop:size');
    out.push({
      kind: PageBlockKind.ATTACHMENT,
      name,
      size,
      sourceId: readString(value, 'prop:sourceId'),
    });
    return;
  }
  if (flavour === AffineBlockFlavour.TABLE_ROW || flavour === AffineBlockFlavour.TABLE_CELL) {
    return;
  }
  for (const child of readChildren(value)) {
    walk(blocks, child, depth, visiting, out);
  }
}

export function parsePageDoc(bin: Uint8Array): ParsedPage {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  const blocks = doc.getMap('blocks');
  const pageId = findPageId(blocks);
  const pageBlock = pageId === undefined ? undefined : blocks.get(pageId);
  const title = isYMap(pageBlock) ? readString(pageBlock, 'prop:title') : '';
  const out: PageBlock[] = [];
  if (isYMap(pageBlock)) {
    for (const child of readChildren(pageBlock)) {
      walk(blocks, child, 0, new Set<string>(), out);
    }
  }
  return {
    title: title.trim(),
    edgelessOnly: out.length === 0 && !hasDocNote(blocks),
    blocks: out,
  };
}

export function mentionUserIds(page: ParsedPage): readonly string[] {
  const ids = new Set<string>();
  for (const block of page.blocks) {
    if (
      block.kind === PageBlockKind.HEADING ||
      block.kind === PageBlockKind.PARAGRAPH ||
      block.kind === PageBlockKind.QUOTE ||
      block.kind === PageBlockKind.LIST ||
      block.kind === PageBlockKind.CALLOUT
    ) {
      for (const inline of block.inlines) {
        if (inline.mentionUserId !== undefined) {
          ids.add(inline.mentionUserId);
        }
      }
    }
  }
  return [...ids];
}

function readTableRows(blocks: Y.Map<unknown>, table: Y.Map<unknown>): readonly (readonly string[])[] {
  const rows: string[][] = [];
  for (const rowId of readChildren(table)) {
    const row = blocks.get(rowId);
    if (!isYMap(row) || parseAffineBlockFlavour(readString(row, 'sys:flavour')) !== AffineBlockFlavour.TABLE_ROW) {
      continue;
    }
    const cells: string[] = [];
    for (const cellId of readChildren(row)) {
      const cell = blocks.get(cellId);
      if (!isYMap(cell)) {
        continue;
      }
      cells.push(readString(cell, 'prop:text'));
    }
    rows.push(cells);
  }
  return rows;
}

function readCalloutInlines(blocks: Y.Map<unknown>, callout: Y.Map<unknown>): readonly PageInlineSpan[] {
  const inlines: PageInlineSpan[] = [];
  for (const childId of readChildren(callout)) {
    const child = blocks.get(childId);
    if (!isYMap(child)) {
      continue;
    }
    inlines.push(...readInlines(child));
  }
  return inlines;
}

function hasDocNote(blocks: Y.Map<unknown>): boolean {
  for (const value of blocks.values()) {
    if (isYMap(value) && parseAffineBlockFlavour(readString(value, 'sys:flavour')) === AffineBlockFlavour.NOTE && !isEdgelessOnlyNote(value)) {
      return true;
    }
  }
  return false;
}
