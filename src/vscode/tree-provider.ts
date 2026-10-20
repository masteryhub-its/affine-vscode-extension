import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { isNotSignedInError } from '../errors/affine-error';
import { findPageTreeNode, pageTreeToExplorerNodes, toErrorNode, toWorkspaceNode, type AffineTreeNode } from '../tree/tree-model';
import { formatAffineError } from '../errors/format-error';
import { presentFolder, presentPage, presentWorkspace, type IconSpec } from '../tree/page-presentation';
import { escapeMarkdown } from '../utils/markdown-escape';
import { AffineTreeKind } from '../utils/enums/affine-tree-kind.enum';
import { documentTitle } from '../client/document-url';
import type { CatalogPageTitle } from '../document/hover-title';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import type { PageTreeNode } from '../yjs/page-tree';

export const AFFINE_TREE_VIEW_ID = 'affineExplorer';

interface WorkspacePagesMeta {
  readonly documents: readonly { readonly id: string; readonly tags?: readonly string[] }[];
  readonly favorites: readonly { readonly id: string }[];
}

interface PageMeta {
  readonly tags: readonly string[];
  readonly favorite: boolean;
}

function toThemeIcon(spec: IconSpec): vscode.ThemeIcon {
  return new vscode.ThemeIcon(spec.id, spec.color === undefined ? undefined : new vscode.ThemeColor(spec.color));
}

function setSignedIn(signedIn: boolean): void {
  void vscode.commands.executeCommand('setContext', 'affine.signedIn', signedIn);
}

function countPages(nodes: readonly PageTreeNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === PageTreeKind.FOLDER ? countPages(node.children) : 1 + countPages(node.children)), 0);
}

export class AffineTreeProvider implements vscode.TreeDataProvider<AffineTreeNode> {
  private readonly emitter = new vscode.EventEmitter<AffineTreeNode | undefined>();
  private readonly pageTrees = new Map<string, readonly PageTreeNode[]>();
  private readonly pageMeta = new Map<string, ReadonlyMap<string, PageMeta>>();
  private titles: CatalogPageTitle[] = [];

  public readonly onDidChangeTreeData: vscode.Event<AffineTreeNode | undefined> = this.emitter.event;

  public constructor(private readonly auth: AuthService) {}

  public refresh(): void {
    this.pageTrees.clear();
    this.pageMeta.clear();
    this.titles = [];
    this.emitter.fire(undefined);
  }

  public catalogTitles(): readonly CatalogPageTitle[] {
    return this.titles;
  }

  public workspaceTree(workspaceId: string): readonly PageTreeNode[] {
    return this.pageTrees.get(workspaceId) ?? [];
  }

  public getTreeItem(element: AffineTreeNode): vscode.TreeItem {
    if (element.kind === AffineTreeKind.ACTION) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'affineSignIn';
      item.iconPath = new vscode.ThemeIcon('key');
      item.command = {
        command: 'affine.openSignIn',
        title: 'Sign in to AFFiNE',
      };
      return item;
    }

