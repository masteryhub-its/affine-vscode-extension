import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { folderQuickPickItems, isRestoreConfirmed, isTrashConfirmed, RESTORE_CONFIRM_ACTION, TRASH_CONFIRM_ACTION } from '../organize/organize-actions';
import { parseDocumentNode } from '../tree/tree-model';
import type { PageTreeNode } from '../yjs/page-tree';
import { showAffineInfo } from './messages';
import type { AffineTreeProvider } from './tree-provider';

export interface OrganizeCommandContext {
  readonly auth: AuthService;
  readonly tree: AffineTreeProvider;
  readonly refresh: () => void;
}

interface FolderDestinationItem extends vscode.QuickPickItem {
  readonly folderId: string | null;
}

export async function confirmTrashPage(title: string): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(`Move “${title}” to AFFiNE trash?`, { modal: true }, TRASH_CONFIRM_ACTION);
  return isTrashConfirmed(choice);
}

export async function pickDestinationFolder(tree: readonly PageTreeNode[]): Promise<string | null | undefined> {
  const items: FolderDestinationItem[] = folderQuickPickItems(tree).map((item) => ({
    label: item.label,
    folderId: item.folderId,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Move to folder' });
  if (selected === undefined) {
    return undefined;
  }
  return selected.folderId;
}

interface WorkspacePickItem extends vscode.QuickPickItem {
  readonly workspaceId: string;
}

interface TrashedPageItem extends vscode.QuickPickItem {
  readonly docId: string;
  readonly title: string;
}

async function pickWorkspace(ctx: OrganizeCommandContext): Promise<string | undefined> {
  const client = await ctx.auth.requireClient();
  const workspaces = await client.listWorkspaces();
  if (workspaces.length === 1) {
    return workspaces[0]?.id;
  }
  const items: WorkspacePickItem[] = workspaces.map((workspace) => ({
    label: workspace.id,
    workspaceId: workspace.id,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Select AFFiNE workspace' });
  return selected?.workspaceId;
}

export async function createPageCommand(ctx: OrganizeCommandContext): Promise<void> {
  const workspaceId = await pickWorkspace(ctx);
  if (workspaceId === undefined) {
    return;
  }
  const title = await vscode.window.showInputBox({ title: 'New page title', ignoreFocusOut: true });
  if (title === undefined || title.trim().length === 0) {
    return;
  }
  const folderId = await pickDestinationFolder(ctx.tree.workspaceTree(workspaceId));
  if (folderId === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  const created = await client.createPage({ workspaceId, title: title.trim(), folderId });
  ctx.refresh();
  showAffineInfo(`Created “${created.title ?? title.trim()}”`);
}

export async function createFolderCommand(ctx: OrganizeCommandContext): Promise<void> {
  const workspaceId = await pickWorkspace(ctx);
  if (workspaceId === undefined) {
    return;
  }
  const title = await vscode.window.showInputBox({ title: 'New folder name', ignoreFocusOut: true });
  if (title === undefined || title.trim().length === 0) {
    return;
  }
  const parentId = await pickDestinationFolder(ctx.tree.workspaceTree(workspaceId));
  if (parentId === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.createFolder({ workspaceId, title: title.trim(), parentId });
  ctx.refresh();
  showAffineInfo(`Created folder “${title.trim()}”`);
}

export async function restoreDocumentCommand(ctx: OrganizeCommandContext): Promise<void> {
  const workspaceId = await pickWorkspace(ctx);
  if (workspaceId === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  const trashed = await client.listTrashedPages(workspaceId);
  if (trashed.length === 0) {
    showAffineInfo('No pages in trash');
    return;
  }
  const items: TrashedPageItem[] = trashed.map((page) => ({
    label: page.title ?? 'Untitled',
    description: page.id,
    docId: page.id,
    title: page.title ?? 'Untitled',
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Restore from trash' });
  if (selected === undefined) {
    return;
  }
  const choice = await vscode.window.showWarningMessage(`Restore “${selected.title}” from AFFiNE trash?`, { modal: true }, RESTORE_CONFIRM_ACTION);
  if (!isRestoreConfirmed(choice)) {
    return;
  }
  await client.restorePage(workspaceId, selected.docId);
  ctx.refresh();
  showAffineInfo(`Restored “${selected.title}”`);
}

export async function duplicateDocumentCommand(ctx: OrganizeCommandContext, nodeArg: unknown): Promise<void> {
  const parsed = parseDocumentNode(nodeArg);
  if (parsed === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  const copy = await client.duplicatePage(parsed.workspaceId, parsed.docId);
  ctx.refresh();
  showAffineInfo(`Duplicated as “${copy.title ?? 'Untitled'}”`);
}

export async function renameDocumentCommand(ctx: OrganizeCommandContext, nodeArg: unknown): Promise<void> {
  const parsed = parseDocumentNode(nodeArg);
  if (parsed === undefined) {
    return;
  }
  const title = await vscode.window.showInputBox({ title: 'Rename page', value: parsed.label, ignoreFocusOut: true });
  if (title === undefined || title.trim().length === 0) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.renamePage(parsed.workspaceId, parsed.docId, title.trim());
  ctx.refresh();
}

export async function deleteDocumentCommand(ctx: OrganizeCommandContext, nodeArg: unknown): Promise<void> {
  const parsed = parseDocumentNode(nodeArg);
  if (parsed === undefined) {
    return;
  }
  if (!(await confirmTrashPage(parsed.label))) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.trashPage(parsed.workspaceId, parsed.docId);
  ctx.refresh();
}

export async function moveDocumentCommand(ctx: OrganizeCommandContext, nodeArg: unknown): Promise<void> {
  const parsed = parseDocumentNode(nodeArg);
  if (parsed === undefined) {
    return;
  }
  const folderId = await pickDestinationFolder(ctx.tree.workspaceTree(parsed.workspaceId));
  if (folderId === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.movePage(parsed.workspaceId, parsed.docId, folderId);
  ctx.refresh();
}
