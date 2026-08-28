import type { ParsedPage } from '../yjs/parse-page-doc';
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
    expect(html).toContain('<h2>');
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
});
