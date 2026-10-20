import type { AffineWorkspace, AffineWorkspacePages } from '../client/affine.types';
import { loadAllWorkspacePages, type WorkspacePagesLoader } from './load-workspaces';

function pages(name: string): AffineWorkspacePages {
  return { name, documents: [], tree: [], favorites: [], collections: [] };
}

const workspaces: readonly AffineWorkspace[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as readonly AffineWorkspace[];

interface TimedLoader {
  readonly loader: WorkspacePagesLoader;
  readonly maxInFlight: () => number;
}

function loader(delayMs: number): TimedLoader {
  let inFlight = 0;
  let max = 0;
  return {
    maxInFlight: () => max,
    loader: {
      listWorkspacePages: async (id) => {
        inFlight += 1;
        max = Math.max(max, inFlight);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        inFlight -= 1;
        return pages(`name-${id}`);
      },
    },
  };
}

describe('loadAllWorkspacePages', () => {
  it('loads the workspaces at the same time, not one after another', async () => {
    const fake = loader(25);
    const started = Date.now();
    await loadAllWorkspacePages(fake.loader, workspaces);
    expect(fake.maxInFlight()).toBe(3);
    expect(Date.now() - started).toBeLessThan(25 * 3);
  });

  it('keeps the workspaces in their original order', async () => {
    const result = await loadAllWorkspacePages(loader(5).loader, workspaces);
    expect(result.map((item) => item.workspace.id)).toEqual(['a', 'b', 'c']);
    expect(result.map((item) => item.pages.name)).toEqual(['name-a', 'name-b', 'name-c']);
  });

  it('returns nothing for no workspaces', async () => {
    expect(await loadAllWorkspacePages(loader(1).loader, [])).toEqual([]);
  });

  it('fails when a workspace cannot be loaded, so the caller can show why', async () => {
    const failing: WorkspacePagesLoader = { listWorkspacePages: (id) => (id === 'b' ? Promise.reject(new Error('offline')) : Promise.resolve(pages(id))) };
    await expect(loadAllWorkspacePages(failing, workspaces)).rejects.toThrow('offline');
  });
});
