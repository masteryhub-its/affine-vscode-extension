import * as Y from 'yjs';
import { AffineErrorCode } from '../errors/affine-error';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { encodeAppendParagraphUpdate, encodeBlockTextUpdate, MAX_BLOCK_TEXT_LENGTH } from './encode-block-edit';
import { encodeEmptyPageDoc } from './encode-page-doc';
import { parsePageDoc } from './parse-page-doc';

const IDS = { pageId: 'page', noteId: 'note', paragraphId: 'p1', surfaceId: 'surface' } as const;

function page(text: string): Uint8Array {
  const base = encodeEmptyPageDoc({ title: 'Doc', ...IDS });
  const doc = new Y.Doc();
  Y.applyUpdate(doc, base);
  const paragraph = doc.getMap('blocks').get('p1') as Y.Map<unknown>;
  (paragraph.get('prop:text') as Y.Text).insert(0, text);
  return Y.encodeStateAsUpdate(doc);
}

function apply(base: Uint8Array, ...updates: readonly Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, base);
  for (const update of updates) {
    Y.applyUpdate(doc, update);
  }
  return doc;
}

function texts(doc: Y.Doc): string[] {
  return parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks.flatMap((block) => ('inlines' in block ? [block.inlines.map((span) => span.text).join('')] : []));
}

describe('encodeBlockTextUpdate', () => {
  it('replaces the text of a plain block', () => {
    const base = page('Hello world');
    const update = encodeBlockTextUpdate(base, 'p1', 'Hello there');
    expect(update).toBeDefined();
    expect(texts(apply(base, update as Uint8Array))).toEqual(['Hello there']);
  });

  it('changes only what differs, so edits made elsewhere at the same time still merge', () => {
    const base = page('Hello world');
    const first = encodeBlockTextUpdate(base, 'p1', 'Howdy world') as Uint8Array;
    const second = encodeBlockTextUpdate(base, 'p1', 'Hello there') as Uint8Array;
    expect(texts(apply(base, first, second))).toEqual(['Howdy there']);
  });

  it('can empty a block and fill an empty one', () => {
    const filled = page('text');
    expect(texts(apply(filled, encodeBlockTextUpdate(filled, 'p1', '') as Uint8Array))).toEqual(['']);
    const empty = page('');
    expect(texts(apply(empty, encodeBlockTextUpdate(empty, 'p1', 'new') as Uint8Array))).toEqual(['new']);
  });

  it('never splits an emoji in half, even when only part of it differs', () => {
    const base = page('a\u{1F600}b');
    expect(texts(apply(base, encodeBlockTextUpdate(base, 'p1', 'a\u{1F601}b') as Uint8Array))).toEqual(['a\u{1F601}b']);
    const tail = page('x\u{1F600}');
    expect(texts(apply(tail, encodeBlockTextUpdate(tail, 'p1', 'x\u{1F680}') as Uint8Array))).toEqual(['x\u{1F680}']);
    const head = page('\u{1F600}y');
    expect(texts(apply(head, encodeBlockTextUpdate(head, 'p1', '\u{1F680}y') as Uint8Array))).toEqual(['\u{1F680}y']);
  });

  it('returns nothing when the text did not change', () => {
    expect(encodeBlockTextUpdate(page('same'), 'p1', 'same')).toBeUndefined();
  });

  it('turns line breaks into spaces, because a block holds one line', () => {
    const base = page('a');
    expect(texts(apply(base, encodeBlockTextUpdate(base, 'p1', 'one\ntwo\r\nthree') as Uint8Array))).toEqual(['one two three']);
  });

  it('refuses text longer than the limit', () => {
    expect(() => encodeBlockTextUpdate(page('a'), 'p1', 'x'.repeat(MAX_BLOCK_TEXT_LENGTH + 1))).toThrow('too long');
  });

  it('refuses a block that has formatting, a link or a mention, so it is never flattened', () => {
    const base = page('plain');
    const doc = apply(base);
    const text = (doc.getMap('blocks').get('p1') as Y.Map<unknown>).get('prop:text') as Y.Text;
    text.format(0, 2, { bold: true });
    const formatted = Y.encodeStateAsUpdate(doc);
    expect(() => encodeBlockTextUpdate(formatted, 'p1', 'changed')).toThrow('formatting');
    try {
      encodeBlockTextUpdate(formatted, 'p1', 'changed');
    } catch (error: unknown) {
      expect((error as { code?: unknown }).code).toBe(AffineErrorCode.UNEXPECTED_RESPONSE);
    }
  });

  it('refuses an unknown block and a block that is not a text block', () => {
    const base = page('x');
    expect(() => encodeBlockTextUpdate(base, 'missing', 'y')).toThrow('not found');
    expect(() => encodeBlockTextUpdate(base, 'note', 'y')).toThrow('text block');
  });

  it('leaves every other block untouched', () => {
    const base = page('x');
    const doc = apply(base, encodeBlockTextUpdate(base, 'p1', 'y') as Uint8Array);
    const blocks = doc.getMap('blocks');
    expect([...blocks.keys()].sort()).toEqual(['note', 'p1', 'page', 'surface']);
    expect(((blocks.get('note') as Y.Map<unknown>).get('sys:children') as Y.Array<string>).toArray()).toEqual(['p1']);
  });
});

