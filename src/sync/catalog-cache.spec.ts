import { CatalogCache, CATALOG_TTL_MS } from './catalog-cache';

describe('CatalogCache', () => {
  it('returns a stored value before the TTL expires', () => {
    const cache = new CatalogCache<string>(CATALOG_TTL_MS);
    cache.set('ws-1', 'pages', 1_000);
    expect(cache.get('ws-1', 1_000 + CATALOG_TTL_MS - 1)).toBe('pages');
  });

  it('misses after the TTL and after invalidate', () => {
    const cache = new CatalogCache<string>(CATALOG_TTL_MS);
    cache.set('ws-1', 'pages', 1_000);
    expect(cache.get('ws-1', 1_000 + CATALOG_TTL_MS)).toBeUndefined();
    cache.set('ws-1', 'pages', 1_000);
    cache.invalidate();
    expect(cache.get('ws-1', 1_000)).toBeUndefined();
  });
});
