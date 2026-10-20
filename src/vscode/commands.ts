import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { detectAffinePageUrls } from '../document/detect-links';
import { selectionBlocks } from '../document/selection-blocks';
import { buildDocumentUrl } from '../client/document-url';
import type { AffineWorkspace } from '../client/affine.types';
import { normalizeServerUrl, validateServerUrlInput } from '../config/settings';
import type { SettingsStore } from '../config/settings.types';
import { isNotSignedInError } from '../errors/affine-error';
import { searchAllWorkspaces } from '../search/search-all-workspaces';
import { resolveSearchWorkspaces } from '../search/resolve-workspaces';
import { SignInMethod } from '../utils/enums/sign-in-method.enum';
import { parseDocumentNode, toDocumentNode, toWorkspaceNode, type AffineTreeDocumentNode } from '../tree/tree-model';
import { openPageAsMarkdown } from './markdown-view';
import { showAffineError, showAffineInfo, showAffineWarning } from './messages';
import { openAffineUrl } from './open-url';
import type { AffineStatusBar } from './status-bar';
import type { AffineTreeProvider } from './tree-provider';

interface SignInMethodItem extends vscode.QuickPickItem {
  readonly method: SignInMethod;
}

interface DocumentPickItem extends vscode.QuickPickItem {
  readonly workspaceId: string;
  readonly docId: string;
}

interface WorkspacePickItem extends vscode.QuickPickItem {
  readonly workspaceId: string;
}

export interface OpenDocumentPreviewInput {
  readonly workspaceId: string;
  readonly docId: string;
  readonly title: string;
}

export interface AffineCommandContext {
  readonly auth: AuthService;
  readonly settings: SettingsStore;
  readonly tree: AffineTreeProvider;
  readonly statusBar: AffineStatusBar;
  readonly openPreview: (input: OpenDocumentPreviewInput) => Promise<void>;
}

async function refreshUi(ctx: AffineCommandContext): Promise<void> {
  ctx.tree.refresh();
  await ctx.statusBar.refresh(ctx.auth);
}

async function pickSignInMethod(): Promise<SignInMethod | undefined> {
  const items: readonly SignInMethodItem[] = [
    { label: 'Access token', description: 'Paste an AFFiNE access token', method: SignInMethod.TOKEN },
    { label: 'Email and password', description: 'Sign in with your account; the password is never stored', method: SignInMethod.PASSWORD },
  ];
  const selected = await vscode.window.showQuickPick(items, { title: 'AFFiNE sign in', ignoreFocusOut: true });
  return selected?.method;
}

