import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { PageBlock, PageInlineSpan } from '../yjs/parse-page-doc';
import { editableCellsOf, editableTextOf } from './editable-block';

function span(overrides: Partial<PageInlineSpan> = {}): PageInlineSpan {
  return { text: 'hello', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined, ...overrides };
}

const paragraph = (inlines: readonly PageInlineSpan[], blockId: string | null = 'b1'): PageBlock => ({ kind: PageBlockKind.PARAGRAPH, inlines, ...(blockId === null ? {} : { blockId }) });

describe('editableTextOf', () => {
  it('returns the id and plain text of a plain paragraph', () => {
    expect(editableTextOf(paragraph([span({ text: 'Hello ' }), span({ text: 'world' })]))).toEqual({ blockId: 'b1', text: 'Hello world' });
  });

  it('allows an empty paragraph, so it can be written into', () => {
    expect(editableTextOf(paragraph([]))).toEqual({ blockId: 'b1', text: '' });
  });

  it.each([
    ['bold', { bold: true }],
    ['italic', { italic: true }],
    ['strike', { strike: true }],
    ['underline', { underline: true }],
    ['code', { code: true }],
    ['a link', { link: 'https://example.com' }],
    ['a colour', { color: 'var(--affine-text-color-red)' }],
    ['a highlight', { background: 'var(--affine-text-highlight-yellow)' }],
  ])('is editable inline when it contains %s, because the shown text is the stored text', (_name, overrides) => {
    expect(editableTextOf(paragraph([span({ text: 'a ' }), span({ ...overrides, text: 'b' })]))).toEqual({ blockId: 'b1', text: 'a b' });
  });

  it.each([
    ['a mention', { mentionUserId: 'u1' }],
    ['a linked page', { linkedDocId: 'd1' }],
  ])('is not editable inline when it contains %s, because the shown text is not the stored text', (_name, overrides) => {
    expect(editableTextOf(paragraph([span(), span(overrides)]))).toBeUndefined();
  });

  it('is not editable without a block id', () => {
    expect(editableTextOf(paragraph([span()], null))).toBeUndefined();
  });

  it('covers headings, quotes and list items', () => {
    expect(editableTextOf({ kind: PageBlockKind.HEADING, level: 2, blockId: 'h', inlines: [span({ text: 'Goals' })] })).toEqual({ blockId: 'h', text: 'Goals' });
    expect(editableTextOf({ kind: PageBlockKind.QUOTE, blockId: 'q', inlines: [span({ text: 'Said' })] })).toEqual({ blockId: 'q', text: 'Said' });
    expect(editableTextOf({ kind: PageBlockKind.LIST, list: PageListKind.BULLETED, checked: false, depth: 0, blockId: 'l', inlines: [span({ text: 'One' })] })).toEqual({ blockId: 'l', text: 'One' });
  });

  it('covers code blocks, which keep their lines', () => {
    expect(editableTextOf({ kind: PageBlockKind.CODE, language: 'ts', text: 'a\nb', blockId: 'c' })).toEqual({ blockId: 'c', text: 'a\nb', multiline: true });
    expect(editableTextOf({ kind: PageBlockKind.CODE, language: 'ts', text: 'x' })).toBeUndefined();
  });

  it('does not cover blocks that are not text', () => {
    expect(editableTextOf({ kind: PageBlockKind.DIVIDER })).toBeUndefined();
  });
});

describe('editableCellsOf', () => {
  it('pairs every cell with its id and text', () => {
    expect(editableCellsOf({ kind: PageBlockKind.TABLE, rows: [['A', 'B'], ['C']], cellIds: [['a', 'b'], ['c']] })).toEqual([
      [
        { blockId: 'a', text: 'A' },
        { blockId: 'b', text: 'B' },
      ],
      [{ blockId: 'c', text: 'C' }],
    ]);
  });

  it('leaves a cell read-only when its id is missing', () => {
    expect(editableCellsOf({ kind: PageBlockKind.TABLE, rows: [['A', 'B']], cellIds: [['a']] })).toEqual([[{ blockId: 'a', text: 'A' }, undefined]]);
  });

  it('is read-only everywhere for a table without ids', () => {
    expect(editableCellsOf({ kind: PageBlockKind.TABLE, rows: [['A']] })).toEqual([[undefined]]);
  });
});
