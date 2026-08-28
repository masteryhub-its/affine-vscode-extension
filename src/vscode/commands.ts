import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { detectAffinePageUrls } from '../document/detect-links';
import { buildDocumentUrl } from '../client/document-url';
import type { AffineWorkspace } from '../client/affine.types';
import type { SettingsReader } from '../config/settings.types';
import { isNotSignedInError } from '../errors/affine-error';
import { searchAllWorkspaces } from '../search/search-all-workspaces';
import { resolveSearchWorkspaces } from '../search/resolve-workspaces';
import { SignInMethod } from '../utils/enums/sign-in-method.enum';
import { parseDocumentNode, toDocumentNode, toWorkspaceNode, type AffineTreeDocumentNode } from '../tree/tree-model';
import { showAffineError, showAffineInfo } from './messages';
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
  readonly settings: SettingsReader;
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
    { label: 'Email and password', description: 'Mint a named token from your account password', method: SignInMethod.PASSWORD },
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
    prompt: 'Password is used once to mint an access token and is not stored',
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) {
    return;
  }
  const user = await ctx.auth.signInWithPassword({ email, password });
  showAffineInfo(`Signed in as ${user.email}`);
  await refreshUi(ctx);
}

export async function signOutCommand(ctx: AffineCommandContext): Promise<void> {
  await ctx.auth.clearCredential();
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
