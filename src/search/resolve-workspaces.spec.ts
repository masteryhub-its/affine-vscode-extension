import type { AffineWorkspace } from '../client/affine.types';
import { resolveSearchWorkspaces } from './resolve-workspaces';

describe('resolveSearchWorkspaces', () => {
  const workspaces: readonly AffineWorkspace[] = [{ id: 'ws-a' }, { id: 'ws-b' }];

  it('returns every workspace when no default is set', () => {
    expect(resolveSearchWorkspaces(undefined, workspaces)).toEqual(workspaces);
  });

  it('returns only the default workspace when it is in the list', () => {
    expect(resolveSearchWorkspaces('ws-b', workspaces)).toEqual([{ id: 'ws-b' }]);
  });

  it('returns every workspace when the default is unknown', () => {
    expect(resolveSearchWorkspaces('missing', workspaces)).toEqual(workspaces);
  });
});
