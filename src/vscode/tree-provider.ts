import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { isNotSignedInError } from '../errors/affine-error';
import { findPageTreeNode, pageTreeToExplorerNodes, SIGN_IN_TREE_NODE, toWorkspaceNode, type AffineTreeNode } from '../tree/tree-model';
import { AffineTreeKind } from '../utils/enums/affine-tree-kind.enum';
import { documentTitle } from '../client/document-url';
import type { CatalogPageTitle } from '../document/hover-title';
import type { PageTreeNode } from '../yjs/page-tree';
import { showAffineError } from './messages';

export const AFFINE_TREE_VIEW_ID = 'affineExplorer';

export class AffineTreeProvider implements vscode.TreeDataProvider<AffineTreeNode> {
  private readonly emitter = new vscode.EventEmitter<AffineTreeNode | undefined>();
  private readonly pageTrees = new Map<string, readonly PageTreeNode[]>();
  private titles: CatalogPageTitle[] = [];

  public readonly onDidChangeTreeData: vscode.Event<AffineTreeNode | undefined> = this.emitter.event;

  public constructor(private readonly auth: AuthService) {}

  public refresh(): void {
    this.pageTrees.clear();
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

    if (element.kind === AffineTreeKind.WORKSPACE) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'affineWorkspace';
      item.iconPath = new vscode.ThemeIcon('root-folder');
      item.id = `${AffineTreeKind.WORKSPACE}:${element.id}`;
      return item;
    }

    if (element.kind === AffineTreeKind.FOLDER) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'affineFolder';
      item.iconPath = new vscode.ThemeIcon('folder');
      item.id = element.id;
      return item;
    }

    const nested = this.lookup(element.workspaceId, element.docId);
    const collapsible = nested !== undefined && nested.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    const item = new vscode.TreeItem(element.label, collapsible);
    item.contextValue = 'affineDocument';
    item.iconPath = new vscode.ThemeIcon('note');
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
          this.mergeTitles(workspace.id, pages.documents);
          nodes.push(toWorkspaceNode(workspace, pages.name));
        }
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
        return [SIGN_IN_TREE_NODE];
      }
      if (element === undefined) {
        showAffineError(error);
      }
      return [];
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
    this.mergeTitles(workspaceId, pages.documents);
    return pages.tree;
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
