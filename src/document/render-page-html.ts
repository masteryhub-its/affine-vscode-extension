import type { MentionPeople, PageAuthor } from '../client/affine.types';
import { buildDocumentUrl, buildWorkspaceBlobUrl, parseDocumentPageUrl, resolvePreviewHref } from '../client/document-url';
import { escapeHtml } from '../sidebar/escape-html';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { cspImgSrc } from '../utils/url-protocol';
import { renderDocumentShell } from '../ui/document-shell';
import { numberListItems } from './list-numbering';
import { extractOutline, headingAnchorId } from './outline';
import type { PageBlock, PageInlineSpan, ParsedPage } from '../yjs/parse-page-doc';

export interface RenderPageHtmlInput {
  readonly page: ParsedPage;
  readonly fallbackTitle: string;
  readonly url: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly createdBy?: PageAuthor | undefined;
  readonly updatedBy?: PageAuthor | undefined;
  readonly mentionPeople?: MentionPeople | undefined;
  readonly tags?: readonly string[] | undefined;
}

function mentionLabel(span: PageInlineSpan, people: MentionPeople): string {
  if (span.mentionUserId === undefined) {
    return span.text;
  }
  const resolved = people[span.mentionUserId]?.name;
  if (resolved === undefined || resolved.trim().length === 0) {
    return span.text.startsWith('@') ? span.text : `@${span.text}`;
  }
  return `@${resolved.trim()}`;
}

function renderMention(span: PageInlineSpan, people: MentionPeople, pageUrl: string): string {
  const person = span.mentionUserId === undefined ? undefined : people[span.mentionUserId];
  const img = person?.avatarUrl === undefined ? '' : `<img class="avatar" src="${escapeHtml(person.avatarUrl)}" alt="" />`;
  return `<a class="mention" href="${escapeHtml(pageUrl)}">${img}${escapeHtml(mentionLabel(span, people))}</a>`;
}

function renderInlines(inlines: readonly PageInlineSpan[], people: MentionPeople, pageUrl: string, serverUrl: string): string {
  return inlines
    .map((span) => {
      if (span.mentionUserId !== undefined) {
        return renderMention(span, people, pageUrl);
      }
      let html = escapeHtml(span.text);
      if (span.code) {
        html = `<code>${html}</code>`;
      }
      if (span.bold) {
        html = `<strong>${html}</strong>`;
      }
      if (span.italic) {
        html = `<em>${html}</em>`;
      }
      if (span.strike) {
        html = `<s>${html}</s>`;
      }
      if (span.underline) {
        html = `<u>${html}</u>`;
      }
      if (span.background !== undefined) {
        html = `<mark class="highlight" style="background:${escapeHtml(span.background)}">${html}</mark>`;
      }
      if (span.color !== undefined) {
        html = `<span class="text-color" style="color:${escapeHtml(span.color)}">${html}</span>`;
      }
      if (span.link !== undefined && span.link.length > 0) {
        const href = resolvePreviewHref(serverUrl, span.link);
        if (href !== undefined) {
          html = `<a href="${escapeHtml(href)}">${html}</a>`;
        }
      }
      if (span.linkedDocId !== undefined) {
        const parsed = parseDocumentPageUrl(pageUrl);
        const href = parsed === undefined ? undefined : buildDocumentUrl(parsed.serverUrl, parsed.workspaceId, span.linkedDocId);
        html = href === undefined ? `<span class="linked-doc">${html}</span>` : `<a class="linked-doc" href="${escapeHtml(href)}">${html}</a>`;
      }
      return html;
    })
    .join('');
}

interface BlockContext {
  readonly index: number;
  readonly number: number | undefined;
  readonly people: MentionPeople;
  readonly pageUrl: string;
  readonly serverUrl: string;
}

function checkboxIcon(checked: boolean): string {
  const box = '<rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/>';
  const tick = '<path d="m5.2 8.2 2 2 3.6-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${box}${checked ? tick : ''}</svg>`;
}

