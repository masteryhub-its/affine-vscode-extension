import type { MentionPeople, PageAuthor } from '../client/affine.types';
import { buildDocumentUrl, buildWorkspaceBlobUrl, parseDocumentPageUrl, resolvePreviewHref } from '../client/document-url';
import { escapeHtml } from '../sidebar/escape-html';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { cspImgSrc } from '../utils/url-protocol';
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

function renderBlock(block: PageBlock, people: MentionPeople, pageUrl: string, serverUrl: string): string {
  switch (block.kind) {
    case PageBlockKind.HEADING:
      return `<h${block.level}>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</h${block.level}>`;
    case PageBlockKind.PARAGRAPH:
      return `<p>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</p>`;
    case PageBlockKind.QUOTE:
      return `<blockquote>${renderInlines(block.inlines, people, pageUrl, serverUrl)}</blockquote>`;
    case PageBlockKind.LIST: {
      const indent = ` style="margin-left:${block.depth * 16}px"`;
      if (block.list === PageListKind.TODO) {
        const checked = block.checked ? 'checked' : '';
        return `<div class="todo"${indent}><input type="checkbox" disabled ${checked} /> ${renderInlines(block.inlines, people, pageUrl, serverUrl)}</div>`;
      }
      const mark = block.list === PageListKind.NUMBERED ? '1.' : '•';
      return `<div class="item"${indent}><span class="mark">${mark}</span> ${renderInlines(block.inlines, people, pageUrl, serverUrl)}</div>`;
    }
    case PageBlockKind.CODE:
      return `<pre><code class="lang-${escapeHtml(block.language)}">${escapeHtml(block.text)}</code></pre>`;
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
  return page.blocks.map((block) => renderBlock(block, people, pageUrl, serverUrl)).join('\n');
}

export interface RenderPageShellInput {
  readonly title: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly serverUrl: string;
  readonly body: string;
  readonly showOpen: boolean;
}

function renderShell(input: RenderPageShellInput): string {
  const button = input.showOpen ? '<button type="button" id="open-external">Open in AFFiNE</button>' : '';
  const serverOrigin = cspImgSrc(input.serverUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${input.cspSource} ${serverOrigin} data:; style-src ${input.cspSource} 'unsafe-inline'; script-src 'nonce-${input.nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--vscode-widget-border, transparent); }
    .bar button { padding: 6px 12px; border: none; border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
    article { max-width: 52rem; padding: 24px 20px 48px; line-height: 1.55; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    h2, h3, h4, h5, h6 { margin: 20px 0 8px; }
    p, blockquote, pre, .item, .todo { margin: 0 0 10px; }
    blockquote { border-left: 3px solid var(--vscode-button-background); padding: 0 12px; color: var(--vscode-descriptionForeground); }
    pre { background: var(--vscode-textCodeBlock-background, var(--vscode-editorWidget-background)); padding: 12px; border-radius: 6px; overflow: auto; }
    code { font-family: var(--vscode-editor-font-family); font-size: 0.92em; }
    .muted { color: var(--vscode-descriptionForeground); }
    .mark { opacity: 0.6; display: inline-block; min-width: 1.2em; }
    hr { border: none; border-top: 1px solid var(--vscode-widget-border, var(--vscode-foreground)); opacity: 0.3; margin: 16px 0; }
    a { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; }
    .authors { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 16px; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .author { display: inline-flex; align-items: center; gap: 6px; }
    .author .avatar { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }
    .mention { display: inline-flex; align-items: center; gap: 4px; vertical-align: baseline; font-weight: 500; padding: 0 4px; border-radius: 4px; text-decoration: none; cursor: pointer; }
    .mention .avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; }
    p .linked-doc { display: inline; border: none; padding: 0 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; text-decoration: none; }
    .linked-doc { border: 1px solid var(--vscode-widget-border, transparent); border-radius: 6px; padding: 8px 12px; background: var(--vscode-editorWidget-background); text-decoration: none; cursor: pointer; color: inherit; display: inline-block; }
    .preview-table { border-collapse: collapse; margin: 0 0 12px; width: 100%; }
    .preview-table td { border: 1px solid var(--vscode-widget-border, transparent); padding: 6px 8px; }
    .callout { display: flex; gap: 8px; border-left: 3px solid var(--vscode-button-background); padding: 8px 12px; margin: 0 0 12px; background: var(--vscode-editorWidget-background); }
    .callout-emoji { flex: none; }
    figure.image { margin: 0 0 12px; }
    figure.image img { max-width: 100%; height: auto; }
    .attachment { margin: 0 0 10px; }
    .page-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
    .page-tag { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    mark.highlight { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="bar">
    <span class="muted">Read-only preview</span>
    ${button}
  </div>
  <article>
    ${input.body}
  </article>
  <script nonce="${input.nonce}">
    const vscode = acquireVsCodeApi();
    const open = () => vscode.postMessage({ type: '${DocumentPanelMessageType.OPEN_EXTERNAL}' });
    const openBtn = document.getElementById('open-external');
    if (openBtn) {
      openBtn.addEventListener('click', open);
    }
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
      vscode.postMessage({ type: '${DocumentPanelMessageType.OPEN_HREF}', href: link.getAttribute('href') });
    });
  </script>
</body>
</html>`;
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
    body: `<h1>${escapeHtml(title)}</h1>
    ${renderTags(input.tags)}
    ${renderAuthors(input.createdBy, input.updatedBy)}
    ${renderBody(input.page, mentionPeople, input.url, serverUrl)}`,
  });
}
