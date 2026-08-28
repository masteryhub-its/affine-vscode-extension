import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { buildDocumentUrl } from '../client/document-url';
import { normalizeServerUrl } from '../config/settings';
import type { SettingsStore } from '../config/settings.types';
import { RECENT_PAGES_KEY } from '../constants';
import { isNotSignedInError } from '../errors/affine-error';
import { formatAffineError } from '../errors/format-error';
import { loadSidebarCatalog, type CachedCatalogWorkspace } from '../sidebar/load-catalog';
import { parseSidebarMessage } from '../sidebar/parse-message';
import { renderSidebarHtml } from '../sidebar/sidebar-html';
import type { SidebarState, SidebarToHost, SidebarWorkspace } from '../sidebar/sidebar.types';
import type { CatalogCache } from '../sync/catalog-cache';
import { parseRecentPages, pushRecentPage, type RecentPage } from '../sync/recent-pages';
import { OpenDocumentTarget } from '../utils/enums/open-document-target.enum';
import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import type { PageTreeNode } from '../yjs/page-tree';
import { closeAffineDocumentPanels, openAffineDocumentPanel } from './document-panel';
import { openAffineUrl } from './open-url';
import { confirmTrashPage, pickDestinationFolder } from './organize-commands';
import type { AffineStatusBar } from './status-bar';

export interface AffineSidebarViewOptions {
  readonly auth: AuthService;
  readonly settings: SettingsStore;
  readonly statusBar: AffineStatusBar;
  readonly output: vscode.OutputChannel;
  readonly globalState: vscode.Memento;
  readonly catalogCache: CatalogCache<CachedCatalogWorkspace>;
  readonly onAuthChanged: () => void;
}

export class AffineSidebarView implements vscode.WebviewViewProvider {
  public static readonly viewId = 'affinePanel';

  private view: vscode.WebviewView | undefined;
  private webview: vscode.Webview | undefined;
  private catalog: readonly SidebarWorkspace[] = [];
  private email: string | undefined;
  private userName: string | undefined;
  private avatarUrl: string | undefined;
  private lastSyncedLabel: string | undefined;
  private error: string | undefined;
  private busy = false;
  private pendingDocId: string | undefined;
  private recents: readonly RecentPage[] = [];

  public constructor(private readonly options: AffineSidebarViewOptions) {
    this.recents = parseRecentPages(options.globalState.get(RECENT_PAGES_KEY));
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.attach(webviewView.webview);
  }