function renderBlock(block: PageBlock, context: BlockContext): string {
  const { people, pageUrl, serverUrl } = context;
  switch (block.kind) {
    case PageBlockKind.HEADING:
      return `<h${block.level} id="${headingAnchorId(context.index)}">${renderInlines(block.inlines, people, pageUrl, serverUrl)}</h${block.level}>`;
    case PageBlockKind.PARAGRAPH:
      return `<p>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</p>`;
    case PageBlockKind.QUOTE:
      return `<blockquote>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</blockquote>`;
    case PageBlockKind.LIST: {
      const indent = ` style="margin-left:${block.depth * 20}px"`;
      const inner = renderInlines(block.inlines, people, pageUrl, serverUrl);
      if (block.list === PageListKind.TODO) {
        return `<div class="todo${block.checked ? ' done' : ''}" role="checkbox" aria-checked="${block.checked ? 'true' : 'false'}" aria-disabled="true"${indent}><span class="check" aria-hidden="true">${checkboxIcon(block.checked)}</span><span class="li-text">${inner}</span></div>`;
      }
      const mark = block.list === PageListKind.NUMBERED ? `${context.number ?? 1}.` : '•';
      return `<div class="item"${indent}><span class="mark">${mark}</span><span class="li-text">${inner}</span></div>`;
    }
    case PageBlockKind.CODE: {
      const language = block.language.trim().length > 0 ? block.language.trim() : 'text';
      return `<div class="code-block"><div class="code-head"><span>${escapeHtml(language)}</span><button type="button" class="btn ghost" data-copy-code>Copy</button></div><pre><code class="lang-${escapeHtml(block.language)}">${escapeHtml(block.text)}</code></pre></div>`;
    }
    case PageBlockKind.DIVIDER:
      return '<hr />';
    case PageBlockKind.BOOKMARK: {
      const href = resolvePreviewHref(serverUrl, block.url);
      const label = block.title.length > 0 ? block.title : block.url;
      if (href === undefined) {
        return `<p class="bookmark">${escapeHtml(label)}</p>`;
      }
      return `<p class="bookmark"><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
    }
    case PageBlockKind.IMAGE: {
      const parsed = parseDocumentPageUrl(pageUrl);
      const src = parsed === undefined || block.sourceId.length === 0 ? undefined : buildWorkspaceBlobUrl(parsed.serverUrl, parsed.workspaceId, block.sourceId);
      if (src === undefined) {
        return `<p class="muted">[Image${block.caption.length > 0 ? `: ${escapeHtml(block.caption)}` : ''}]</p>`;
      }
      const caption = block.caption.length > 0 ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
      return `<figure class="image"><img src="${escapeHtml(src)}" alt="${escapeHtml(block.caption)}" />${caption}</figure>`;
    }
    case PageBlockKind.LATEX:
      return `<pre class="latex">${escapeHtml(block.latex)}</pre>`;
    case PageBlockKind.LINKED_DOC: {
      const parsed = parseDocumentPageUrl(pageUrl);
      const href = parsed === undefined ? undefined : buildDocumentUrl(parsed.serverUrl, parsed.workspaceId, block.docId);
      const inner = escapeHtml(block.title);
      return href === undefined ? `<p class="linked-doc">${inner}</p>` : `<p><a class="linked-doc" href="${escapeHtml(href)}">${inner}</a></p>`;
    }
    case PageBlockKind.TABLE: {
      const body = block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
      return `<table class="preview-table">${body}</table>`;
    }
    case PageBlockKind.CALLOUT:
      return `<aside class="callout"><span class="callout-emoji">${escapeHtml(block.emoji)}</span><div>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</div></aside>`;
    case PageBlockKind.ATTACHMENT: {
      const parsed = parseDocumentPageUrl(pageUrl);
      const href = parsed === undefined || block.sourceId.length === 0 ? undefined : buildWorkspaceBlobUrl(parsed.serverUrl, parsed.workspaceId, block.sourceId);
      const label = `${block.name}${block.size.length > 0 ? ` (${block.size})` : ''}`;
      if (href === undefined) {
        return `<p class="attachment">${escapeHtml(label)}</p>`;
      }
      return `<p class="attachment"><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
    }
  }
}

