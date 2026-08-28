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

interface ExtensionPackage {
  readonly contributes: {
    readonly commands: readonly ContributedCommand[];
    readonly menus: {
      readonly commandPalette: readonly CommandPaletteEntry[];
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
});
