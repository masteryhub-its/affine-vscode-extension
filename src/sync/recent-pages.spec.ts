import { parseRecentPages, pushRecentPage } from './recent-pages';

describe('pushRecentPage', () => {
  it('moves an existing page to the front and caps length', () => {
    const first = { workspaceId: 'ws', docId: 'a', title: 'A', openedAt: 1 };
    const second = { workspaceId: 'ws', docId: 'b', title: 'B', openedAt: 2 };
    const again = { workspaceId: 'ws', docId: 'a', title: 'A2', openedAt: 3 };
    expect(pushRecentPage([first, second], again, 2)).toEqual([again, second]);
  });
});

describe('parseRecentPages', () => {
  it('keeps well-formed entries only', () => {
    expect(parseRecentPages([{ workspaceId: 'ws', docId: 'd1', title: 'Spec', openedAt: 1 }, { workspaceId: 'ws' }])).toEqual([{ workspaceId: 'ws', docId: 'd1', title: 'Spec', openedAt: 1 }]);
  });
});