function renderAuthor(author: PageAuthor): string {
  const img = author.avatarUrl === undefined ? '' : `<img class="avatar" src="${escapeHtml(author.avatarUrl)}" alt="" />`;
  return `<span class="author">${img}${escapeHtml(author.name)}</span>`;
}

function isSameAuthor(left: PageAuthor, right: PageAuthor): boolean {
  return left.name.trim() === right.name.trim();
}

function renderAuthors(createdBy: PageAuthor | undefined, updatedBy: PageAuthor | undefined): string {
  if (createdBy === undefined && updatedBy === undefined) {
    return '';
  }
  const parts: string[] = [];
  if (createdBy !== undefined) {
    parts.push(renderAuthor(createdBy));
  }
  if (updatedBy !== undefined && (createdBy === undefined || !isSameAuthor(createdBy, updatedBy))) {
    parts.push(renderAuthor(updatedBy));
  }
  return `<div class="authors">${parts.join('')}</div>`;
}

function renderBody(page: ParsedPage, people: MentionPeople, pageUrl: string, serverUrl: string): string {
  if (page.edgelessOnly) {
    return '<p class="muted">This page is a canvas. Open it in AFFiNE to view the whiteboard.</p>';
  }
  if (page.blocks.length === 0) {
    return '<p class="muted">This page is empty.</p>';
  }
  const numbers = numberListItems(page.blocks);
  return page.blocks.map((block, index) => renderBlock(block, { index, number: numbers[index], people, pageUrl, serverUrl })).join('\n');
}

function renderOutline(page: ParsedPage): string {
  const items = page.edgelessOnly ? [] : extractOutline(page.blocks);
  if (items.length < 2) {
    return '';
  }
  const links = items.map((item) => `<button type="button" class="outline-item level-${item.level}" data-target="${escapeHtml(item.anchor)}">${escapeHtml(item.text)}</button>`).join('');
  return `<nav class="outline" aria-label="On this page"><p class="outline-title">On this page</p>${links}</nav>`;
}

export interface RenderPageShellInput {
  readonly title: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly serverUrl: string;
  readonly body: string;
  readonly showOpen: boolean;
  /** The "On this page" panel, or empty when the page has too few headings to need one. */
  readonly outline?: string;
}

