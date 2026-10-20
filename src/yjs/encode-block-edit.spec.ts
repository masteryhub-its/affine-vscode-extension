import * as Y from 'yjs';
import { AffineErrorCode } from '../errors/affine-error';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { parseNewBlock } from '../document/new-block';
import { encodePageWithBlocks, encodeAppendBlocksUpdate, encodeAppendBlockUpdate, encodeAppendParagraphUpdate, encodeBlockTextUpdate, MAX_BLOCK_TEXT_LENGTH } from './encode-block-edit';
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

function addBlock(base: Uint8Array, id: string, flavour: AffineBlockFlavour, text: string, extra: Record<string, unknown> = {}): Uint8Array {
  const doc = apply(base);
  const blocks = doc.getMap('blocks');
  const block = new Y.Map<unknown>();
  block.set('sys:id', id);
  block.set('sys:flavour', flavour);
  block.set('sys:children', new Y.Array<string>());
  const content = new Y.Text();
  content.insert(0, text);
  block.set('prop:text', content);
  for (const [key, value] of Object.entries(extra)) {
    block.set(key, value);
  }
  blocks.set(id, block);
  return Y.encodeStateAsUpdate(doc);
}

function textOf(doc: Y.Doc, id: string): string {
  return ((doc.getMap('blocks').get(id) as Y.Map<unknown>).get('prop:text') as Y.Text).toJSON();
}