describe('encodeAppendParagraphUpdate', () => {
  it('adds a paragraph at the end of the page', () => {
    const base = page('first');
    const update = encodeAppendParagraphUpdate(base, 'second', 'p2');
    const doc = apply(base, update);
    expect(texts(doc)).toEqual(['first', 'second']);
    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks.map((block) => block.kind)).toEqual([PageBlockKind.PARAGRAPH, PageBlockKind.PARAGRAPH]);
  });

  it('writes the same block shape AFFiNE itself uses', () => {
    const base = page('first');
    const doc = apply(base, encodeAppendParagraphUpdate(base, 'second', 'p2'));
    const block = doc.getMap('blocks').get('p2') as Y.Map<unknown>;
    expect(block.get('sys:id')).toBe('p2');
    expect(block.get('sys:flavour')).toBe(AffineBlockFlavour.PARAGRAPH);
    expect(block.get('prop:type')).toBe('text');
    expect((block.get('prop:text') as Y.Text).toJSON()).toBe('second');
    expect((block.get('sys:children') as Y.Array<string>).length).toBe(0);
    const note = doc.getMap('blocks').get('note') as Y.Map<unknown>;
    expect((note.get('sys:children') as Y.Array<string>).toArray()).toEqual(['p1', 'p2']);
  });

  it('merges with an edit made at the same time', () => {
    const base = page('Hello world');
    const edit = encodeBlockTextUpdate(base, 'p1', 'Hello there') as Uint8Array;
    const append = encodeAppendParagraphUpdate(base, 'more', 'p2');
    expect(texts(apply(base, edit, append))).toEqual(['Hello there', 'more']);
  });

  it('turns line breaks into spaces and rejects empty or oversized text', () => {
    const base = page('a');
    expect(texts(apply(base, encodeAppendParagraphUpdate(base, 'x\ny', 'p2')))).toEqual(['a', 'x y']);
    expect(() => encodeAppendParagraphUpdate(base, '   ', 'p2')).toThrow('empty');
    expect(() => encodeAppendParagraphUpdate(base, 'x'.repeat(MAX_BLOCK_TEXT_LENGTH + 1), 'p2')).toThrow('too long');
  });

  it('refuses to add a block whose id already exists', () => {
    expect(() => encodeAppendParagraphUpdate(page('a'), 'b', 'p1')).toThrow('already exists');
  });

  it('refuses a page that has no note to put the paragraph in', () => {
    const doc = new Y.Doc();
    const blocks = doc.getMap('blocks');
    const pageBlock = new Y.Map<unknown>();
    pageBlock.set('sys:id', 'page');
    pageBlock.set('sys:flavour', AffineBlockFlavour.PAGE);
    pageBlock.set('sys:children', new Y.Array<string>());
    blocks.set('page', pageBlock);
    expect(() => encodeAppendParagraphUpdate(Y.encodeStateAsUpdate(doc), 'x', 'p2')).toThrow('note');
  });
});
