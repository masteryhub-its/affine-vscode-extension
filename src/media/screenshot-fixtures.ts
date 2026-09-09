import { AFFINE_CLOUD_URL } from '../config/server-presets';
import type { RenderPageHtmlInput } from '../document/render-page-html';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageInlineSpan } from '../yjs/parse-page-doc';
import type { SidebarHtmlInput, SidebarWorkspace } from '../sidebar/sidebar.types';

export const SCREENSHOT_NONCE = 'marketplace';
export const SCREENSHOT_CSP = AFFINE_CLOUD_URL;
export const SCREENSHOT_SERVER = AFFINE_CLOUD_URL;
export const SCREENSHOT_HOVER_DOC_ID = 'api-handbook';

function avatarDataUri(initial: string, fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="${fill}"/><text x="32" y="41" text-anchor="middle" fill="#fff" font-size="26" font-family="sans-serif">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function span(text: string): PageInlineSpan {
  return { text, bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined };
}

function boldSpan(text: string): PageInlineSpan {
  return { ...span(text), bold: true };
}

function mentionSpan(text: string, userId: string): PageInlineSpan {
  return { ...span(text), mentionUserId: userId };
}

function linkSpan(text: string, href: string): PageInlineSpan {
  return { ...span(text), link: href };
}

function screenshotWorkspace(): SidebarWorkspace {
  const handbook = { id: SCREENSHOT_HOVER_DOC_ID, title: 'API Handbook', tags: ['spec'] };
  const standup = { id: 'standup', title: 'Standup notes', tags: [] };
  const decisions = { id: 'decisions', title: 'Architecture decisions', tags: ['rfc'] };
  return {
    id: 'docs',
    label: 'Docs',
    documents: [handbook, standup, decisions],
    tree: [
      {
        kind: PageTreeKind.FOLDER,
        id: 'product',
        title: 'Product',
        children: [
          { kind: PageTreeKind.DOC, id: handbook.id, title: handbook.title, children: [] },
          { kind: PageTreeKind.DOC, id: standup.id, title: standup.title, children: [] },
        ],
      },
      {
        kind: PageTreeKind.FOLDER,
        id: 'engineering',
        title: 'Engineering',
        children: [{ kind: PageTreeKind.DOC, id: decisions.id, title: decisions.title, children: [] }],
      },
    ],
    favorites: [handbook],
    collections: [{ id: 'col-specs', title: 'Specs' }],
  };
}

export function signedOutSidebarHtmlInput(): SidebarHtmlInput {
  return {
    state: {
      status: SidebarStatus.SIGNED_OUT,
      serverUrl: SCREENSHOT_SERVER,
      error: undefined,
      busy: false,
    },
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
  };
}

export function signedInSidebarHtmlInput(): SidebarHtmlInput {
  const workspace = screenshotWorkspace();
  return {
    state: {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: SCREENSHOT_SERVER,
      email: 'ada@example.com',
      userName: 'Ada',
      avatarUrl: avatarDataUri('A', '#0e639c'),
      lastSyncedLabel: '3:04 PM',
      workspaces: [workspace],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
      recents: [{ workspaceId: workspace.id, docId: SCREENSHOT_HOVER_DOC_ID, title: 'API Handbook', openedAt: 1 }],
    },
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
  };
}

export function previewPageHtmlInput(): RenderPageHtmlInput {
  return {
    page: {
      title: 'API Handbook',
      edgelessOnly: false,
      blocks: [
        {
          kind: PageBlockKind.HEADING,
          level: 2,
          inlines: [span('Goals')],
        },
        {
          kind: PageBlockKind.PARAGRAPH,
          inlines: [span('Ship '), boldSpan('today'), span(' with '), mentionSpan('@Ada', 'user-1'), span(' on '), linkSpan('the guide', 'https://example.com/spec'), span('.')],
        },
        {
          kind: PageBlockKind.CALLOUT,
          emoji: '💡',
          inlines: [span('Preview is read-only. Edit the page in AFFiNE.')],
        },
        {
          kind: PageBlockKind.LIST,
          list: PageListKind.BULLETED,
          checked: false,
          depth: 0,
          inlines: [span('GraphQL catalog + Yjs preview')],
        },
        {
          kind: PageBlockKind.LIST,
          list: PageListKind.TODO,
          checked: true,
          depth: 0,
          inlines: [span('Tables and callouts in the editor')],
        },
        {
          kind: PageBlockKind.TABLE,
          rows: [
            ['Surface', 'Where it lives'],
            ['Sidebar', 'Organize folders beside the file tree'],
            ['Preview', 'Read-only Yjs snapshot'],
          ],
        },
        { kind: PageBlockKind.CODE, language: 'ts', text: 'export const clientVersion = "0.26.0";' },
        { kind: PageBlockKind.LINKED_DOC, docId: 'standup', title: 'Standup notes' },
        { kind: PageBlockKind.ATTACHMENT, name: 'handbook.pdf', size: '128 KB', sourceId: '' },
      ],
    },
    fallbackTitle: 'API Handbook',
    url: `${SCREENSHOT_SERVER}/workspace/docs/${SCREENSHOT_HOVER_DOC_ID}`,
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
    createdBy: { name: 'Ada', avatarUrl: avatarDataUri('A', '#0e639c') },
    updatedBy: { name: 'Sara', avatarUrl: avatarDataUri('S', '#6a9955') },
    mentionPeople: { 'user-1': { name: 'Ada', avatarUrl: avatarDataUri('A', '#0e639c') } },
    tags: ['spec'],
  };
}
