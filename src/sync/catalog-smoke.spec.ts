import type { AffineClient } from '../client/affine-client';
import { loadSidebarCatalog } from '../sidebar/load-catalog';
import { CATALOG_SMOKE_DOC_COUNT, COLD_SYNC_BUDGET_MS, createCatalogSmokeClient } from './catalog-smoke';

describe('catalog smoke', () => {
  it('builds a MasteryHub-sized workspace of 250 docs', async () => {
    expect(CATALOG_SMOKE_DOC_COUNT).toBe(250);
    const client = createCatalogSmokeClient({ workspaceId: 'smoke-workspace', name: 'Docs', docCount: CATALOG_SMOKE_DOC_COUNT }) as unknown as AffineClient;
    const catalog = await loadSidebarCatalog(client);
    const workspace = catalog[0];
    expect(workspace?.documents).toHaveLength(CATALOG_SMOKE_DOC_COUNT);
  });

  it('maps a cold catalog under the 2s CI budget', async () => {
    expect(COLD_SYNC_BUDGET_MS).toBe(2000);
    const client = createCatalogSmokeClient({ workspaceId: 'smoke-workspace', name: 'Docs', docCount: CATALOG_SMOKE_DOC_COUNT }) as unknown as AffineClient;
    const started = Date.now();
    await loadSidebarCatalog(client);
    expect(Date.now() - started).toBeLessThan(COLD_SYNC_BUDGET_MS);
  });
});