describe('code blocks and table cells', () => {
  it('keeps the line breaks when a code block is edited', () => {
    const base = addBlock(page('x'), 'code1', AffineBlockFlavour.CODE, 'line one\nline two', { 'prop:language': 'ts' });
    const after = apply(base, encodeBlockTextUpdate(base, 'code1', 'line one\nline 2\nline three') as Uint8Array);
    expect(textOf(after, 'code1')).toBe('line one\nline 2\nline three');
  });

  it('turns Windows line breaks in code into plain ones', () => {
    const base = addBlock(page('x'), 'code1', AffineBlockFlavour.CODE, 'a');
    expect(textOf(apply(base, encodeBlockTextUpdate(base, 'code1', 'a\r\nb') as Uint8Array), 'code1')).toBe('a\nb');
  });

  it('still limits the length of code', () => {
    const base = addBlock(page('x'), 'code1', AffineBlockFlavour.CODE, 'a');
    expect(() => encodeBlockTextUpdate(base, 'code1', 'x'.repeat(MAX_BLOCK_TEXT_LENGTH + 1))).toThrow('too long');
  });

  it('edits the text of a table cell on one line', () => {
    const base = addBlock(page('x'), 'cell1', AffineBlockFlavour.TABLE_CELL, 'old');
    expect(textOf(apply(base, encodeBlockTextUpdate(base, 'cell1', 'new\nvalue') as Uint8Array), 'cell1')).toBe('new value');
  });
});

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

  it('keeps bold and links on the text that stays when other text changes', () => {
    const doc = apply(page('hello world'));
    const text = (doc.getMap('blocks').get('p1') as Y.Map<unknown>).get('prop:text') as Y.Text;
    text.format(0, 5, { bold: true });
    text.format(6, 5, { link: 'https://example.com' });
    const formatted = Y.encodeStateAsUpdate(doc);
    const after = apply(formatted, encodeBlockTextUpdate(formatted, 'p1', 'hello brave world') as Uint8Array);
    const delta = ((after.getMap('blocks').get('p1') as Y.Map<unknown>).get('prop:text') as Y.Text).toDelta() as unknown[];
    expect(JSON.stringify(delta)).toContain('"insert":"hello","attributes":{"bold":true}');
    expect(JSON.stringify(delta)).toContain('"attributes":{"link":"https://example.com"}');
    expect(texts(after)).toEqual(['hello brave world']);
  });

  it.each([
    ['a mention', { mention: { member: 'u1' } }],
    ['a linked page', { reference: { type: 'LinkedPage', pageId: 'd1' } }],
  ])('refuses a block with %s, because its shown text is not its stored text', (_name, attributes) => {
    const doc = apply(page('plain'));
    const text = (doc.getMap('blocks').get('p1') as Y.Map<unknown>).get('prop:text') as Y.Text;
    text.format(0, 2, attributes);
    const marked = Y.encodeStateAsUpdate(doc);
    expect(() => encodeBlockTextUpdate(marked, 'p1', 'changed')).toThrow('mention');
    try {
      encodeBlockTextUpdate(marked, 'p1', 'changed');
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

describe('encodeAppendBlockUpdate', () => {
  const append = (line: string): Y.Doc => {
    const base = page('first');
    return apply(base, encodeAppendBlockUpdate(base, parseNewBlock(line), 'n1'));
  };
  const block = (doc: Y.Doc): Y.Map<unknown> => doc.getMap('blocks').get('n1') as Y.Map<unknown>;
  const delta = (doc: Y.Doc): unknown[] => (block(doc).get('prop:text') as Y.Text).toDelta() as unknown[];

  it('adds a heading of the right level', () => {
    const doc = append('## Goals');
    expect(block(doc).get('sys:flavour')).toBe(AffineBlockFlavour.PARAGRAPH);
    expect(block(doc).get('prop:type')).toBe('h2');
    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks[1]).toMatchObject({ kind: PageBlockKind.HEADING, level: 2 });
  });

  it('adds a quote', () => {
    expect(block(append('> said')).get('prop:type')).toBe('quote');
  });

  it.each([
    ['- one', 'bulleted', false],
    ['1. one', 'numbered', false],
    ['[x] one', 'todo', true],
    ['[] one', 'todo', false],
  ])('adds the list item %s', (line, type, checked) => {
    const doc = append(line);
    expect(block(doc).get('sys:flavour')).toBe(AffineBlockFlavour.LIST);
    expect(block(doc).get('prop:type')).toBe(type);
    expect(block(doc).get('prop:checked')).toBe(checked);
    expect((block(doc).get('prop:text') as Y.Text).toJSON()).toBe('one');
  });

  it('adds a code block with its language', () => {
    const doc = append('```ts const x = 1;');
    expect(block(doc).get('sys:flavour')).toBe(AffineBlockFlavour.CODE);
    expect(block(doc).get('prop:language')).toBe('ts');
    expect((block(doc).get('prop:text') as Y.Text).toJSON()).toBe('const x = 1;');
  });

  it('adds a divider, which has no text', () => {
    const doc = append('---');
    expect(block(doc).get('sys:flavour')).toBe(AffineBlockFlavour.DIVIDER);
    expect(block(doc).has('prop:text')).toBe(false);
    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks.map((item) => item.kind)).toEqual([PageBlockKind.PARAGRAPH, PageBlockKind.DIVIDER]);
  });

  it('stores bold and links as formatting on the text', () => {
    const doc = append('a **b** [c](https://example.com)');
    expect(delta(doc)).toEqual([{ insert: 'a ' }, { insert: 'b', attributes: { bold: true } }, { insert: ' ' }, { insert: 'c', attributes: { link: 'https://example.com' } }]);
  });

  it('puts the block at the end of the page note', () => {
    const doc = append('# Title');
    expect(((doc.getMap('blocks').get('note') as Y.Map<unknown>).get('sys:children') as Y.Array<string>).toArray()).toEqual(['p1', 'n1']);
  });

  it('refuses an empty paragraph or heading but allows an empty list item', () => {
    const base = page('first');
    expect(() => encodeAppendBlockUpdate(base, { kind: 'heading', level: 1, segments: [] }, 'n1')).toThrow('empty');
    expect(() => encodeAppendBlockUpdate(base, { kind: 'paragraph', segments: [] }, 'n1')).toThrow('empty');
    expect(() => encodeAppendBlockUpdate(base, parseNewBlock('- '), 'n1')).not.toThrow();
  });

  it('refuses text over the limit and an id that is already used', () => {
    const base = page('first');
    expect(() => encodeAppendBlockUpdate(base, parseNewBlock('x'.repeat(MAX_BLOCK_TEXT_LENGTH + 1)), 'n1')).toThrow('too long');
    expect(() => encodeAppendBlockUpdate(base, parseNewBlock('x'), 'p1')).toThrow('already exists');
  });
});

describe('encodeAppendBlocksUpdate', () => {
  it('adds several blocks in order, keeping the lines of code', () => {
    const base = page('first');
    let next = 0;
    const doc = apply(
      base,
      encodeAppendBlocksUpdate(base, [parseNewBlock('# Title'), { kind: 'code', language: 'ts', text: 'a\nb' }, parseNewBlock('last')], () => `n${(next += 1)}`)
    );
    expect(((doc.getMap('blocks').get('note') as Y.Map<unknown>).get('sys:children') as Y.Array<string>).toArray()).toEqual(['p1', 'n1', 'n2', 'n3']);
    expect(textOf(doc, 'n2')).toBe('a\nb');
  });

  it('adds nothing and fails cleanly when one block is not acceptable', () => {
    const base = page('first');
    expect(() => encodeAppendBlocksUpdate(base, [parseNewBlock('ok'), { kind: 'paragraph', segments: [] }], () => 'x')).toThrow('empty');
  });
});

describe('encodePageWithBlocks', () => {
  it('returns the whole page with the blocks added, ready to be saved as a new page', () => {
    const base = page('first');
    let next = 0;
    const doc = apply(encodePageWithBlocks(base, [parseNewBlock('## Added')], () => `n${(next += 1)}`));
    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks.map((block) => block.kind)).toEqual([PageBlockKind.PARAGRAPH, PageBlockKind.HEADING]);
  });

  it('returns the page unchanged when there is nothing to add', () => {
    const base = page('first');
    expect(encodePageWithBlocks(base, [], () => 'x')).toBe(base);
  });
});
