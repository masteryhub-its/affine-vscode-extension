export interface MentionLookupOptions {
  readonly maxIds: number;
  readonly concurrency: number;
}

/**
 * Resolves each distinct id once, at most `maxIds` of them, with at most `concurrency` requests in flight.
 * An id that fails or is unknown is skipped; the rest are returned.
 */
export async function lookupMentions<T>(ids: readonly string[], fetchOne: (id: string) => Promise<T | undefined>, options: MentionLookupOptions): Promise<ReadonlyMap<string, T>> {
  const distinct = [...new Set(ids)].slice(0, options.maxIds);
  const found = new Map<string, T>();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < distinct.length) {
      const id = distinct[next];
      next += 1;
      if (id === undefined) {
        return;
      }
      try {
        const value = await fetchOne(id);
        if (value !== undefined) {
          found.set(id, value);
        }
      } catch {
        // A failed lookup only means that mention keeps its original text.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, distinct.length) }, () => worker()));
  return found;
}
