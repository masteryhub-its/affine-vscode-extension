import * as vscode from 'vscode';
import { AuthService } from '../auth/auth-service';
import { fetchHttpClient } from '../client/fetch-http-client';
import { clientVersionGuardMessage } from '../config/client-version';
import { detectAffinePageUrls } from '../document/detect-links';
import { hoverTitleForAffinePage } from '../document/hover-title';
import { isNotSignedInError } from '../errors/affine-error';
import { openDocumentCommand, registerAffineCommands, type AffineCommandContext, type OpenDocumentPreviewInput } from './commands';
import { openAffineDocumentPanel } from './document-panel';
import { showAffineError } from './messages';
import { createFolderCommand, createPageCommand, deleteDocumentCommand, duplicateDocumentCommand, moveDocumentCommand, renameDocumentCommand, restoreDocumentCommand } from './organize-commands';
import { VsCodeSecretStore } from './secret-store';
import { VsCodeSettingsReader } from './settings-reader';
import { AffineSidebarView } from './sidebar-view';
import { CatalogCache, CATALOG_TTL_MS } from '../sync/catalog-cache';
import type { CachedCatalogWorkspace } from '../sidebar/load-catalog';
import { AffineStatusBar } from './status-bar';
import { AFFINE_TREE_VIEW_ID, AffineTreeProvider } from './tree-provider';

export function activateAffine(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('AFFiNE');
  output.appendLine('AFFiNE extension activated');

  const settings = new VsCodeSettingsReader();
  const versionWarning = clientVersionGuardMessage(settings.read().clientVersion);
  if (versionWarning !== undefined) {
    output.appendLine(versionWarning);
  }
  const auth = new AuthService({
    secrets: new VsCodeSecretStore(context.secrets),
    settings,
    http: fetchHttpClient,
  });
  const statusBar = new AffineStatusBar();
  const tree = new AffineTreeProvider(auth);
  const catalogCache = new CatalogCache<CachedCatalogWorkspace>(CATALOG_TTL_MS);
  const sidebar = new AffineSidebarView({
    auth,
    settings,
    statusBar,
    output,
    globalState: context.globalState,
    catalogCache,
    onAuthChanged: () => {
      tree.refresh();
    },
  });

  const openPreview = async (input: OpenDocumentPreviewInput): Promise<void> => {
    const client = await auth.requireClient();
    await sidebar.rememberRecent({
      workspaceId: input.workspaceId,
      docId: input.docId,
      title: input.title,
      openedAt: Date.now(),
    });
    await openAffineDocumentPanel({
      client,
      serverUrl: settings.read().serverUrl,
      workspaceId: input.workspaceId,
      docId: input.docId,
      title: input.title,
    });
  };

  const commandCtx: AffineCommandContext = { auth, settings, tree, statusBar, openPreview };

  const runCommand = (action: () => Promise<void>): void => {
    void action().catch((error: unknown) => {
      if (isNotSignedInError(error)) {
        sidebar.openSignInUi();
        return;
      }
      showAffineError(error);
    });
  };

  context.subscriptions.push(
    output,
    statusBar,
    vscode.window.registerTreeDataProvider(AFFINE_TREE_VIEW_ID, tree),
    vscode.window.registerWebviewViewProvider(AffineSidebarView.viewId, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('affine.openSignIn', () => {
      sidebar.openSignInUi();
    }),
    vscode.commands.registerCommand('affine.refresh', () => {
      sidebar.refresh();
    }),
    vscode.commands.registerCommand('affine.forceReload', () => {
      void sidebar.forceReload();
    }),
    vscode.commands.registerCommand('affine.signOut', () => {
      void sidebar.signOut();
    }),
    vscode.commands.registerCommand('affine.openDocument', (node: unknown) => {
      runCommand(async () => {
        await openDocumentCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('affine.deleteDocument', (node: unknown) => {
      void deleteDocumentCommand({ auth, tree, refresh: () => sidebar.refresh() }, node).catch((error: unknown) => {
        showAffineError(error);
      });
    }),
    vscode.commands.registerCommand('affine.moveDocument', (node: unknown) => {
      void moveDocumentCommand({ auth, tree, refresh: () => sidebar.refresh() }, node).catch((error: unknown) => {
        showAffineError(error);
      });
    }),
    vscode.commands.registerCommand('affine.createPage', () => {
      runCommand(async () => {
        await createPageCommand({ auth, tree, refresh: () => sidebar.refresh() });
      });
    }),
    vscode.commands.registerCommand('affine.createFolder', () => {
      runCommand(async () => {
        await createFolderCommand({ auth, tree, refresh: () => sidebar.refresh() });
      });
    }),
    vscode.commands.registerCommand('affine.restoreDocument', () => {
      runCommand(async () => {
        await restoreDocumentCommand({ auth, tree, refresh: () => sidebar.refresh() });
      });
    }),
    vscode.commands.registerCommand('affine.renameDocument', (node: unknown) => {
      void renameDocumentCommand({ auth, tree, refresh: () => sidebar.refresh() }, node).catch((error: unknown) => {
        showAffineError(error);
      });
    }),
    vscode.commands.registerCommand('affine.duplicateDocument', (node: unknown) => {
      void duplicateDocumentCommand({ auth, tree, refresh: () => sidebar.refresh() }, node).catch((error: unknown) => {
        showAffineError(error);
      });
    }),
    vscode.languages.registerHoverProvider(
      { scheme: '*' },
      {
        provideHover(document, position): vscode.Hover | undefined {
          const line = document.lineAt(position.line).text;
          const hits = detectAffinePageUrls(line, settings.read().serverUrl);
          const hit = hits[0];
          if (hit === undefined) {
            return undefined;
          }
          const title = hoverTitleForAffinePage(tree.catalogTitles(), { workspaceId: hit.workspaceId, docId: hit.docId });
          if (title === undefined) {
            return undefined;
          }
          return new vscode.Hover(title);
        },
      }
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('affine')) {
        tree.refresh();
        sidebar.refresh();
      }
    })
  );

  registerAffineCommands(context, commandCtx);

  void statusBar.refresh(auth);
}