const PAGE_CSS = String.raw`
a { cursor: pointer; text-decoration: underline; }
.topbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding: 8px 28px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--line); }
.topbar .actions { margin-bottom: 0; }
.topbar .chip { --chip: var(--subtle); --chip-fg: var(--muted); font-weight: 500; }
.page-body { padding: 20px 28px 56px; }
.doc-layout { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 36px; align-items: start; }
.doc-layout.no-outline { grid-template-columns: minmax(0, 1fr); }
.doc-layout > * { min-width: 0; }
.outline { position: sticky; top: 56px; display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.outline-title { margin-bottom: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.outline-item { display: block; width: 100%; padding: 3px 8px; text-align: left; font: inherit; color: var(--muted); background: transparent; border: 0; border-left: 2px solid var(--line); cursor: pointer; overflow-wrap: anywhere; }
.outline-item:hover { color: var(--vscode-foreground); background: var(--subtle); }
.outline-item.level-3 { padding-left: 18px; }
article.doc { max-width: 720px; line-height: 1.6; }
article.doc > h1 { margin: 0 0 12px; font-size: 2em; line-height: 1.2; font-weight: 700; overflow-wrap: anywhere; }
article.doc h2 { margin: 28px 0 8px; font-size: 1.45em; font-weight: 600; }
article.doc h3 { margin: 22px 0 6px; font-size: 1.2em; font-weight: 600; }
article.doc h4, article.doc h5, article.doc h6 { margin: 18px 0 6px; font-size: 1em; font-weight: 600; }
article.doc p, article.doc blockquote, article.doc .item, article.doc .todo { margin: 0 0 8px; }
blockquote { margin-left: 0; padding: 0 12px; border-left: 3px solid var(--vscode-textBlockQuote-border); color: var(--muted); }
code { font-family: var(--vscode-editor-font-family); font-size: 0.92em; }
hr { border: 0; border-top: 1px solid var(--line); margin: 20px 0; }
.item, .todo { display: flex; align-items: baseline; gap: 8px; }
.mark { flex: none; min-width: 1.4em; text-align: right; color: var(--muted); }
.check { flex: none; display: inline-flex; align-self: flex-start; padding-top: 3px; color: var(--vscode-foreground); }
.todo.done .li-text { color: var(--muted); text-decoration: line-through; }
.li-text { min-width: 0; overflow-wrap: anywhere; }
.code-block { margin: 0 0 14px; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: var(--vscode-textCodeBlock-background); }
.code-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 6px 2px 12px; font-family: var(--vscode-editor-font-family); font-size: 11px; color: var(--muted); border-bottom: 1px solid var(--line); }
.code-head .btn { padding: 0 6px; font-size: 11px; }
.code-block pre { margin: 0; padding: 10px 12px; overflow: auto; }
.authors { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 20px; color: var(--muted); font-size: 12px; }
.author { display: inline-flex; align-items: center; gap: 6px; }
.author .avatar, .mention .avatar { object-fit: cover; }
.author .avatar { width: 18px; height: 18px; }
.mention { display: inline-flex; align-items: center; gap: 4px; padding: 0 4px; border-radius: 4px; font-weight: 500; text-decoration: none; vertical-align: baseline; }
.mention .avatar { width: 16px; height: 16px; }
p .linked-doc { display: inline; border: 0; padding: 0 4px; border-radius: 4px; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); text-decoration: none; }
.linked-doc, .bookmark a, .attachment a { text-decoration: none; }
p:has(> .linked-doc:only-child), p.bookmark, p.attachment { display: block; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--radius); }
.preview-table { width: 100%; margin: 4px 0 14px; border-collapse: collapse; }
.preview-table td { padding: 6px 10px; border: 1px solid var(--line); }
.preview-table tr:first-child td { font-weight: 600; background: var(--subtle); }
.callout { display: flex; gap: 10px; margin: 0 0 12px; padding: 10px 14px; border-radius: var(--radius); background: var(--subtle); }
.callout-emoji { flex: none; }
figure.image { margin: 0 0 14px; }
figure.image img { max-width: 100%; height: auto; border-radius: var(--radius); }
figure.image figcaption { margin-top: 4px; font-size: 12px; color: var(--muted); }
.page-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.page-tag { padding: 1px 8px; border-radius: 10px; font-size: 11px; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); }
mark.highlight { padding: 0 2px; border-radius: 2px; color: inherit; }
:root {
  --affine-text-highlight-red: color-mix(in srgb, var(--vscode-charts-red) 30%, transparent);
  --affine-text-highlight-orange: color-mix(in srgb, var(--vscode-charts-orange) 30%, transparent);
  --affine-text-highlight-yellow: color-mix(in srgb, var(--vscode-charts-yellow) 35%, transparent);
  --affine-text-highlight-green: color-mix(in srgb, var(--vscode-charts-green) 30%, transparent);
  --affine-text-highlight-teal: color-mix(in srgb, var(--vscode-terminal-ansiCyan) 30%, transparent);
  --affine-text-highlight-blue: color-mix(in srgb, var(--vscode-charts-blue) 30%, transparent);
  --affine-text-highlight-purple: color-mix(in srgb, var(--vscode-charts-purple) 30%, transparent);
  --affine-text-highlight-grey: color-mix(in srgb, var(--vscode-descriptionForeground) 30%, transparent);
  --affine-text-color-red: var(--vscode-charts-red);
  --affine-text-color-orange: var(--vscode-charts-orange);
  --affine-text-color-yellow: var(--vscode-charts-yellow);
  --affine-text-color-green: var(--vscode-charts-green);
  --affine-text-color-teal: var(--vscode-terminal-ansiCyan);
  --affine-text-color-blue: var(--vscode-charts-blue);
  --affine-text-color-purple: var(--vscode-charts-purple);
  --affine-text-color-grey: var(--vscode-descriptionForeground);
}
@media (max-width: 860px) {
  .doc-layout { grid-template-columns: minmax(0, 1fr); }
  .outline { position: static; }
  .topbar, .page-body { padding-left: 14px; padding-right: 14px; }
}
`;

