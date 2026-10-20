import type { PageInlineSpan, ParsedPage } from '../yjs/parse-page-doc';
import { renderPageErrorHtml, renderPageHtml, renderPageLoadingHtml } from './render-page-html';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';

const nonce = 'n1';
const cspSource = 'https://example';
const url = 'https://affine.example/workspace/ws/doc';

function page(partial: Partial<ParsedPage> & Pick<ParsedPage, 'blocks'>): ParsedPage {
  return {
    title: partial.title ?? 'Standup',
    edgelessOnly: partial.edgelessOnly ?? false,
    blocks: partial.blocks,
  };
}

describe('renderPageHtml', () => {
  it('renders headings, bold text, lists, and code from fetched blocks', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Standup',
        blocks: [
          {
            kind: PageBlockKind.HEADING,
            level: 2,
            inlines: [{ text: 'Goals', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
          },
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [
              { text: 'Ship ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
              { text: 'today', bold: true, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
            ],
          },
          {
            kind: PageBlockKind.LIST,
            list: PageListKind.BULLETED,
            checked: false,
            depth: 0,
            inlines: [{ text: 'One', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
          },
          { kind: PageBlockKind.CODE, language: 'ts', text: 'const x = 1;' },
        ],
      }),
      fallbackTitle: 'Untitled',
      url,
      nonce,
      cspSource,
    });

    expect(html).toContain('<h1>Standup</h1>');
    expect(html).toContain('<h2 id="h-0">');
    expect(html).toContain('Goals');
    expect(html).toContain('<strong>today</strong>');
    expect(html).toContain('One');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('id="open-external"');
    expect(html).not.toContain('<iframe');
  });

  it('renders mentions and links as clickable anchors that open outside the webview', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Spec',
        blocks: [
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [
              { text: 'Ask ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
              { text: '@mention', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: 'user-1', linkedDocId: undefined },
              { text: ' and ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
              { text: 'the guide', bold: false, italic: false, strike: false, underline: false, code: false, link: 'https://example.com/spec', mentionUserId: undefined, linkedDocId: undefined },
            ],
          },
          { kind: PageBlockKind.LINKED_DOC, docId: 'doc-42', title: 'API Handbook' },
        ],
      }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
      mentionPeople: { 'user-1': { name: 'Ada', avatarUrl: 'https://affine.example/api/avatars/u1' } },
    });
    expect(html).toContain('<a class="mention" href="https://affine.example/workspace/ws/doc">');
    expect(html).toContain('@Ada');
    expect(html).toContain('<a href="https://example.com/spec">the guide</a>');
    expect(html).toContain('<a class="linked-doc" href="https://affine.example/workspace/ws/doc-42">API Handbook</a>');
    expect(html).toContain("closest('a[href]')");
    expect(html).toContain('cursor: pointer');
  });

  it('renders authors, mention chips, and linked documents', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Spec',
        blocks: [
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [
              { text: 'Ask ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
              { text: '@mention', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: 'user-1', linkedDocId: undefined },
            ],
          },
          { kind: PageBlockKind.LINKED_DOC, docId: 'doc-42', title: 'API Handbook' },
        ],
      }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
      createdBy: { name: 'Ada', avatarUrl: 'https://affine.example/api/avatars/a' },
      updatedBy: { name: 'Sara', avatarUrl: undefined },
      mentionPeople: { 'user-1': { name: 'Ada', avatarUrl: 'https://affine.example/api/avatars/u1' } },
    });
    expect(html).toContain('class="authors"');
    expect(html).toContain('Ada');
    expect(html).toContain('Sara');
    expect(html).toContain('@Ada');
    expect(html).toContain('https://affine.example/api/avatars/u1');
    expect(html).toContain('API Handbook');
    expect(html).toContain('class="linked-doc"');
    expect(html).toContain('img-src');
  });

  it('shows a creator only once when they also last updated the page', () => {
    const html = renderPageHtml({
      page: page({ title: 'Untitled', blocks: [] }),
      fallbackTitle: 'Untitled',
      url,
      nonce,
      cspSource,
      createdBy: { name: 'editor', avatarUrl: 'https://affine.example/api/avatars/a' },
      updatedBy: { name: 'editor', avatarUrl: 'https://affine.example/api/avatars/a?size=128' },
    });
    expect(html.split('class="author"').length - 1).toBe(1);
    expect(html).toContain('editor');
  });

  it('explains an edgeless-only page and still offers AFFiNE', () => {
    const html = renderPageHtml({
      page: page({ title: 'Board', edgelessOnly: true, blocks: [] }),
      fallbackTitle: 'Board',
      url,
      nonce,
      cspSource,
    });
    expect(html).toContain('canvas');
    expect(html).toContain('id="open-external"');
  });

  it('renders a loading state', () => {
    const html = renderPageLoadingHtml({ title: 'Standup', nonce, cspSource, serverUrl: 'https://affine.example' });
    expect(html).toContain('Standup');
    expect(html).toContain('Loading');
    expect(html).not.toContain('<iframe');
  });

  it('renders a load error without an iframe', () => {
    const html = renderPageErrorHtml({
      title: 'Standup',
      message: 'Workspace document request failed with HTTP 404',
      url,
      nonce,
      cspSource,
      serverUrl: 'https://affine.example',
    });
    expect(html).toContain('Could not load');
    expect(html).toContain('HTTP 404');
    expect(html).toContain('id="open-external"');
  });

  it('escapes hostile page text', () => {
    const html = renderPageHtml({
      page: page({
        title: '<script>alert(1)</script>',
        blocks: [
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [{ text: '<img onerror=1>', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
          },
        ],
      }),
      fallbackTitle: 'x',
      url,
      nonce,
      cspSource,
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img onerror=1>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img onerror=1&gt;');
  });

  it('renders a javascript bookmark as plain text without an href', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Links',
        blocks: [{ kind: PageBlockKind.BOOKMARK, url: 'javascript:alert(1)', title: 'Bad' }],
      }),
      fallbackTitle: 'Links',
      url,
      nonce,
      cspSource,
    });
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('Bad');
  });

  it('scopes img-src CSP to the page server origin', () => {
    const html = renderPageHtml({
      page: page({ title: 'Spec', blocks: [] }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
    });
    expect(html).toContain('img-src https://example https://affine.example data:');
    expect(html).not.toContain('img-src https://example https: http: data:');
  });

  it('renders tables, callouts, same-origin images, and attachments', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Spec',
        blocks: [
          { kind: PageBlockKind.TABLE, rows: [['Name', 'Status']] },
          {
            kind: PageBlockKind.CALLOUT,
            emoji: '💡',
            inlines: [{ text: 'Watch this', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined }],
          },
          { kind: PageBlockKind.IMAGE, caption: 'Diagram', sourceId: 'blob-2' },
          { kind: PageBlockKind.ATTACHMENT, name: 'spec.pdf', size: '12kb', sourceId: 'blob-1' },
        ],
      }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
    });
    expect(html).toContain('<table class="preview-table">');
    expect(html).toContain('Name');
    expect(html).toContain('class="callout"');
    expect(html).toContain('Watch this');
    expect(html).toContain('https://affine.example/api/workspaces/ws/blobs/blob-2');
    expect(html).toContain('spec.pdf (12kb)');
    expect(html).toContain('https://affine.example/api/workspaces/ws/blobs/blob-1');
  });

  it('renders highlighted text as a mark', () => {
    const html = renderPageHtml({
      page: page({
        title: 'Spec',
        blocks: [
          {
            kind: PageBlockKind.PARAGRAPH,
            inlines: [
              { text: 'Keep ', bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined },
              {
                text: 'this',
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
      }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
    });
    expect(html).toContain('<mark class="highlight"');
    expect(html).toContain('this');
    expect(html).toContain('var(--affine-text-highlight-yellow)');
    expect(html).not.toContain('javascript:');
  });

  it('renders page tags in the preview chrome', () => {
    const html = renderPageHtml({
      page: page({ title: 'Spec', blocks: [] }),
      fallbackTitle: 'Spec',
      url,
      nonce,
      cspSource,
      tags: ['docs', 'api'],
    });
    expect(html).toContain('class="page-tags"');
    expect(html).toContain('docs');
    expect(html).toContain('api');
  });

  describe('layout', () => {
    const plain = { bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined };
    const text = (value: string): ParsedPage['blocks'][number] => ({ kind: PageBlockKind.PARAGRAPH, inlines: [{ text: value, ...plain }] });
    const heading = (level: 1 | 2 | 3, value: string): ParsedPage['blocks'][number] => ({ kind: PageBlockKind.HEADING, level, inlines: [{ text: value, ...plain }] });
    const listItem = (list: PageListKind, value: string, checked = false, depth = 0): ParsedPage['blocks'][number] => ({
      kind: PageBlockKind.LIST,
      list,
      checked,
      depth,
      inlines: [{ text: value, ...plain }],
    });
    const render = (blocks: ParsedPage['blocks']): string => renderPageHtml({ page: page({ title: 'Handbook', blocks }), fallbackTitle: 'Handbook', url, nonce, cspSource });

    it('puts a read-only marker and the actions in a top bar', () => {
      const html = render([text('x')]);
      expect(html).toContain('class="topbar"');
      expect(html).toContain('Read-only');
      expect(html).toContain('data-message="copyLink"');
      expect(html).toContain('id="open-external"');
    });

    it('adds an outline for a page with several headings, linked to ids on the headings', () => {
      const html = render([heading(2, 'Goals'), text('a'), heading(2, 'Rollout')]);
      expect(html).toContain('aria-label="On this page"');
      expect(html).toContain('data-target="h-0"');
      expect(html).toContain('data-target="h-2"');
      expect(html).toContain('<h2 id="h-0">');
      expect(html).toContain('<h2 id="h-2">');
    });

    it('leaves the outline out when there is nothing to navigate', () => {
      expect(render([heading(2, 'Only one'), text('a')])).not.toContain('On this page');
      expect(render([text('no headings')])).not.toContain('On this page');
    });

    it('numbers a numbered list 1, 2, 3 instead of 1 every time', () => {
      const html = render([listItem(PageListKind.NUMBERED, 'a'), listItem(PageListKind.NUMBERED, 'b'), listItem(PageListKind.NUMBERED, 'c')]);
      expect(html).toContain('>1.<');
      expect(html).toContain('>2.<');
      expect(html).toContain('>3.<');
    });

    it('keeps a to-do checkbox on the same row as its text, with the right state for assistive technology', () => {
      const html = render([listItem(PageListKind.TODO, 'Draft outline', true), listItem(PageListKind.TODO, 'Review it', false)]);
      expect(html).toContain('role="checkbox" aria-checked="true"');
      expect(html).toContain('role="checkbox" aria-checked="false"');
      expect(html).toContain('class="todo done"');
      expect(html).toContain('<span class="li-text">Draft outline</span>');
      expect(html).not.toContain('<input');
    });

    it('wraps code in a block that names the language and offers a copy button', () => {
      const html = render([{ kind: PageBlockKind.CODE, language: 'ts', text: 'const a = 1;' }]);
      expect(html).toContain('class="code-block"');
      expect(html).toContain('class="code-head"');
      expect(html).toContain('>ts<');
      expect(html).toContain('data-copy-code');
    });

    it('does not offer a language label for plain text code', () => {
      const html = render([{ kind: PageBlockKind.CODE, language: '', text: 'x' }]);
      expect(html).toContain('>text<');
    });

    it('uses no hard-coded hex colours in the markup', () => {
      expect(render([heading(2, 'A'), text('b'), heading(2, 'C')])).not.toMatch(/#[0-9a-fA-F]{6}\b/u);
    });
  });

  describe('inline editing', () => {
    const plain = { bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined };
    const run = (value: string, extra: Partial<Omit<typeof plain, 'link' | 'mentionUserId'>> & { link?: string; mentionUserId?: string } = {}): readonly PageInlineSpan[] => [
      { text: value, ...plain, ...extra },
    ];
    const blocks: ParsedPage['blocks'] = [
      { kind: PageBlockKind.HEADING, level: 2, blockId: 'h1', inlines: run('Goals') },
      { kind: PageBlockKind.PARAGRAPH, blockId: 'p1', inlines: run('Plain <text>') },
      { kind: PageBlockKind.PARAGRAPH, blockId: 'p2', inlines: run('Mention one', { mentionUserId: 'u1' }) },
      { kind: PageBlockKind.LIST, list: PageListKind.BULLETED, checked: false, depth: 0, blockId: 'l1', inlines: run('Item') },
      { kind: PageBlockKind.QUOTE, blockId: 'q1', inlines: run('Said') },
      { kind: PageBlockKind.CODE, language: 'ts', text: 'x' },
      { kind: PageBlockKind.DIVIDER },
    ];
    const render = (editable: boolean, parsed: ParsedPage = page({ title: 'T', blocks })): string => renderPageHtml({ page: parsed, fallbackTitle: 'T', url, nonce, cspSource, editable });

    it('is read-only unless editing is switched on', () => {
      const html = render(false);
      expect(html).not.toContain('contenteditable');
      expect(html).not.toContain('data-block=');
      expect(html).toContain('Read-only');
    });

    it('lets plain text blocks be edited where they are', () => {
      const html = render(true);
      for (const id of ['h1', 'p1', 'l1', 'q1']) {
        expect(html).toContain(`data-block="${id}"`);
      }
      expect(html).toContain('contenteditable="plaintext-only"');
      expect(html).toContain('class="editable"');
    });

    it('does not offer inline editing for a block with a mention, whose shown text is not its stored text', () => {
      expect(render(true)).not.toContain('data-block="p2"');
    });

    it('lets text with bold or a link be edited too', () => {
      const html = render(true, page({ title: 'T', blocks: [{ kind: PageBlockKind.PARAGRAPH, blockId: 'b1', inlines: run('Bold one', { bold: true }) }] }));
      expect(html).toContain('data-block="b1"');
    });

    it('opens a link inside editable text only with Ctrl or Cmd, so a plain click places the cursor', () => {
      const html = render(true);
      expect(html).toContain("link.closest('[data-block]') && !event.ctrlKey && !event.metaKey");
    });

    it('lets code blocks be edited with their line breaks, and table cells one by one', () => {
      const html = render(
        true,
        page({
          title: 'T',
          blocks: [
            { kind: PageBlockKind.CODE, language: 'ts', text: 'a\nb', blockId: 'c1' },
            { kind: PageBlockKind.TABLE, rows: [['A', 'B']], cellIds: [['x', 'y']] },
          ],
        })
      );
      expect(html).toMatch(/<code[^>]*data-block="c1"[^>]*data-multiline="1"/u);
      expect(html).toMatch(/<td[^>]*data-block="x"[^>]*>A<\/td>/u);
      expect(html).toMatch(/<td[^>]*data-block="y"[^>]*>B<\/td>/u);
      expect(html.match(/<td[^>]*data-multiline/gu)).toBeNull();
    });

    it('keeps code and table cells read-only when editing is off', () => {
      const html = render(
        false,
        page({
          title: 'T',
          blocks: [
            { kind: PageBlockKind.CODE, language: 'ts', text: 'a', blockId: 'c1' },
            { kind: PageBlockKind.TABLE, rows: [['A']], cellIds: [['x']] },
          ],
        })
      );
      expect(html).not.toContain('data-block="');
      expect(html).not.toContain('contenteditable');
    });

    it('does not offer inline editing for dividers or code without an id', () => {
      const html = render(true);
      expect(html.match(/<(?:p|h\d|span|blockquote)\b[^>]*\sdata-block="/gu)?.length).toBe(4);
    });

    it('keeps the text of an editable block escaped', () => {
      const html = render(true);
      expect(html).toContain('Plain &lt;text&gt;');
      expect(html).not.toContain('Plain <text>');
    });

    it('adds a place to write a new paragraph at the end', () => {
      const html = render(true);
      expect(html).toContain('class="editable new-block"');
      expect(html).toContain('data-placeholder="Write something…"');
    });

    it('tells the reader they can click, and has a status line that is announced', () => {
      const html = render(true);
      expect(html).toContain('Click text to edit');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).not.toContain('Read-only');
    });

    it('sends edits as messages and listens for the result', () => {
      const html = render(true);
      expect(html).toContain("type: 'editBlock'");
      expect(html).toContain("type: 'appendParagraph'");
      expect(html).toContain("addEventListener('message'");
    });

    it('does not offer to write on a canvas page', () => {
      const html = render(true, page({ title: 'T', edgelessOnly: true, blocks: [] }));
      expect(html).not.toContain('class="editable new-block"');
      expect(html).not.toContain('contenteditable="plaintext-only"');
    });

    it('cancels with Escape and saves with Enter or when focus leaves', () => {
      const html = render(true);
      expect(html).toContain("event.key === 'Escape'");
      expect(html).toContain("event.key === 'Enter'");
      expect(html).toContain("addEventListener('blur'");
    });
  });
});
