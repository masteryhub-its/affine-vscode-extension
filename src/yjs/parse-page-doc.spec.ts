import * as Y from 'yjs';
import { parsePageDoc } from './parse-page-doc';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';

interface EncodeBlockInput {
  readonly id: string;
  readonly flavour: string;
  readonly children?: readonly string[];
  readonly title?: string;
  readonly text?: string;
  readonly boldStart?: number;
  readonly boldLength?: number;
  readonly highlightStart?: number;
  readonly highlightLength?: number;
  readonly highlightBackground?: string;
  readonly type?: string;
  readonly checked?: boolean;
  readonly language?: string;
  readonly displayMode?: string;
  readonly url?: string;
  readonly caption?: string;
  readonly sourceId?: string;
  readonly latex?: string;
  readonly pageId?: string;
  readonly emoji?: string;
  readonly name?: string;
  readonly size?: string;
}

function encodePage(blocks: readonly EncodeBlockInput[]): Uint8Array {
  const doc = new Y.Doc();
  const root = doc.getMap('blocks');
  for (const input of blocks) {
    const block = new Y.Map<unknown>();
    block.set('sys:id', input.id);
    block.set('sys:flavour', input.flavour);
    const children = new Y.Array<string>();
    if (input.children !== undefined) {
      children.insert(0, [...input.children]);
    }
    block.set('sys:children', children);
    if (input.title !== undefined) {
      const title = new Y.Text();
      title.insert(0, input.title);
      block.set('prop:title', title);
    }
    if (input.text !== undefined) {
      const text = new Y.Text();
      text.insert(0, input.text);
      if (input.boldStart !== undefined && input.boldLength !== undefined) {
        text.format(input.boldStart, input.boldLength, { bold: true });
      }
      if (input.highlightStart !== undefined && input.highlightLength !== undefined && input.highlightBackground !== undefined) {
        text.format(input.highlightStart, input.highlightLength, { background: input.highlightBackground });
      }
      block.set('prop:text', text);
    }
    if (input.type !== undefined) {
      block.set('prop:type', input.type);
    }
    if (input.checked !== undefined) {
      block.set('prop:checked', input.checked);
    }
    if (input.language !== undefined) {
      block.set('prop:language', input.language);
    }
    if (input.displayMode !== undefined) {
      block.set('prop:displayMode', input.displayMode);
    }
    if (input.url !== undefined) {
      block.set('prop:url', input.url);
    }
    if (input.caption !== undefined) {
      block.set('prop:caption', input.caption);
    }
    if (input.sourceId !== undefined) {
      block.set('prop:sourceId', input.sourceId);
    }
    if (input.latex !== undefined) {
      block.set('prop:latex', input.latex);
    }
    if (input.pageId !== undefined) {
      block.set('prop:pageId', input.pageId);
    }
    if (input.emoji !== undefined) {
      block.set('prop:emoji', input.emoji);
    }
    if (input.name !== undefined) {
      block.set('prop:name', input.name);
    }
    if (input.size !== undefined) {
      block.set('prop:size', input.size);
    }
    root.set(input.id, block);
  }
  return Y.encodeStateAsUpdate(doc);
}

