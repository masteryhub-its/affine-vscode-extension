import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { renderSidebarHtml } from './sidebar-html';
import type { SidebarState } from './sidebar.types';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';

const nonce = 'testnonce';
const cspSource = 'https://example';

describe('renderSidebarHtml', () => {
  it('renders a sign-in form when signed out', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_OUT,
      serverUrl: 'https://affine.masteryhub-its.com',
      error: undefined,
      busy: false,
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('Sign in');
    expect(html).toContain('id="password-form"');
    expect(html).toContain('https://affine.masteryhub-its.com');
    expect(html).toContain('id="server-preset"');
    expect(html).toContain('AFFiNE Cloud');
    expect(html).toContain('id="save-server"');
    expect(html).toContain('Server URL (Global only)');
    expect(html).toContain('id="force-reload"');
    expect(html).toContain('Force reload');
    expect(html).toContain('class="logo"');
    expect(html).toContain('M12 2L22 21H2z');
    expect(html).toContain(`nonce-${nonce}`);
  });

  it('renders workspaces and pages when signed in', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'owner@example.com',
      userName: 'Ada',
      avatarUrl: 'https://affine.example/api/avatars/u1',
      lastSyncedLabel: '3:04 PM',
      workspaces: [
        {
          id: 'ws1',
          label: 'Workspace ws1',
          documents: [{ id: 'd1', title: 'API Handbook', tags: [] }],
          tree: [
            {
              kind: PageTreeKind.FOLDER,
              id: 'f1',
              title: 'Product',
              children: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'API Handbook', children: [] }],
            },
          ],
          favorites: [],
          collections: [],
        },
      ],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
      recents: [],
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('owner@example.com');
    expect(html).toContain('Ada');
    expect(html).toContain('API Handbook');
    expect(html).toContain('id="sign-out"');
    expect(html).toContain('id="sync"');
    expect(html).toContain('id="page-search"');
    expect(html).toContain('Search');
    expect(html).toContain('id="force-reload"');
    expect(html).toContain('Force reload');
    expect(html).toContain('Synced 3:04 PM');
    expect(html).toContain('id="create-page"');
    expect(html).toContain('id="create-folder"');
    expect(html).toContain('id="restore-page"');
    expect(html).toContain('(Global only)');
    expect(html).toContain('class="logo"');
    expect(html).toContain('Product');
    expect(html).toContain('class="folder"');
    expect(html).toContain('class="doc-move"');
    expect(html).toContain('class="doc-delete"');
    expect(html).toContain('class="icon-trash"');
    expect(html).not.toContain('⌫');
    expect(html).toContain('@keyframes affine-spin');
    expect(html).toContain('class="doc-actions"');
    expect(html).toContain('.doc-row:hover .doc-actions');
    expect(html).toContain('.doc-row:focus-within .doc-actions');
    expect(html).toContain('class="avatar"');
    expect(html).toContain('https://affine.example/api/avatars/u1');
    expect(html).toContain('img-src');
  });

  it('says force reload rebuilds AFFiNE without reloading the editor window', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_OUT,
      serverUrl: 'https://affine.masteryhub-its.com',
      error: undefined,
      busy: false,
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('Reloads AFFiNE only');
    expect(html).not.toContain('Reloads the window');
    expect(html).not.toContain('newly installed vsix');
  });

  it('escapes a hostile page title', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'a@b.c',
      userName: 'a@b.c',
      avatarUrl: undefined,
      lastSyncedLabel: undefined,
      workspaces: [
        {
          id: 'ws',
          label: 'Workspace',
          documents: [{ id: 'd1', title: '<script>alert(1)</script>', tags: [] }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: '<script>alert(1)</script>', children: [] }],
          favorites: [],
          collections: [],
        },
      ],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
      recents: [],
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('shows a spinner on the page being moved to trash', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'a@b.c',
      userName: 'a@b.c',
      avatarUrl: undefined,
      lastSyncedLabel: undefined,
      workspaces: [
        {
          id: 'ws',
          label: 'Workspace',
          documents: [{ id: 'd1', title: 'API Handbook', tags: [] }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'API Handbook', children: [] }],
          favorites: [],
          collections: [],
        },
      ],
      error: undefined,
      busy: true,
      query: '',
      pendingDocId: 'd1',
      recents: [],
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('class="doc-delete is-busy"');
    expect(html).toContain('class="doc-spinner"');
    expect(html).toContain('aria-busy="true"');
  });

  it('renders favorites and collections when present', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'a@b.c',
      userName: 'Ada',
      avatarUrl: undefined,
      lastSyncedLabel: undefined,
      workspaces: [
        {
          id: 'ws',
          label: 'Workspace',
          documents: [{ id: 'd1', title: 'Spec', tags: [] }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Spec', children: [] }],
          favorites: [{ id: 'd1', title: 'Spec', tags: [] }],
          collections: [{ id: 'c1', title: 'Handbook' }],
        },
      ],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
      recents: [],
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('Favorites');
    expect(html).toContain('Collections');
    expect(html).toContain('Handbook');
  });

  it('renders recent pages when present', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'a@b.c',
      userName: 'Ada',
      avatarUrl: undefined,
      lastSyncedLabel: undefined,
      workspaces: [
        {
          id: 'ws',
          label: 'Workspace',
          documents: [{ id: 'd1', title: 'Spec', tags: [] }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Spec', children: [] }],
          favorites: [],
          collections: [],
        },
      ],
      recents: [{ workspaceId: 'ws', docId: 'd1', title: 'Spec', openedAt: 1 }],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('Recent pages');
    expect(html).toContain('data-workspace="ws"');
    expect(html).toContain('data-doc="d1"');
  });

  it('renders page tags next to the title', () => {
    const state: SidebarState = {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: 'https://affine.example',
      email: 'a@b.c',
      userName: 'Ada',
      avatarUrl: undefined,
      lastSyncedLabel: undefined,
      workspaces: [
        {
          id: 'ws',
          label: 'Workspace',
          documents: [{ id: 'd1', title: 'Spec', tags: ['docs'] }],
          tree: [{ kind: PageTreeKind.DOC, id: 'd1', title: 'Spec', children: [] }],
          favorites: [],
          collections: [],
        },
      ],
      recents: [],
      error: undefined,
      busy: false,
      query: '',
      pendingDocId: undefined,
    };
    const html = renderSidebarHtml({ state, nonce, cspSource });
    expect(html).toContain('class="doc-tags"');
    expect(html).toContain('docs');
  });
});
