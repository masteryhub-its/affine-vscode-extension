export const CATALOG_TTL_MS = 60_000;

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export class CatalogCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  public constructor(private readonly ttlMs: number) {}

  public set(key: string, value: T, now: number): void {
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  public get(key: string, now: number): T | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined || now >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  public invalidate(): void {
    this.entries.clear();
  }
}