describe('parsePageDoc', () => {
  it('reads the page title and paragraph inlines including bold', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['note'], title: 'Standup' },
      { id: 'note', flavour: 'affine:note', children: ['p1'] },
      { id: 'p1', flavour: 'affine:paragraph', type: 'text', text: 'Hello world', boldStart: 6, boldLength: 5 },
    ]);

    expect(parsePageDoc(bin)).toEqual({
      title: 'Standup',
      edgelessOnly: false,
      blocks: [
        {
          kind: PageBlockKind.PARAGRAPH,
          inlines: [
            { text: 'Hello ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
            { text: 'world', bold: true, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
          ],
        },
      ],
    });
  });

  it('reads highlighted text background from Yjs attributes', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['note'], title: 'Standup' },
      { id: 'note', flavour: 'affine:note', children: ['p1'] },
      {
        id: 'p1',
        flavour: 'affine:paragraph',
        type: 'text',
        text: 'Hello world',
        highlightStart: 6,
        highlightLength: 5,
        highlightBackground: 'var(--affine-text-highlight-yellow)',
      },
    ]);

    expect(parsePageDoc(bin)).toEqual({
      title: 'Standup',
      edgelessOnly: false,
      blocks: [
        {
          kind: PageBlockKind.PARAGRAPH,
          inlines: [
            { text: 'Hello ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
            {
              text: 'world',
              bold: false,
              italic: false,
              strike: false,
              underline: false,
              code: false,
              link: undefined,
              mentionUserId: undefined,
              linkedDocId: undefined,
              background: 'var(--affine-text-highlight-yellow)',
            },
          ],
        },
      ],
    });
  });

  it('maps headings, quotes, lists, code, and dividers', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['note'], title: 'Notes' },
      {
        id: 'note',
        flavour: 'affine:note',
        children: ['h', 'q', 'l', 'todo', 'c', 'd'],
      },
      { id: 'h', flavour: 'affine:paragraph', type: 'h2', text: 'Goals' },
      { id: 'q', flavour: 'affine:paragraph', type: 'quote', text: 'Ship it' },
      { id: 'l', flavour: 'affine:list', type: 'bulleted', text: 'One' },
      { id: 'todo', flavour: 'affine:list', type: 'todo', checked: true, text: 'Done' },
      { id: 'c', flavour: 'affine:code', language: 'ts', text: 'const x = 1;' },
      { id: 'd', flavour: 'affine:divider' },
    ]);

    const parsed = parsePageDoc(bin);
    expect(parsed.blocks.map((block) => block.kind)).toEqual(['heading', 'quote', 'list', 'list', 'code', 'divider']);
    expect(parsed.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: PageBlockKind.HEADING, level: 2 }),
        expect.objectContaining({ kind: PageBlockKind.LIST, list: PageListKind.BULLETED, depth: 0 }),
        expect.objectContaining({ kind: PageBlockKind.LIST, list: PageListKind.TODO, checked: true }),
        expect.objectContaining({ kind: PageBlockKind.CODE, language: 'ts', text: 'const x = 1;' }),
      ])
    );
  });

  it('skips edgeless-only notes and surface blocks', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['canvas', 'hidden', 'note'], title: 'Mixed' },
      { id: 'canvas', flavour: 'affine:surface', children: [] },
      { id: 'hidden', flavour: 'affine:note', displayMode: 'edgeless', children: ['p-hidden'] },
      { id: 'p-hidden', flavour: 'affine:paragraph', type: 'text', text: 'Secret' },
      { id: 'note', flavour: 'affine:note', children: ['p'] },
      { id: 'p', flavour: 'affine:paragraph', type: 'text', text: 'Visible' },
    ]);

    expect(parsePageDoc(bin).blocks).toEqual([
      {
        kind: PageBlockKind.PARAGRAPH,
        inlines: [{ text: 'Visible', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
      },
    ]);
  });

  it('returns an empty page when there are no doc-mode notes', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['canvas'], title: 'Board' },
      { id: 'canvas', flavour: 'affine:surface', children: [] },
    ]);

    expect(parsePageDoc(bin)).toEqual({
      title: 'Board',
      edgelessOnly: true,
      blocks: [],
    });
  });

  it('reads inline user mentions and linked-page references', () => {
    const doc = new Y.Doc();
    const root = doc.getMap('blocks');
    const page = new Y.Map<unknown>();
    page.set('sys:id', 'page');
    page.set('sys:flavour', 'affine:page');
    const pageChildren = new Y.Array<string>();
    pageChildren.insert(0, ['note']);
    page.set('sys:children', pageChildren);
    const title = new Y.Text();
    title.insert(0, 'Mentions');
    page.set('prop:title', title);
    root.set('page', page);

    const note = new Y.Map<unknown>();
    note.set('sys:id', 'note');
    note.set('sys:flavour', 'affine:note');
    const noteChildren = new Y.Array<string>();
    noteChildren.insert(0, ['p']);
    note.set('sys:children', noteChildren);
    root.set('note', note);

    const paragraph = new Y.Map<unknown>();
    paragraph.set('sys:id', 'p');
    paragraph.set('sys:flavour', 'affine:paragraph');
    paragraph.set('prop:type', 'text');
    const text = new Y.Text();
    text.applyDelta([
      { insert: 'See ' },
      { insert: ' ', attributes: { mention: { member: 'user-1' } } },
      { insert: ' and ' },
      { insert: ' ', attributes: { reference: { type: 'LinkedPage', pageId: 'doc-99' } } },
    ]);
    paragraph.set('prop:text', text);
    paragraph.set('sys:children', new Y.Array<string>());
    root.set('p', paragraph);

    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks).toEqual([
      {
        kind: PageBlockKind.PARAGRAPH,
        inlines: [
          { text: 'See ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
          { text: '@mention', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: 'user-1', linkedDocId: undefined },
          { text: ' and ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
          { text: 'Linked page', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: 'doc-99' },
        ],
      },
    ]);
  });

  it('reads a web link from text attributes', () => {
    const doc = new Y.Doc();
    const root = doc.getMap('blocks');
    const page = new Y.Map<unknown>();
    page.set('sys:id', 'page');
    page.set('sys:flavour', 'affine:page');
    const pageChildren = new Y.Array<string>();
    pageChildren.insert(0, ['note']);
    page.set('sys:children', pageChildren);
    page.set('prop:title', new Y.Text());
    root.set('page', page);

    const note = new Y.Map<unknown>();
    note.set('sys:id', 'note');
    note.set('sys:flavour', 'affine:note');
    const noteChildren = new Y.Array<string>();
    noteChildren.insert(0, ['p']);
    note.set('sys:children', noteChildren);
    root.set('note', note);

    const paragraph = new Y.Map<unknown>();
    paragraph.set('sys:id', 'p');
    paragraph.set('sys:flavour', 'affine:paragraph');
    paragraph.set('prop:type', 'text');
    const text = new Y.Text();
    text.applyDelta([{ insert: 'Docs', attributes: { link: 'https://example.com/spec' } }, { insert: ' ' }, { insert: 'path', attributes: { link: { url: '/workspace/ws/doc' } } }]);
    paragraph.set('prop:text', text);
    paragraph.set('sys:children', new Y.Array<string>());
    root.set('p', paragraph);

    expect(parsePageDoc(Y.encodeStateAsUpdate(doc)).blocks).toEqual([
      {
        kind: PageBlockKind.PARAGRAPH,
        inlines: [
          { text: 'Docs', bold: false, italic: false, strike: false, underline: false, code: false, link: 'https://example.com/spec', mentionUserId: undefined, linkedDocId: undefined },
          { text: ' ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
          { text: 'path', bold: false, italic: false, strike: false, underline: false, code: false, link: '/workspace/ws/doc', mentionUserId: undefined, linkedDocId: undefined },
        ],
      },
    ]);
  });

  it('reads embed-linked-doc blocks by page id', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['note'], title: 'Refs' },
      { id: 'note', flavour: 'affine:note', children: ['link'] },
      { id: 'link', flavour: 'affine:embed-linked-doc', pageId: 'doc-42', title: 'API Handbook' },
    ]);
    expect(parsePageDoc(bin).blocks).toEqual([{ kind: PageBlockKind.LINKED_DOC, docId: 'doc-42', title: 'API Handbook' }]);
  });

  it('reads tables, callouts, attachments, and image source ids', () => {
    const bin = encodePage([
      { id: 'page', flavour: 'affine:page', children: ['note'], title: 'Spec' },
      { id: 'note', flavour: 'affine:note', children: ['table', 'callout', 'file', 'img'] },
      { id: 'table', flavour: 'affine:table', children: ['r1'] },
      { id: 'r1', flavour: 'affine:table-row', children: ['c1', 'c2'] },
      { id: 'c1', flavour: 'affine:table-cell', text: 'Name' },
      { id: 'c2', flavour: 'affine:table-cell', text: 'Status' },
      { id: 'callout', flavour: 'affine:callout', emoji: '💡', children: ['p-c'] },
      { id: 'p-c', flavour: 'affine:paragraph', type: 'text', text: 'Watch this' },
      { id: 'file', flavour: 'affine:attachment', name: 'spec.pdf', size: '12kb', sourceId: 'blob-1' },
      { id: 'img', flavour: 'affine:image', caption: 'Diagram', sourceId: 'blob-2' },
    ]);
    expect(parsePageDoc(bin).blocks).toEqual([
      { kind: PageBlockKind.TABLE, rows: [['Name', 'Status']] },
      {
        kind: PageBlockKind.CALLOUT,
        emoji: '💡',
        inlines: [{ text: 'Watch this', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
      },
      { kind: PageBlockKind.ATTACHMENT, name: 'spec.pdf', size: '12kb', sourceId: 'blob-1' },
      { kind: PageBlockKind.IMAGE, caption: 'Diagram', sourceId: 'blob-2' },
    ]);
  });
});