const SCRIPT = `
    const vscode = acquireVsCodeApi();
    const post = (message) => vscode.postMessage(message);
    document.getElementById('open-external')?.addEventListener('click', () => post({ type: '${DocumentPanelMessageType.OPEN_EXTERNAL}' }));
    document.querySelectorAll('[data-message]').forEach((button) => {
      button.addEventListener('click', () => post({ type: button.getAttribute('data-message') }));
    });
    document.querySelectorAll('[data-copy-code]').forEach((button) => {
      button.addEventListener('click', () => {
        const code = button.closest('.code-block')?.querySelector('code');
        if (code) post({ type: '${DocumentPanelMessageType.COPY_TEXT}', text: code.textContent || '' });
      });
    });
    document.querySelectorAll('.outline-item').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.getAttribute('data-target') || '');
        if (target) target.scrollIntoView({ block: 'start' });
      });
    });
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest('a[href]');
      if (!link) {
        return;
      }
      event.preventDefault();
      post({ type: '${DocumentPanelMessageType.OPEN_HREF}', href: link.getAttribute('href') });
    });`;

function renderShell(input: RenderPageShellInput): string {
  const actions = input.showOpen
    ? `<div class="actions" role="toolbar" aria-label="Page actions"><span class="chip">Read-only</span><button type="button" class="btn ghost" data-message="${DocumentPanelMessageType.COPY_LINK}">Copy link</button><button type="button" class="btn primary" id="open-external">Open in AFFiNE</button></div>`
    : '<div class="actions"><span class="chip">Read-only</span></div>';
  const outline = input.outline ?? '';
  const layoutClass = outline.length > 0 ? 'doc-layout' : 'doc-layout no-outline';
  const body = `<header class="topbar"><span class="muted">Preview</span>${actions}</header>
<div class="page-body">
  <div class="${layoutClass}">
    ${outline}
    <article class="doc">
      ${input.body}
    </article>
  </div>
</div>`;
  return renderDocumentShell({
    title: input.title,
    nonce: input.nonce,
    cspSource: input.cspSource,
    imageSources: [cspImgSrc(input.serverUrl), 'data:'],
    body,
    script: SCRIPT,
    extraCss: PAGE_CSS,
  });
}

export interface RenderPageStatusInput {
  readonly title: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly serverUrl: string;
}

export function renderPageLoadingHtml(input: RenderPageStatusInput): string {
  return renderShell({
    title: input.title,
    nonce: input.nonce,
    cspSource: input.cspSource,
    serverUrl: input.serverUrl,
    showOpen: false,
    body: `<h1>${escapeHtml(input.title)}</h1><p class="muted">Loading page…</p>`,
  });
}

export interface RenderPageErrorHtmlInput {
  readonly title: string;
  readonly message: string;
  readonly url: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly serverUrl: string;
}

export function renderPageErrorHtml(input: RenderPageErrorHtmlInput): string {
  return renderShell({
    title: input.title,
    nonce: input.nonce,
    cspSource: input.cspSource,
    serverUrl: input.serverUrl,
    showOpen: true,
    body: `<h1>${escapeHtml(input.title)}</h1><p>Could not load this page.</p><p class="muted">${escapeHtml(input.message)}</p>`,
  });
}

function renderTags(tags: readonly string[] | undefined): string {
  if (tags === undefined || tags.length === 0) {
    return '';
  }
  return `<div class="page-tags">${tags.map((tag) => `<span class="page-tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
}

export function renderPageHtml(input: RenderPageHtmlInput): string {
  const title = input.page.title.trim().length > 0 ? input.page.title : input.fallbackTitle;
  const mentionPeople = input.mentionPeople ?? {};
  const parsed = parseDocumentPageUrl(input.url);
  const serverUrl = parsed?.serverUrl ?? new URL(input.url).origin;
  return renderShell({
    title,
    nonce: input.nonce,
    cspSource: input.cspSource,
    serverUrl,
    showOpen: true,
    outline: renderOutline(input.page),
    body: `<h1>${escapeHtml(title)}</h1>
    ${renderTags(input.tags)}
    ${renderAuthors(input.createdBy, input.updatedBy)}
    ${renderBody(input.page, mentionPeople, input.url, serverUrl)}`,
  });
}
