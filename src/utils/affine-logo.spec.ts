import { readFileSync } from 'fs';
import { join } from 'path';
import { AFFINE_MARK_PATH, AFFINE_MARK_VIEW_BOX, affineMarkSvg } from './affine-logo';

describe('affine logo', () => {
  it('draws the real mark, not the placeholder triangle', () => {
    expect(AFFINE_MARK_PATH).not.toBe('M12 2L22 21H2z');
    expect(AFFINE_MARK_PATH.length).toBeGreaterThan(1000);
  });

  it('wraps the mark in an svg with the given class and no scripts', () => {
    const svg = affineMarkSvg('logo');
    expect(svg).toContain('class="logo"');
    expect(svg).toContain(AFFINE_MARK_VIEW_BOX);
    expect(svg).toContain(AFFINE_MARK_PATH);
    expect(svg).not.toMatch(/<script|on\w+=/iu);
  });

  it('is the same drawing as the activity bar icon file', () => {
    const file = readFileSync(join(__dirname, '../../media/affine.svg'), 'utf8');
    expect(file).toContain(AFFINE_MARK_PATH);
    expect(file).toContain(AFFINE_MARK_VIEW_BOX);
  });
});
