import { generateKeyBetween } from 'fractional-indexing';
import type { FolderRecord } from '../yjs/page-tree';
import { nextOrganizeIndex } from './organize-index';

function record(id: string, parentId: string | null, index: string): FolderRecord {
  return { id, parentId, type: 'folder', data: id, index };
}

describe('nextOrganizeIndex', () => {
  it('starts a new list with a valid key', () => {
    const key = nextOrganizeIndex([], null);
    expect(() => generateKeyBetween(key, null)).not.toThrow();
  });

  it('sorts after every sibling under the same parent', () => {
    const siblings = [record('a', 'p', 'a0'), record('b', 'p', 'a1'), record('c', 'other', 'a5')];
    const key = nextOrganizeIndex(siblings, 'p');
    expect(key.localeCompare('a1') > 0).toBe(true);
  });

  it('ignores siblings whose key is not a valid order key instead of throwing', () => {
    const siblings = [record('old', 'p', 'amlk0'), record('ok', 'p', 'a1')];
    expect(() => nextOrganizeIndex(siblings, 'p')).not.toThrow();
    expect(nextOrganizeIndex(siblings, 'p').localeCompare('a1') > 0).toBe(true);
  });

  it('accepts keys written by the previous extension version', () => {
    const siblings = [record('old', null, 'amvfef0sj')];
    expect(() => nextOrganizeIndex(siblings, null)).not.toThrow();
  });

  it('never produces a key that breaks the next insert, whatever the random source returns', () => {
    for (const random of [0, 0.000001, 0.5, 0.999999]) {
      let siblings: FolderRecord[] = [];
      for (let i = 0; i < 30; i += 1) {
        const key = nextOrganizeIndex(siblings, null, () => random);
        expect(() => generateKeyBetween(key, null)).not.toThrow();
        siblings = [...siblings, record(`r${i}`, null, key)];
      }
    }
  });

  it('keeps order across many inserts with real randomness', () => {
    let siblings: FolderRecord[] = [];
    const keys: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const key = nextOrganizeIndex(siblings, null);
      keys.push(key);
      siblings = [...siblings, record(`r${i}`, null, key)];
    }
    expect([...keys].sort()).toEqual(keys);
  });
});
