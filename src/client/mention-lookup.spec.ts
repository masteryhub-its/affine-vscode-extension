import { lookupMentions } from './mention-lookup';

describe('lookupMentions', () => {
  it('looks each id up once, however many times it is mentioned', async () => {
    const calls: string[] = [];
    const found = await lookupMentions(['a', 'b', 'a', 'a', 'b'], (id) => (calls.push(id), Promise.resolve(id.toUpperCase())), { maxIds: 25, concurrency: 4 });
    expect(calls.sort()).toEqual(['a', 'b']);
    expect(found.get('a')).toBe('A');
    expect(found.get('b')).toBe('B');
  });

  it('stops at the id cap', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `u${i}`);
    const calls: string[] = [];
    await lookupMentions(ids, (id) => (calls.push(id), Promise.resolve(id)), { maxIds: 25, concurrency: 4 });
    expect(calls).toHaveLength(25);
  });

  it('never runs more lookups at once than the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    const ids = Array.from({ length: 20 }, (_, i) => `u${i}`);
    await lookupMentions(
      ids,
      async (id) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return id;
      },
      { maxIds: 25, concurrency: 4 }
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it('skips ids that fail or are unknown and keeps the rest', async () => {
    const found = await lookupMentions(['ok', 'boom', 'none'], (id) => (id === 'boom' ? Promise.reject(new Error('x')) : Promise.resolve(id === 'none' ? undefined : id)), {
      maxIds: 25,
      concurrency: 2,
    });
    expect([...found.keys()]).toEqual(['ok']);
  });

  it('returns an empty map for no ids', async () => {
    expect((await lookupMentions([], () => Promise.resolve('x'), { maxIds: 25, concurrency: 4 })).size).toBe(0);
  });
});
