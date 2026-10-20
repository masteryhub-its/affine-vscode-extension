import { readFileSync } from 'fs';
import { join } from 'path';

interface ContributedCommand {
  readonly command: string;
  readonly title: string;
}

interface CommandPaletteEntry {
  readonly command: string;
  readonly when: string | undefined;
}

interface ServerUrlContribution {
  readonly default: string;
}

interface ExtensionPackage {
  readonly publisher: string;
  readonly contributes: {
    readonly commands: readonly ContributedCommand[];
    readonly menus: {
      readonly commandPalette: readonly CommandPaletteEntry[];
    };
    readonly configuration: {
      readonly properties: {
        readonly 'affine.serverUrl': ServerUrlContribution;
      };
    };
  };
}

function loadPackage(): ExtensionPackage {
  return JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as ExtensionPackage;
}

function paletteWhen(pkg: ExtensionPackage, command: string): string | undefined {
  const entry = pkg.contributes.menus.commandPalette.find((item) => item.command === command);
  return entry?.when;
}

describe('package command palette', () => {
  const pkg = loadPackage();

  it('contributes a search command', () => {
    expect(pkg.contributes.commands.some((item) => item.command === 'affine.search' && item.title.includes('Search'))).toBe(true);
  });

  it('shows search, open, and sign-in in the command palette', () => {
    expect(paletteWhen(pkg, 'affine.search')).not.toBe('false');
    expect(paletteWhen(pkg, 'affine.openDocument')).not.toBe('false');
    expect(paletteWhen(pkg, 'affine.openSignIn')).not.toBe('false');
  });

  it('hides tree-only organize commands from the command palette', () => {
    expect(paletteWhen(pkg, 'affine.deleteDocument')).toBe('false');
    expect(paletteWhen(pkg, 'affine.moveDocument')).toBe('false');
    expect(paletteWhen(pkg, 'affine.renameDocument')).toBe('false');
    expect(paletteWhen(pkg, 'affine.duplicateDocument')).toBe('false');
  });

  it('shows new page, restore, and open-link in the command palette', () => {
    expect(pkg.contributes.commands.some((item) => item.command === 'affine.createPage')).toBe(true);
    expect(pkg.contributes.commands.some((item) => item.command === 'affine.restoreDocument')).toBe(true);
    expect(pkg.contributes.commands.some((item) => item.command === 'affine.openLink')).toBe(true);
    expect(paletteWhen(pkg, 'affine.createPage')).not.toBe('false');
    expect(paletteWhen(pkg, 'affine.openLink')).not.toBe('false');
  });

  it('defaults the server to AFFiNE Cloud', () => {
    expect(pkg.contributes.configuration.properties['affine.serverUrl'].default).toBe('https://app.affine.pro');
  });

  it('uses the Visual Studio Marketplace publisher id', () => {
    expect(pkg.publisher).toBe('MasteryHubITS');
  });
});

interface ContributedView {
  readonly id: string;
  readonly when?: string;
}

interface TitleMenuEntry {
  readonly command: string;
  readonly when: string;
  readonly group: string;
}

interface WelcomeEntry {
  readonly view: string;
  readonly contents: string;
  readonly when: string;
}

interface LayoutPackage {
  readonly contributes: {
    readonly commands: readonly ContributedCommand[];
    readonly views: { readonly affine: readonly ContributedView[] };
    readonly viewsWelcome: readonly WelcomeEntry[];
    readonly menus: { readonly 'view/title': readonly TitleMenuEntry[] };
    readonly configuration: { readonly properties: Readonly<Record<string, { readonly default: unknown }>> };
  };
}

describe('package layout', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as LayoutPackage;
  const commandIds = new Set(pkg.contributes.commands.map((command) => command.command));
  const titleMenu = pkg.contributes.menus['view/title'];

  it('shows the native pages tree and hides the old webview panel unless asked for', () => {
    const views = pkg.contributes.views.affine;
    expect(views.find((view) => view.id === 'affineExplorer')?.when).toBeUndefined();
    expect(views.find((view) => view.id === 'affinePanel')?.when).toBe('config.affine.ui.legacySidebar');
    expect(pkg.contributes.configuration.properties['affine.ui.legacySidebar']?.default).toBe(false);
  });

  it('offers a welcome view with sign in and server choice when signed out', () => {
    const entry = pkg.contributes.viewsWelcome.find((item) => item.view === 'affineExplorer');
    expect(entry?.when).toBe('!affine.signedIn');
    expect(entry?.contents).toContain('command:affine.openSignIn');
    expect(entry?.contents).toContain('command:affine.setServerUrl');
  });

  it('keeps the title bar to three icons and moves the rest into the more menu', () => {
    const explorer = titleMenu.filter((item) => item.when.includes('affineExplorer'));
    const icons = explorer.filter((item) => item.group.startsWith('navigation')).map((item) => item.command);
    const more = explorer.filter((item) => !item.group.startsWith('navigation')).map((item) => item.command);
    expect(icons).toEqual(['affine.search', 'affine.createPage', 'affine.createFolder']);
    expect(more).toEqual(expect.arrayContaining(['affine.refresh', 'affine.forceReload', 'affine.restoreDocument', 'affine.setServerUrl', 'affine.signOut']));
  });

  it('only references commands that are contributed', () => {
    for (const item of titleMenu) {
      expect(commandIds.has(item.command)).toBe(true);
    }
    for (const match of pkg.contributes.viewsWelcome.flatMap((item) => [...item.contents.matchAll(/command:([A-Za-z.]+)/gu)])) {
      expect(commandIds.has(match[1] ?? '')).toBe(true);
    }
  });
});
