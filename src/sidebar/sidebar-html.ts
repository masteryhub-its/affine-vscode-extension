import { AFFINE_SERVER_PRESETS, selectedServerPresetId } from '../config/server-presets';
import { AffineServerPresetId } from '../utils/enums/affine-server-preset-id.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import { cspImgSrc } from '../utils/url-protocol';
import type { PageTreeNode } from '../yjs/page-tree';
import { escapeHtml } from './escape-html';
import type { SidebarDocument, SidebarHtmlInput, SignedInSidebarState, SignedOutSidebarState } from './sidebar.types';

const AFFINE_LOGO_SVG = `<svg class="logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2L22 21H2z"/>
</svg>`;

export function renderSidebarHtml(input: SidebarHtmlInput): string {
  const { state, nonce, cspSource } = input;
  const body = state.status === SidebarStatus.SIGNED_OUT ? renderSignedOut(state) : renderSignedIn(state);
  const serverOrigin = cspImgSrc(state.serverUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} ${serverOrigin} data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AFFiNE</title>
  <style>${SIDEBAR_CSS}</style>
</head>
<body>
  ${body}
  <script nonce="${nonce}">${SIDEBAR_SCRIPT}</script>
</body>
</html>`;
}

function renderBrand(): string {
  return `
  <header class="brand">
    ${AFFINE_LOGO_SVG}
    <div>
      <h1>AFFiNE</h1>
      <p class="muted">Workspace in your editor</p>
    </div>
  </header>`;
}

function renderServerPicker(serverUrl: string, locked: boolean): string {
  const selectedId = selectedServerPresetId(serverUrl);
  const presets = AFFINE_SERVER_PRESETS.map((preset) => {
    const selected = preset.id === selectedId ? 'selected' : '';
    return `<option value="${escapeHtml(preset.url)}" ${selected}>${escapeHtml(preset.label)}</option>`;
  }).join('');
  const customSelected = selectedId === AffineServerPresetId.CUSTOM ? 'selected' : '';
  const disabled = locked ? 'disabled' : '';
  const hint = locked ? 'Sign out to switch servers. Server URL is Global only.' : 'Saved as a Global setting only (workspace/folder overrides are ignored).';
  return `
  <section class="card">
    <h2>Server</h2>
    <label for="server-preset">Instance</label>
    <select id="server-preset" ${disabled}>
      ${presets}
      <option value="${AffineServerPresetId.CUSTOM}" ${customSelected}>Custom self-hosted</option>
    </select>
    <label for="server-url">Server URL (Global only)</label>
    <input id="server-url" name="serverUrl" type="url" value="${escapeHtml(serverUrl)}" ${disabled} />
    <button type="button" id="save-server" ${disabled}>Save server</button>
    <p class="hint">${hint}</p>
  </section>`;
}

function renderSignedOut(state: SignedOutSidebarState): string {
  const error = state.error === undefined || state.error.length === 0 ? '' : `<p class="error" role="alert">${escapeHtml(state.error)}</p>`;
  const disabled = state.busy ? 'disabled' : '';
  return `
  ${renderBrand()}
  ${error}
  ${renderServerPicker(state.serverUrl, state.busy)}
  <section class="card">
    <h2>Sign in</h2>
    <form id="token-form">
      <label for="token">Access token</label>
      <input id="token" name="token" type="password" autocomplete="off" ${disabled} />
      <button type="submit" ${disabled}>Sign in with token</button>
    </form>
    <p class="divider">or</p>
    <form id="password-form">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" ${disabled} />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" ${disabled} />
      <button type="submit" class="primary" ${disabled}>Sign in</button>
    </form>
    <p class="hint">Password is used once to mint a token and is not stored.</p>
  </section>
  ${renderForceReload()}`;
}

function renderSignedIn(state: SignedInSidebarState): string {
  const error = state.error === undefined || state.error.length === 0 ? '' : `<p class="error" role="alert">${escapeHtml(state.error)}</p>`;
  const disabled = state.busy ? 'disabled' : '';
  const synced = state.lastSyncedLabel === undefined || state.lastSyncedLabel.length === 0 ? '' : `<p class="sync-meta">Synced ${escapeHtml(state.lastSyncedLabel)}</p>`;
  const recents =
    state.recents.length === 0
      ? ''
      : `<section class="recents"><h2>Recent pages</h2><ul>${state.recents
          .map((page) => `<li><button type="button" class="doc-open" data-workspace="${escapeHtml(page.workspaceId)}" data-doc="${escapeHtml(page.docId)}">${escapeHtml(page.title)}</button></li>`)
          .join('')}</ul></section>`;
  const workspaces = state.workspaces
    .map((workspace) => {
      const empty = workspace.tree.length === 0 ? '<p class="muted">No pages in this workspace.</p>' : '';
      const favorites =
        workspace.favorites.length === 0
          ? ''
          : `<section class="favorites"><h3>Favorites</h3><ul>${workspace.favorites
              .map((doc) => `<li><button type="button" class="doc-open" data-workspace="${escapeHtml(workspace.id)}" data-doc="${escapeHtml(doc.id)}">${escapeHtml(doc.title)}</button></li>`)
              .join('')}</ul></section>`;
      const collections =
        workspace.collections.length === 0
          ? ''
          : `<section class="collections"><h3>Collections</h3><ul>${workspace.collections.map((collection) => `<li>${escapeHtml(collection.title)}</li>`).join('')}</ul></section>`;
      return `<section class="workspace">
        <h2>${escapeHtml(workspace.label)} <span class="count">${workspace.documents.length}</span></h2>
        ${favorites}
        ${collections}
        ${empty}
        <ul class="tree">${renderTree(workspace.id, workspace.tree, state.pendingDocId, workspace.documents)}</ul>
      </section>`;
    })
    .join('');

  return `
  ${renderBrand()}
  <section class="card session">
    ${state.avatarUrl === undefined ? '' : `<img class="avatar" src="${escapeHtml(state.avatarUrl)}" alt="" />`}
    <div>
      <p class="user-name">${escapeHtml(state.userName)}</p>
      <p class="muted">${escapeHtml(state.email)}</p>
      <p class="muted">${escapeHtml(state.serverUrl)} <span class="scope">(Global only)</span></p>
      ${synced}
    </div>
    <div class="actions">
      <button type="button" id="sync" class="primary" ${disabled}>Sync</button>
      <button type="button" id="page-search" ${disabled}>Search</button>
      <button type="button" id="create-page" ${disabled}>New page</button>
      <button type="button" id="create-folder" ${disabled}>New folder</button>
      <button type="button" id="restore-page" ${disabled}>Restore from trash</button>
      <button type="button" id="force-reload">Force reload</button>
      <button type="button" id="sign-out" ${disabled}>Sign out</button>
    </div>
  </section>
  ${error}
  ${renderServerPicker(state.serverUrl, true)}
  <input id="search" type="search" placeholder="Filter pages" value="${escapeHtml(state.query)}" ${disabled} />
  <div id="results">${recents}${workspaces.length === 0 ? '<p class="muted">No workspaces yet.</p>' : workspaces}</div>`;
}

function renderForceReload(): string {
  return `
  <section class="card">
    <h2>Editor</h2>
    <button type="button" id="force-reload">Force reload</button>
    <p class="hint">Reloads AFFiNE only — sidebar, pages, and previews. The rest of the editor stays open.</p>
  </section>`;
}

const ICON_MOVE = `<svg class="icon-move" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3.5v9"/><path d="M5.75 5.75 8 3.5l2.25 2.25"/><path d="M5.75 10.25 8 12.5l2.25-2.25"/></svg>`;
const ICON_TRASH = `<svg class="icon-trash" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.5 4.5h9"/><path d="M6 4.5V3.25A.75.75 0 0 1 6.75 2.5h2.5A.75.75 0 0 1 10 3.25V4.5"/><path d="M5.25 4.5l.55 8.1A1 1 0 0 0 6.8 13.5h2.4a1 1 0 0 0 .99-.9l.56-8.1"/><path d="M7 7v4M9 7v4"/></svg>`;
const ICON_EXTERNAL = `<svg class="icon-external" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 3.5h3.5V7"/><path d="M12.5 3.5 8 8"/><path d="M10.5 8.5V12a.5.5 0 0 1-.5.5H4A.5.5 0 0 1 3.5 12V6A.5.5 0 0 1 4 5.5h3.5"/></svg>`;

function renderTree(workspaceId: string, nodes: readonly PageTreeNode[], pendingDocId: string | undefined, documents: readonly SidebarDocument[]): string {
  return nodes.map((node) => renderTreeNode(workspaceId, node, pendingDocId, documents)).join('');
}

function documentTags(documents: readonly SidebarDocument[], docId: string): readonly string[] {
  return documents.find((document) => document.id === docId)?.tags ?? [];
}

function renderTreeNode(workspaceId: string, node: PageTreeNode, pendingDocId: string | undefined, documents: readonly SidebarDocument[]): string {
  if (node.kind === PageTreeKind.FOLDER) {
    return `<li class="folder">
      <details open>
        <summary><span class="folder-mark" aria-hidden="true"></span><span class="folder-title">${escapeHtml(node.title)}</span></summary>
        <ul class="tree">${renderTree(workspaceId, node.children, pendingDocId, documents)}</ul>
      </details>
    </li>`;
  }
  const nested = node.children.length === 0 ? '' : `<ul class="tree">${renderTree(workspaceId, node.children, pendingDocId, documents)}</ul>`;
  const deleting = pendingDocId === node.id;
  const deleteClass = deleting ? 'doc-delete is-busy' : 'doc-delete';
  const deleteBusy = deleting ? ' aria-busy="true" disabled' : '';
  const spinner = deleting ? '<span class="doc-spinner" aria-hidden="true"></span>' : '';
  const tags = documentTags(documents, node.id);
  const tagHtml = tags.length === 0 ? '' : `<span class="doc-tags">${tags.map((tag) => `<span class="doc-tag">${escapeHtml(tag)}</span>`).join('')}</span>`;
  return `<li class="doc" data-title="${escapeHtml(node.title.toLowerCase())}">
    <div class="doc-row">
      <button type="button" class="doc-open" data-workspace="${escapeHtml(workspaceId)}" data-doc="${escapeHtml(node.id)}">
        <span class="doc-mark" aria-hidden="true"></span>
        <span class="doc-title">${escapeHtml(node.title)}</span>
        ${tagHtml}
      </button>
      <div class="doc-actions">
        <button type="button" class="doc-move" data-workspace="${escapeHtml(workspaceId)}" data-doc="${escapeHtml(node.id)}" title="Move to folder" aria-label="Move to folder">${ICON_MOVE}</button>
        <button type="button" class="${deleteClass}" data-workspace="${escapeHtml(workspaceId)}" data-doc="${escapeHtml(node.id)}" title="Move to trash" aria-label="Move to trash"${deleteBusy}>${spinner}${ICON_TRASH}</button>
        <button type="button" class="doc-browser" data-workspace="${escapeHtml(workspaceId)}" data-doc="${escapeHtml(node.id)}" title="Open in browser" aria-label="Open in browser">${ICON_EXTERNAL}</button>
      </div>
    </div>
    ${nested}
  </li>`;
}

const SIDEBAR_CSS = `
  :root { color-scheme: light dark; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); margin: 0; padding: 12px; }
  h1 { font-size: 15px; font-weight: 700; margin: 0 0 2px; letter-spacing: 0.02em; }
  h2 { font-size: 11px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); }
  .muted, .hint, .divider, .sync-meta, .count { color: var(--vscode-descriptionForeground); font-size: 12px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .logo { width: 32px; height: 32px; flex: none; fill: var(--vscode-foreground); }
  .card { background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)); border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, transparent)); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
  .session { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex: none; }
  .user-name { font-weight: 600; margin: 0 0 4px; }
  .session .muted, .sync-meta { margin: 0 0 2px; }
  .actions { display: flex; flex-direction: column; gap: 6px; flex: none; }
  .actions button { width: auto; min-width: 88px; margin: 0; }
  label { display: block; margin: 10px 0 4px; font-size: 12px; }
  input, select { width: 100%; box-sizing: border-box; padding: 7px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; }
  button { width: 100%; margin-top: 10px; padding: 7px 10px; border: none; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); cursor: pointer; }
  button.primary, #token-form button, #password-form button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button:hover:not(:disabled) { filter: brightness(1.08); }
  button:disabled { opacity: 0.6; cursor: default; }
  .error { color: var(--vscode-errorForeground); font-size: 12px; margin: 0 0 12px; }
  .divider { text-align: center; margin: 12px 0 4px; }
  #search { margin: 4px 0 12px; }
  ul { list-style: none; padding: 0; margin: 0; }
  .workspace h2 { margin: 8px 0; display: flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-size: 12px; }
  .count { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; padding: 0 6px; font-size: 11px; }
  .tree { list-style: none; padding: 0; margin: 0; }
  .tree .tree { padding-left: 12px; border-left: 1px solid var(--vscode-widget-border, transparent); margin-left: 6px; }
  .folder { margin-bottom: 4px; }
  .folder summary { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; border-radius: 4px; list-style: none; }
  .folder summary::-webkit-details-marker { display: none; }
  .folder summary:hover { background: var(--vscode-list-hoverBackground); }
  .folder-mark { width: 10px; height: 8px; border-radius: 1px; border: 1px solid var(--vscode-foreground); opacity: 0.55; flex: none; }
  .folder-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .doc { margin-bottom: 2px; min-width: 0; }
  .doc-row { display: flex; align-items: center; gap: 2px; min-width: 0; border-radius: 4px; }
  .doc-row:hover, .doc-row:focus-within { background: var(--vscode-list-hoverBackground); }
  .doc-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; text-align: left; margin: 0; padding: 5px 8px; background: transparent; }
  .doc-open:hover:not(:disabled) { filter: none; background: transparent; }
  .doc-mark { width: 8px; height: 8px; border-radius: 2px; background: var(--vscode-button-background); flex: none; }
  .doc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .doc-tags { display: inline-flex; gap: 4px; flex: none; }
  .doc-tag { font-size: 10px; padding: 0 5px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .recents { margin-bottom: 12px; }
  .doc-actions { display: none; flex: none; align-items: center; gap: 2px; padding-right: 4px; }
  .doc-row:hover .doc-actions, .doc-row:focus-within .doc-actions, .doc-row:has(.doc-delete.is-busy) .doc-actions { display: flex; }
  .doc-browser, .doc-move, .doc-delete { width: 26px; height: 26px; margin: 0; padding: 0; flex: none; display: inline-flex; align-items: center; justify-content: center; background: transparent; }
  .doc-actions svg { width: 14px; height: 14px; display: block; }
  .doc-browser:hover:not(:disabled), .doc-move:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground)); }
  .doc-delete:hover:not(:disabled) { color: var(--vscode-errorForeground); background: var(--vscode-inputValidation-errorBackground, var(--vscode-toolbar-hoverBackground, transparent)); }
  .doc-delete.is-busy { opacity: 1; cursor: wait; }
  .doc-delete.is-busy .icon-trash { display: none; }
  .doc-spinner { width: 12px; height: 12px; box-sizing: border-box; border: 1.5px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: affine-spin 0.65s linear infinite; }
  @keyframes affine-spin { to { transform: rotate(360deg); } }
  .doc[hidden], .folder[hidden] { display: none; }
`;

const SIDEBAR_SCRIPT = `
  const vscode = acquireVsCodeApi();
  const preset = document.getElementById('server-preset');
  const serverUrl = document.getElementById('server-url');
  if (preset && serverUrl) {
    preset.addEventListener('change', () => {
      if (preset.value !== '${AffineServerPresetId.CUSTOM}') {
        serverUrl.value = preset.value;
      }
    });
  }
  const saveServer = document.getElementById('save-server');
  if (saveServer && serverUrl) {
    saveServer.addEventListener('click', () => {
      vscode.postMessage({ type: '${SidebarMessageType.SET_SERVER_URL}', serverUrl: serverUrl.value });
    });
  }
  const tokenForm = document.getElementById('token-form');
  if (tokenForm) {
    tokenForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const token = document.getElementById('token');
      vscode.postMessage({ type: '${SidebarMessageType.SIGN_IN_WITH_TOKEN}', token: token ? token.value : '' });
    });
  }
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      vscode.postMessage({
        type: '${SidebarMessageType.SIGN_IN_WITH_PASSWORD}',
        email: email ? email.value : '',
        password: password ? password.value : ''
      });
    });
  }
  const signOut = document.getElementById('sign-out');
  if (signOut) {
    signOut.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.SIGN_OUT}' }));
  }
  const sync = document.getElementById('sync');
  if (sync) {
    sync.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.REFRESH}' }));
  }
  const pageSearch = document.getElementById('page-search');
  if (pageSearch) {
    pageSearch.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.SEARCH}' }));
  }
  const createPage = document.getElementById('create-page');
  if (createPage) {
    createPage.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.CREATE_PAGE}' }));
  }
  const createFolder = document.getElementById('create-folder');
  if (createFolder) {
    createFolder.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.CREATE_FOLDER}' }));
  }
  const restorePage = document.getElementById('restore-page');
  if (restorePage) {
    restorePage.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.RESTORE_DOCUMENT}' }));
  }
  const forceReload = document.getElementById('force-reload');
  if (forceReload) {
    forceReload.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.FORCE_RELOAD}' }));
  }
  const search = document.getElementById('search');
  if (search) {
    const applyFilter = () => {
      const needle = search.value.trim().toLowerCase();
      document.querySelectorAll('.doc').forEach((row) => {
        const title = row.getAttribute('data-title') || '';
        row.hidden = needle.length > 0 && !title.includes(needle);
      });
      document.querySelectorAll('.folder').forEach((folder) => {
        const docs = folder.querySelectorAll('.doc');
        folder.hidden = needle.length > 0 && docs.length > 0 && Array.from(docs).every((doc) => doc.hidden);
      });
    };
    search.addEventListener('input', applyFilter);
    applyFilter();
  }
  document.querySelectorAll('.doc-open').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({
        type: '${SidebarMessageType.OPEN_DOCUMENT}',
        workspaceId: button.getAttribute('data-workspace'),
        docId: button.getAttribute('data-doc')
      });
    });
  });
  document.querySelectorAll('.doc-browser').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({
        type: '${SidebarMessageType.OPEN_IN_BROWSER}',
        workspaceId: button.getAttribute('data-workspace'),
        docId: button.getAttribute('data-doc')
      });
    });
  });
  document.querySelectorAll('.doc-move').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({
        type: '${SidebarMessageType.MOVE_DOCUMENT}',
        workspaceId: button.getAttribute('data-workspace'),
        docId: button.getAttribute('data-doc')
      });
    });
  });
  document.querySelectorAll('.doc-delete').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({
        type: '${SidebarMessageType.DELETE_DOCUMENT}',
        workspaceId: button.getAttribute('data-workspace'),
        docId: button.getAttribute('data-doc')
      });
    });
  });
`;