  public openSignInUi(): void {
    if (this.view !== undefined) {
      this.view.show(true);
      return;
    }
    void vscode.commands.executeCommand(`${AffineSidebarView.viewId}.focus`);
    const panel = vscode.window.createWebviewPanel('affineSignIn', 'AFFiNE', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    this.attach(panel.webview);
  }

  public refresh(): void {
    void this.bootstrap();
  }

  public async forceReload(): Promise<void> {
    this.error = undefined;
    this.catalog = [];
    this.lastSyncedLabel = undefined;
    this.options.catalogCache.invalidate();
    if (this.webview !== undefined) {
      this.webview.html = '';
    }
    await closeAffineDocumentPanels();
    this.options.onAuthChanged();
    await this.bootstrap();
  }

  public async signOut(): Promise<void> {
    await this.options.auth.clearCredential();
    this.email = undefined;
    this.userName = undefined;
    this.avatarUrl = undefined;
    this.catalog = [];
    this.error = undefined;
    this.lastSyncedLabel = undefined;
    await this.options.statusBar.refresh(this.options.auth);
    this.options.onAuthChanged();
    this.setSignedInContext(false);
    this.render();
  }

  private attach(webview: vscode.Webview): void {
    this.webview = webview;
    webview.options = { enableScripts: true };
    webview.onDidReceiveMessage((message: unknown) => {
      void this.onMessage(message);
    });
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    try {
      const user = await this.options.auth.currentUser();
      if (user === undefined) {
        this.email = undefined;
        this.userName = undefined;
        this.avatarUrl = undefined;
        this.catalog = [];
        this.lastSyncedLabel = undefined;
        this.setSignedInContext(false);
      } else {
        this.email = user.email;
        this.userName = user.name.trim().length === 0 ? user.email : user.name;
        this.avatarUrl = user.avatarUrl;
        const client = await this.options.auth.requireClient();
        this.catalog = await loadSidebarCatalog(client, { cache: this.options.catalogCache, now: Date.now() });
        this.lastSyncedLabel = formatSyncedLabel(new Date());
        this.error = undefined;
        this.setSignedInContext(true);
      }
    } catch (error: unknown) {
      if (isNotSignedInError(error)) {
        this.email = undefined;
        this.userName = undefined;
        this.avatarUrl = undefined;
        this.catalog = [];
        this.lastSyncedLabel = undefined;
        this.setSignedInContext(false);
      } else {
        this.error = formatAffineError(error);
        this.options.output.appendLine(`Sidebar load failed: ${this.error}`);
      }
    }
    await this.options.statusBar.refresh(this.options.auth);
    this.options.onAuthChanged();
    this.render();
  }

  private async onMessage(raw: unknown): Promise<void> {
    const message = parseSidebarMessage(raw);
    if (message === undefined) {
      return;
    }
    await this.dispatch(message);
  }

  private async dispatch(message: SidebarToHost): Promise<void> {
    switch (message.type) {
      case SidebarMessageType.SIGN_IN_WITH_TOKEN:
        await this.runBusy(async () => {
          await this.options.auth.signInWithToken({ token: message.token });
        });
        return;
      case SidebarMessageType.SIGN_IN_WITH_PASSWORD:
        await this.runBusy(async () => {
          await this.options.auth.signInWithPassword({ email: message.email, password: message.password });
        });
        return;
      case SidebarMessageType.SIGN_OUT:
        await this.signOut();
        return;
      case SidebarMessageType.SET_SERVER_URL:
        await this.runBusy(async () => {
          await this.changeServerUrl(message.serverUrl);
        });
        return;
      case SidebarMessageType.REFRESH:
        await this.bootstrap();
        return;
      case SidebarMessageType.FORCE_RELOAD:
        await this.forceReload();
        return;
      case SidebarMessageType.SEARCH:
        await vscode.commands.executeCommand('affine.search');
        return;
      case SidebarMessageType.OPEN_DOCUMENT:
        await this.openDocument(message.workspaceId, message.docId, OpenDocumentTarget.PANEL);
        return;
      case SidebarMessageType.OPEN_IN_BROWSER:
        await this.openDocument(message.workspaceId, message.docId, OpenDocumentTarget.BROWSER);
        return;
      case SidebarMessageType.DELETE_DOCUMENT:
        await this.trashDocument(message.workspaceId, message.docId);
        return;
      case SidebarMessageType.MOVE_DOCUMENT:
        await this.relocateDocument(message.workspaceId, message.docId);
        return;
      case SidebarMessageType.CREATE_PAGE:
        await vscode.commands.executeCommand('affine.createPage');
        return;
      case SidebarMessageType.CREATE_FOLDER:
        await vscode.commands.executeCommand('affine.createFolder');
        return;
      case SidebarMessageType.RESTORE_DOCUMENT:
        await vscode.commands.executeCommand('affine.restoreDocument');
        return;
    }
  }

  private async runBusy(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.render();
    try {
      await action();
      this.error = undefined;
      await this.bootstrap();
    } catch (error: unknown) {
      this.error = formatAffineError(error);
      this.options.output.appendLine(`AFFiNE request failed: ${this.error}`);
      this.render();
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async openDocument(workspaceId: string, docId: string, target: OpenDocumentTarget): Promise<void> {
    const settings = this.options.settings.read();
    const url = buildDocumentUrl(settings.serverUrl, workspaceId, docId);
    if (target === OpenDocumentTarget.BROWSER) {
      await openAffineUrl(url);
      return;
    }
    const client = await this.options.auth.requireClient();
    const tags = this.documentTags(workspaceId, docId);
    await this.rememberRecent({ workspaceId, docId, title: this.documentTitle(workspaceId, docId), openedAt: Date.now() });
    await openAffineDocumentPanel({
      client,
      serverUrl: settings.serverUrl,
      workspaceId,
      docId,
      title: this.documentTitle(workspaceId, docId),
      ...(tags.length === 0 ? {} : { tags }),
    });
  }

  public async rememberRecent(page: RecentPage): Promise<void> {
    this.recents = pushRecentPage(this.recents, page);
    await this.options.globalState.update(RECENT_PAGES_KEY, this.recents);
    this.render();
  }

  private async trashDocument(workspaceId: string, docId: string): Promise<void> {
    if (!(await confirmTrashPage(this.documentTitle(workspaceId, docId)))) {
      return;
    }
    this.pendingDocId = docId;
    await this.runBusy(async () => {
      try {
        const client = await this.options.auth.requireClient();
        await client.trashPage(workspaceId, docId);
      } finally {
        this.pendingDocId = undefined;
      }
    });
  }

  private async relocateDocument(workspaceId: string, docId: string): Promise<void> {
    const folderId = await pickDestinationFolder(this.workspaceTree(workspaceId));
    if (folderId === undefined) {
      return;
    }
    await this.runBusy(async () => {
      const client = await this.options.auth.requireClient();
      await client.movePage(workspaceId, docId, folderId);
    });
  }

  private workspaceTree(workspaceId: string): readonly PageTreeNode[] {
    return this.catalog.find((workspace) => workspace.id === workspaceId)?.tree ?? [];
  }

  private documentTitle(workspaceId: string, docId: string): string {
    const workspace = this.catalog.find((item) => item.id === workspaceId);
    const document = workspace?.documents.find((item) => item.id === docId);
    return document?.title ?? 'AFFiNE page';
  }

  private documentTags(workspaceId: string, docId: string): readonly string[] {
    const workspace = this.catalog.find((item) => item.id === workspaceId);
    return workspace?.documents.find((item) => item.id === docId)?.tags ?? [];
  }

  private render(): void {
    if (this.webview === undefined) {
      return;
    }
    const nonce = randomBytes(16).toString('hex');
    this.webview.html = renderSidebarHtml({
      state: this.snapshot(),
      nonce,
      cspSource: this.webview.cspSource,
    });
  }

  private snapshot(): SidebarState {
    const serverUrl = this.options.settings.read().serverUrl;
    if (this.email === undefined) {
      return {
        status: SidebarStatus.SIGNED_OUT,
        serverUrl,
        error: this.error,
        busy: this.busy,
      };
    }
    return {
      status: SidebarStatus.SIGNED_IN,
      serverUrl,
      email: this.email,
      userName: this.userName ?? this.email,
      avatarUrl: this.avatarUrl,
      workspaces: this.catalog,
      error: this.error,
      busy: this.busy,
      query: '',
      lastSyncedLabel: this.lastSyncedLabel,
      pendingDocId: this.pendingDocId,
      recents: this.recents,
    };
  }

  private async changeServerUrl(raw: string): Promise<void> {
    const next = normalizeServerUrl(raw);
    const current = this.options.settings.read().serverUrl;
    if (next !== current) {
      await this.options.auth.clearCredential();
      this.email = undefined;
      this.userName = undefined;
      this.avatarUrl = undefined;
      this.catalog = [];
      this.lastSyncedLabel = undefined;
    }
    await this.options.settings.writeServerUrl(next);
  }

  private setSignedInContext(signedIn: boolean): void {
    void vscode.commands.executeCommand('setContext', 'affine.signedIn', signedIn);
  }
}

function formatSyncedLabel(now: Date): string {
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