    if (element.kind === AffineTreeKind.ERROR) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'affineError';
      item.description = element.message;
      item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
      item.tooltip = new vscode.MarkdownString(`${escapeMarkdown(element.message)}\n\nClick to try again.`);
      item.command = { command: 'affine.refresh', title: 'Try again' };
      return item;
    }

    if (element.kind === AffineTreeKind.WORKSPACE) {
      const view = presentWorkspace({ title: element.label, pageCount: countPages(this.pageTrees.get(element.id) ?? []) });
      const item = new vscode.TreeItem(view.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'affineWorkspace';
      item.description = view.description;
      item.iconPath = toThemeIcon(view.icon);
      item.id = `${AffineTreeKind.WORKSPACE}:${element.id}`;
      return item;
    }

    if (element.kind === AffineTreeKind.FOLDER) {
      const node = this.lookup(element.workspaceId, element.folderId);
      const view = presentFolder({ title: element.label, itemCount: node?.children.length ?? 0 });
      const item = new vscode.TreeItem(view.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'affineFolder';
      item.description = view.description;
      item.iconPath = toThemeIcon(view.icon);
      item.id = element.id;
      return item;
    }

    const nested = this.lookup(element.workspaceId, element.docId);
    const collapsible = nested !== undefined && nested.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    const meta = this.pageMeta.get(element.workspaceId)?.get(element.docId);
    const view = presentPage({ title: element.label, tags: meta?.tags ?? [], favorite: meta?.favorite ?? false, subpageCount: nested?.children.length ?? 0 });
    const item = new vscode.TreeItem(view.label, collapsible);
    item.contextValue = 'affineDocument';
    item.description = view.description;
    item.iconPath = toThemeIcon(view.icon);
    item.tooltip = new vscode.MarkdownString(view.tooltip.map(escapeMarkdown).join('\n\n'));
    item.id = `${AffineTreeKind.DOCUMENT}:${element.id}`;
    item.command = {
      command: 'affine.openDocument',
      title: 'Open AFFiNE document',
      arguments: [element],
    };
    return item;
  }

  public async getChildren(element?: AffineTreeNode): Promise<AffineTreeNode[]> {
    try {
      if (element === undefined) {
        const client = await this.auth.requireClient();
        const workspaces = await client.listWorkspaces();
        const nodes: AffineTreeNode[] = [];
        for (const workspace of workspaces) {
          const pages = await client.listWorkspacePages(workspace.id);
          this.pageTrees.set(workspace.id, pages.tree);
          this.rememberMeta(workspace.id, pages);
          this.mergeTitles(workspace.id, pages.documents);
          nodes.push(toWorkspaceNode(workspace, pages.name));
        }
        setSignedIn(true);
        return nodes;
      }
      if (element.kind === AffineTreeKind.WORKSPACE) {
        const tree = await this.treeFor(element.id);
        return pageTreeToExplorerNodes(element.id, tree);
      }
      if (element.kind === AffineTreeKind.FOLDER) {
        const node = this.lookup(element.workspaceId, element.folderId);
        return node === undefined ? [] : pageTreeToExplorerNodes(element.workspaceId, node.children);
      }
      if (element.kind === AffineTreeKind.DOCUMENT) {
        const node = this.lookup(element.workspaceId, element.docId);
        return node === undefined ? [] : pageTreeToExplorerNodes(element.workspaceId, node.children);
      }
      return [];
    } catch (error: unknown) {
      if (element === undefined && isNotSignedInError(error)) {
        // An empty tree lets the signed-out welcome view show.
        setSignedIn(false);
        return [];
      }
      if (element === undefined) {
        // Still signed in: show why the list is empty, with a way to try again, not the sign-in welcome.
        setSignedIn(await this.hasCredential());
        return [toErrorNode(formatAffineError(error))];
      }
      return [];
    }
  }

  private async hasCredential(): Promise<boolean> {
    try {
      return (await this.auth.readCredential()) !== undefined;
    } catch {
      return true;
    }
  }

  private async treeFor(workspaceId: string): Promise<readonly PageTreeNode[]> {
    const cached = this.pageTrees.get(workspaceId);
    if (cached !== undefined) {
      return cached;
    }
    const client = await this.auth.requireClient();
    const pages = await client.listWorkspacePages(workspaceId);
    this.pageTrees.set(workspaceId, pages.tree);
    this.rememberMeta(workspaceId, pages);
    this.mergeTitles(workspaceId, pages.documents);
    return pages.tree;
  }

  private rememberMeta(workspaceId: string, pages: WorkspacePagesMeta): void {
    const favorites = new Set(pages.favorites.map((page) => page.id));
    const meta = new Map<string, PageMeta>();
    for (const document of pages.documents) {
      meta.set(document.id, { tags: document.tags ?? [], favorite: favorites.has(document.id) });
    }
    this.pageMeta.set(workspaceId, meta);
  }

  private mergeTitles(workspaceId: string, documents: readonly { readonly id: string; readonly title: string | null }[]): void {
    const next = this.titles.filter((item) => item.workspaceId !== workspaceId);
    for (const document of documents) {
      next.push({ workspaceId, docId: document.id, title: documentTitle(document.title) });
    }
    this.titles = next;
  }

  private lookup(workspaceId: string, nodeId: string): PageTreeNode | undefined {
    return findPageTreeNode(this.pageTrees.get(workspaceId) ?? [], nodeId);
  }
}
