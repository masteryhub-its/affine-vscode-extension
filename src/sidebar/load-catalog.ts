import type { AffineClient } from '../client/affine-client';
import { documentTitle, workspaceLabel } from '../client/document-url';
import type { CatalogCache } from '../sync/catalog-cache';
import { docsFingerprint } from '../sync/docs-fingerprint';
import type { SidebarWorkspace } from './sidebar.types';

export interface CachedCatalogWorkspace {
  readonly fingerprint: string;
  readonly workspace: SidebarWorkspace;
}

export interface LoadSidebarCatalogOptions {
  readonly cache: CatalogCache<CachedCatalogWorkspace>;
  readonly now: number;
}

export async function loadSidebarCatalog(client: AffineClient, options?: LoadSidebarCatalogOptions): Promise<readonly SidebarWorkspace[]> {
  const workspaces = await client.listWorkspaces();
  const catalog: SidebarWorkspace[] = [];
  for (const workspace of workspaces) {
    if (options !== undefined) {
      const docs = await client.listAllDocs(workspace.id);
      const fingerprint = docsFingerprint(docs);
      const cached = options.cache.get(workspace.id, options.now);
      if (cached?.fingerprint === fingerprint) {
        catalog.push(cached.workspace);
        continue;
      }
      const mapped = await mapWorkspace(client, workspace.id);
      options.cache.set(workspace.id, { fingerprint, workspace: mapped }, options.now);
      catalog.push(mapped);
      continue;
    }
    catalog.push(await mapWorkspace(client, workspace.id));
  }
  return catalog;
}

async function mapWorkspace(client: AffineClient, workspaceId: string): Promise<SidebarWorkspace> {
  const pages = await client.listWorkspacePages(workspaceId);
  return {
    id: workspaceId,
    label: workspaceLabel(workspaceId, pages.name),
    documents: pages.documents.map((document) => ({
      id: document.id,
      title: documentTitle(document.title),
      tags: document.tags ?? [],
    })),
    tree: pages.tree,
    favorites: pages.favorites.map((document) => ({
      id: document.id,
      title: documentTitle(document.title),
      tags: document.tags ?? [],
    })),
    collections: pages.collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
    })),
  };
}