export async function signInCommand(ctx: AffineCommandContext): Promise<void> {
  const method = await pickSignInMethod();
  if (method === undefined) {
    return;
  }

  if (method === SignInMethod.TOKEN) {
    const token = await vscode.window.showInputBox({
      title: 'AFFiNE access token',
      prompt: 'Paste an access token from AFFiNE. It is stored in Secret Storage.',
      password: true,
      ignoreFocusOut: true,
    });
    if (token === undefined) {
      return;
    }
    const user = await ctx.auth.signInWithToken({ token });
    showAffineInfo(`Signed in as ${user.email}`);
    await refreshUi(ctx);
    return;
  }

  const email = await vscode.window.showInputBox({
    title: 'AFFiNE email',
    prompt: 'Email for your self-hosted AFFiNE account',
    ignoreFocusOut: true,
  });
  if (email === undefined) {
    return;
  }
  const password = await vscode.window.showInputBox({
    title: 'AFFiNE password',
    prompt: 'Used to sign in once; it is never stored',
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) {
    return;
  }
  const result = await ctx.auth.signInWithPassword({ email, password });
  showAffineInfo(`Signed in as ${result.user.email}`);
  if (result.usedSessionFallback) {
    showAffineWarning('Signed in with a short-lived session. Access-token creation is unavailable on this AFFiNE server, so you may be signed out sooner than expected.');
  }
  await refreshUi(ctx);
}

export async function setServerUrlCommand(ctx: AffineCommandContext): Promise<void> {
  const current = ctx.settings.read().serverUrl;
  const raw = await vscode.window.showInputBox({
    title: 'AFFiNE server URL',
    prompt: 'Use https://app.affine.pro for AFFiNE Cloud, or the address of your own AFFiNE server. Changing the server signs you out.',
    value: current,
    ignoreFocusOut: true,
    validateInput: validateServerUrlInput,
  });
  if (raw === undefined) {
    return;
  }
  const next = normalizeServerUrl(raw);
  if (next === current) {
    return;
  }
  await ctx.auth.clearCredential();
  await ctx.tree.resetSaved();
  await ctx.settings.writeServerUrl(next);
  showAffineInfo(`AFFiNE server set to ${next}. Sign in to continue.`);
  await refreshUi(ctx);
}

export async function signOutCommand(ctx: AffineCommandContext): Promise<void> {
  await ctx.auth.clearCredential();
  await ctx.tree.resetSaved();
  showAffineInfo('Signed out of AFFiNE');
  await refreshUi(ctx);
}

async function openDocumentRef(ctx: AffineCommandContext, workspaceId: string, docId: string, title: string): Promise<void> {
  await ctx.openPreview({ workspaceId, docId, title });
}

export async function openDocumentCommand(ctx: AffineCommandContext, nodeArg?: unknown): Promise<void> {
  const fromTree = parseDocumentNode(nodeArg);
  if (fromTree !== undefined) {
    await openDocumentRef(ctx, fromTree.workspaceId, fromTree.docId, fromTree.label);
    return;
  }

  const client = await ctx.auth.requireClient();
  const workspaceId = await pickWorkspaceId(ctx, await client.listWorkspaces());
  if (workspaceId === undefined) {
    return;
  }
  const documents = await client.listAllDocs(workspaceId);
  const items: DocumentPickItem[] = documents.map((document) => {
    const node: AffineTreeDocumentNode = toDocumentNode(document);
    return {
      label: node.label,
      description: node.docId,
      workspaceId: node.workspaceId,
      docId: node.docId,
    };
  });
  const selected = await vscode.window.showQuickPick(items, { title: 'Open AFFiNE document', matchOnDescription: true });
  if (selected === undefined) {
    return;
  }
  await openDocumentRef(ctx, selected.workspaceId, selected.docId, selected.label);
}

export async function openInBrowserCommand(ctx: AffineCommandContext, nodeArg?: unknown): Promise<void> {
  const fromTree = parseDocumentNode(nodeArg);
  if (fromTree === undefined) {
    showAffineError(new Error('Select an AFFiNE document first'));
    return;
  }
  const settings = ctx.settings.read();
  const url = buildDocumentUrl(settings.serverUrl, fromTree.workspaceId, fromTree.docId);
  await openAffineUrl(url);
}

export async function searchCommand(ctx: AffineCommandContext): Promise<void> {
  const keyword = await vscode.window.showInputBox({
    title: 'Search AFFiNE',
    prompt: 'Search page titles (and full text when the server indexer is enabled)',
    ignoreFocusOut: true,
  });
  if (keyword === undefined || keyword.trim().length === 0) {
    return;
  }

  const client = await ctx.auth.requireClient();
  const workspaces = resolveSearchWorkspaces(ctx.settings.read().defaultWorkspaceId, await client.listWorkspaces());
  const hits = await searchAllWorkspaces({ client, workspaces, keyword });

  if (hits.length === 0) {
    showAffineInfo('No AFFiNE documents matched');
    return;
  }

  const items: DocumentPickItem[] = hits.map((hit) => ({
    label: hit.title,
    description: hit.highlight === hit.title ? hit.docId : hit.highlight,
    workspaceId: hit.workspaceId,
    docId: hit.docId,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'AFFiNE search results', matchOnDescription: true });
  if (selected === undefined) {
    return;
  }
  await openDocumentRef(ctx, selected.workspaceId, selected.docId, selected.label);
}

export async function refreshCommand(ctx: AffineCommandContext): Promise<void> {
  await refreshUi(ctx);
}

export async function openLinkCommand(ctx: AffineCommandContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    showAffineInfo('Open a file with an AFFiNE link first');
    return;
  }
  const selection = editor.selection.isEmpty ? editor.document.getText() : editor.document.getText(editor.selection);
  const settings = ctx.settings.read();
  const urls = detectAffinePageUrls(selection, settings.serverUrl);
  const first = urls[0];
  if (first === undefined) {
    showAffineInfo('No AFFiNE page URL found in selection');
    return;
  }
  await openDocumentRef(ctx, first.workspaceId, first.docId, first.docId);
}

async function pickWorkspaceId(ctx: AffineCommandContext, workspaces: readonly AffineWorkspace[]): Promise<string | undefined> {
  const defaultId = ctx.settings.read().defaultWorkspaceId;
  if (defaultId !== undefined && workspaces.some((workspace) => workspace.id === defaultId)) {
    return defaultId;
  }
  if (workspaces.length === 1) {
    return workspaces[0]?.id;
  }
  const items: WorkspacePickItem[] = workspaces.map((workspace) => {
    const node = toWorkspaceNode(workspace);
    return { label: node.label, description: workspace.id, workspaceId: workspace.id };
  });
  const selected = await vscode.window.showQuickPick(items, { title: 'Select AFFiNE workspace' });
  return selected?.workspaceId;
}

interface SendTargetItem extends vscode.QuickPickItem {
  readonly target: 'new' | 'existing';
}

interface PagePickItem extends vscode.QuickPickItem {
  readonly docId: string;
}

/** Puts the selected code on an AFFiNE page: a new page, or the end of an existing one. */
export async function sendSelectionToPageCommand(ctx: AffineCommandContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || editor.selection.isEmpty) {
    showAffineInfo('Select some text first');
    return;
  }
  const { selection, document } = editor;
  const relativePath = vscode.workspace.asRelativePath(document.uri, false);
  const blocks = selectionBlocks({
    relativePath,
    startLine: selection.start.line + 1,
    endLine: selection.end.character === 0 && selection.end.line > selection.start.line ? selection.end.line : selection.end.line + 1,
    languageId: document.languageId,
    text: document.getText(selection),
  });
  const targets: SendTargetItem[] = [
    { label: '$(new-file) New page', description: 'Create a page with this selection', target: 'new' },
    { label: '$(add) Add to an existing page', description: 'Put it at the end of a page', target: 'existing' },
  ];
  const target = await vscode.window.showQuickPick(targets, { title: 'Send selection to AFFiNE' });
  if (target === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  const workspaceId = await pickWorkspaceId(ctx, await client.listWorkspaces());
  if (workspaceId === undefined) {
    return;
  }
  if (target.target === 'new') {
    const fileName = relativePath.split(/[\\/]/u).pop() ?? relativePath;
    const title = await vscode.window.showInputBox({ title: 'New page title', value: fileName, ignoreFocusOut: true });
    if (title === undefined || title.trim().length === 0) {
      return;
    }
    const created = await client.createPage({ workspaceId, title: title.trim(), folderId: null, content: blocks });
    await refreshUi(ctx);
    showAffineInfo(`Created “${title.trim()}”`);
    await openDocumentRef(ctx, workspaceId, created.id, title.trim());
    return;
  }
  const pages = (await client.listWorkspacePages(workspaceId)).documents;
  const items: PagePickItem[] = pages.map((page) => ({ label: page.title ?? 'Untitled', docId: page.id }));
  const page = await vscode.window.showQuickPick(items, { title: 'Add to which page?', matchOnDescription: true });
  if (page === undefined) {
    return;
  }
  await client.appendBlocks(workspaceId, page.docId, blocks);
  showAffineInfo(`Added to “${page.label}”`);
  await openDocumentRef(ctx, workspaceId, page.docId, page.label);
}

/** Opens a page as Markdown text in an editor tab. */
export async function openAsMarkdownCommand(ctx: AffineCommandContext, nodeArg?: unknown): Promise<void> {
  const node = parseDocumentNode(nodeArg);
  if (node === undefined) {
    showAffineInfo('Choose a page in the AFFiNE tree first');
    return;
  }
  await openPageAsMarkdown(await ctx.auth.requireClient(), node.workspaceId, node.docId);
}

export function registerAffineCommands(context: vscode.ExtensionContext, ctx: AffineCommandContext): void {
  const wrap = (handler: (...args: unknown[]) => Promise<void>): ((...args: unknown[]) => void) => {
    return (...args: unknown[]): void => {
      void handler(...args).catch((error: unknown) => {
        if (isNotSignedInError(error)) {
          void vscode.commands.executeCommand('affine.openSignIn');
          return;
        }
        showAffineError(error);
      });
    };
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'affine.openAsMarkdown',
      wrap(async (node: unknown) => {
        await openAsMarkdownCommand(ctx, node);
      })
    ),
    vscode.commands.registerCommand(
      'affine.sendSelectionToPage',
      wrap(async () => {
        await sendSelectionToPageCommand(ctx);
      })
    ),
    vscode.commands.registerCommand(
      'affine.search',
      wrap(async () => {
        await searchCommand(ctx);
      })
    ),
    vscode.commands.registerCommand(
      'affine.openLink',
      wrap(async () => {
        await openLinkCommand(ctx);
      })
    )
  );
}
