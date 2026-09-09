import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../..');

interface MarketplacePackage {
  readonly galleryBanner: {
    readonly color: string;
    readonly theme: string;
  };
}

describe('marketplace assets', () => {
  it('ships sidebar, preview, and sign-in screenshots', () => {
    expect(existsSync(join(root, 'media/screenshots/sidebar.png'))).toBe(true);
    expect(existsSync(join(root, 'media/screenshots/preview.png'))).toBe(true);
    expect(existsSync(join(root, 'media/screenshots/signin.png'))).toBe(true);
  });

  it('embeds those screenshots in the README', () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toContain('media/screenshots/sidebar.png');
    expect(readme).toContain('media/screenshots/preview.png');
    expect(readme).toContain('media/screenshots/signin.png');
  });

  it('declares a dark marketplace gallery banner', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as MarketplacePackage;
    expect(pkg.galleryBanner.theme).toBe('dark');
    expect(pkg.galleryBanner.color.length).toBeGreaterThan(0);
  });

  it('publishes to Marketplace and Open VSX from a GitHub Release', () => {
    const workflow = readFileSync(join(root, '.github/workflows/publish.yml'), 'utf8');
    expect(workflow).toContain('vsce publish');
    expect(workflow).toContain('ovsx publish');
    expect(workflow).toContain('VSCE_PAT');
    expect(workflow).toContain('OVSX_PAT');
  });
});
