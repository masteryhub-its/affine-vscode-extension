import { presentFolder, presentPage, presentWorkspace } from './page-presentation';

describe('presentPage', () => {
  it('shows the title with a document icon', () => {
    const view = presentPage({ title: 'API Handbook', tags: [], favorite: false, subpageCount: 0 });
    expect(view.label).toBe('API Handbook');
    expect(view.description).toBe('');
    expect(view.icon).toEqual({ id: 'note', color: undefined });
  });

  it('falls back to Untitled for a blank title', () => {
    expect(presentPage({ title: '   ', tags: [], favorite: false, subpageCount: 0 }).label).toBe('Untitled');
  });

  it('marks a favorite with a coloured star', () => {
    expect(presentPage({ title: 'A', tags: [], favorite: true, subpageCount: 0 }).icon).toEqual({ id: 'star-full', color: 'charts.yellow' });
  });

  it('lists up to two tags in the description and counts the rest', () => {
    expect(presentPage({ title: 'A', tags: ['spec'], favorite: false, subpageCount: 0 }).description).toBe('spec');
    expect(presentPage({ title: 'A', tags: ['spec', 'api'], favorite: false, subpageCount: 0 }).description).toBe('spec · api');
    expect(presentPage({ title: 'A', tags: ['spec', 'api', 'v2', 'draft'], favorite: false, subpageCount: 0 }).description).toBe('spec · api · +2');
  });

  it('mentions sub-pages after the tags', () => {
    expect(presentPage({ title: 'A', tags: ['spec'], favorite: false, subpageCount: 3 }).description).toBe('spec · 3 sub-pages');
    expect(presentPage({ title: 'A', tags: [], favorite: false, subpageCount: 1 }).description).toBe('1 sub-page');
  });

  it('writes a plain-text tooltip', () => {
    const view = presentPage({ title: 'API Handbook', tags: ['spec', 'api'], favorite: true, subpageCount: 2 });
    expect(view.tooltip).toEqual(['API Handbook', 'Favorite', 'Tags: spec, api', 'Sub-pages: 2']);
  });

  it('leaves out tooltip lines that do not apply', () => {
    expect(presentPage({ title: 'A', tags: [], favorite: false, subpageCount: 0 }).tooltip).toEqual(['A']);
  });
});

describe('presentFolder and presentWorkspace', () => {
  it('counts what a folder holds', () => {
    expect(presentFolder({ title: 'Docs', itemCount: 3 })).toEqual({ label: 'Docs', description: '3', icon: { id: 'folder', color: undefined } });
    expect(presentFolder({ title: 'Empty', itemCount: 0 })).toEqual({ label: 'Empty', description: '', icon: { id: 'folder', color: undefined } });
    expect(presentFolder({ title: '', itemCount: 1 }).label).toBe('Untitled folder');
  });

  it('counts a workspace’s pages', () => {
    expect(presentWorkspace({ title: 'MasteryHub', pageCount: 12 })).toEqual({ label: 'MasteryHub', description: '12 pages', icon: { id: 'organization', color: undefined } });
    expect(presentWorkspace({ title: 'Solo', pageCount: 1 }).description).toBe('1 page');
    expect(presentWorkspace({ title: 'New', pageCount: 0 }).description).toBe('');
  });
});
