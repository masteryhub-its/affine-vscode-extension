import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { PageBlock, PageInlineSpan, ParsedPage } from '../yjs/parse-page-doc';
import { pageToMarkdown } from './page-to-markdown';

const span = (text: string, overrides: Partial<PageInlineSpan> = {}): PageInlineSpan => ({
  text,
  bold: false,
  italic: false,
  strike: false,
  underline: false,
  code: false,
  link: undefined,
  mentionUserId: undefined,
  linkedDocId: undefined,
  ...overrides,
});

const page = (blocks: readonly PageBlock[], title = 'My page'): ParsedPage => ({ title, edgelessOnly: false, blocks });
const paragraph = (...inlines: PageInlineSpan[]): PageBlock => ({ kind: PageBlockKind.PARAGRAPH, inlines });

describe('pageToMarkdown', () => {
  it('starts with the title and separates blocks with blank lines', () => {
    expect(pageToMarkdown(page([paragraph(span('One')), paragraph(span('Two'))]))).toBe('# My page\n\nOne\n\nTwo\n');
  });

  it('leaves out the title line when the page has none', () => {
    expect(pageToMarkdown(page([paragraph(span('Only'))], ''))).toBe('Only\n');
  });

  it('writes headings one level below the title', () => {
    expect(
      pageToMarkdown(
        page([
          { kind: PageBlockKind.HEADING, level: 1, inlines: [span('Big')] },
          { kind: PageBlockKind.HEADING, level: 3, inlines: [span('Small')] },
        ])
      )
    ).toBe('# My page\n\n## Big\n\n#### Small\n');
  });

  it('writes formatting, links and code spans', () => {
    const markdown = pageToMarkdown(
      page([
        paragraph(
          span('a '),
          span('b', { bold: true }),
          span(' '),
          span('c', { italic: true }),
          span(' '),
          span('d', { strike: true }),
          span(' '),
          span('e', { code: true }),
          span(' '),
          span('f', { link: 'https://x.co' })
        ),
      ])
    );
    expect(markdown).toContain('a **b** *c* ~~d~~ `e` [f](https://x.co)');
  });

  it('writes bold italic together and keeps spaces outside the marks', () => {
    expect(pageToMarkdown(page([paragraph(span('x', { bold: true, italic: true }))]))).toContain('***x***');
    expect(pageToMarkdown(page([paragraph(span('a'), span(' pad ', { bold: true }), span('b'))]))).toContain('a **pad** b');
  });

  it('escapes characters that would be read as formatting', () => {
    expect(pageToMarkdown(page([paragraph(span('2 * 3 and _x_ and [y]'))]))).toContain('2 \\* 3 and \\_x\\_ and \\[y\\]');
  });

  it('writes mentions with the person name when it is known, and linked pages as their stand-in', () => {
    const markdown = pageToMarkdown(page([paragraph(span('@x', { mentionUserId: 'u1' }), span(' and '), span('Linked page', { linkedDocId: 'd1' }))]), {
      people: { u1: { name: 'Ada', avatarUrl: undefined } },
    });
    expect(markdown).toContain('@Ada and Linked page');
  });

  it('writes lists with their nesting, numbers and to-dos', () => {
    const list = (kind: PageListKind, depth: number, text: string, checked = false): PageBlock => ({ kind: PageBlockKind.LIST, list: kind, depth, checked, inlines: [span(text)] });
    const markdown = pageToMarkdown(
      page([
        list(PageListKind.BULLETED, 0, 'a'),
        list(PageListKind.BULLETED, 1, 'b'),
        list(PageListKind.NUMBERED, 0, 'one'),
        list(PageListKind.NUMBERED, 0, 'two'),
        list(PageListKind.TODO, 0, 'open'),
        list(PageListKind.TODO, 0, 'done', true),
      ])
    );
    expect(markdown).toBe('# My page\n\n- a\n  - b\n\n1. one\n2. two\n\n- [ ] open\n- [x] done\n');
  });

  it('writes quotes, dividers and code', () => {
    const markdown = pageToMarkdown(page([{ kind: PageBlockKind.QUOTE, inlines: [span('wise')] }, { kind: PageBlockKind.DIVIDER }, { kind: PageBlockKind.CODE, language: 'ts', text: 'a\nb' }]));
    expect(markdown).toBe('# My page\n\n> wise\n\n---\n\n```ts\na\nb\n```\n');
  });

  it('uses a longer fence when the code itself contains a fence', () => {
    expect(pageToMarkdown(page([{ kind: PageBlockKind.CODE, language: '', text: '```\nx\n```' }]))).toContain('````\n```\nx\n```\n````');
  });

  it('writes tables with a header row', () => {
    const markdown = pageToMarkdown(
      page([
        {
          kind: PageBlockKind.TABLE,
          rows: [
            ['Name', 'Status'],
            ['A | B', 'ok'],
          ],
        },
      ])
    );
    expect(markdown).toBe('# My page\n\n| Name | Status |\n| --- | --- |\n| A \\| B | ok |\n');
  });

  it('writes callouts, bookmarks, images, attachments, linked pages and formulas', () => {
    const markdown = pageToMarkdown(
      page([
        { kind: PageBlockKind.CALLOUT, emoji: '💡', inlines: [span('Note')] },
        { kind: PageBlockKind.BOOKMARK, url: 'https://x.co', title: 'X' },
        { kind: PageBlockKind.IMAGE, caption: 'Diagram', sourceId: 'b1' },
        { kind: PageBlockKind.ATTACHMENT, name: 'spec.pdf', size: '12kb', sourceId: 'b2' },
        { kind: PageBlockKind.LINKED_DOC, docId: 'd', title: 'Handbook' },
        { kind: PageBlockKind.LATEX, latex: 'x^2' },
      ])
    );
    expect(markdown).toBe('# My page\n\n> 💡 Note\n\n[X](https://x.co)\n\n[Image: Diagram]\n\n[Attachment: spec.pdf (12kb)]\n\n[Handbook]\n\n$$\nx^2\n$$\n');
  });

  it('says so when the page is a canvas', () => {
    expect(pageToMarkdown({ title: 'Board', edgelessOnly: true, blocks: [] })).toBe('# Board\n\n_This page is a whiteboard. Open it in AFFiNE to see it._\n');
  });

  it('keeps empty paragraphs out', () => {
    expect(pageToMarkdown(page([paragraph(span('a')), paragraph(), paragraph(span('b'))]))).toBe('# My page\n\na\n\nb\n');
  });
});
