import { parseCssColor } from './css-color';

describe('parseCssColor', () => {
  it('keeps hex, rgb, and CSS variables', () => {
    expect(parseCssColor('#ff0')).toBe('#ff0');
    expect(parseCssColor('rgba(255, 243, 0, 0.4)')).toBe('rgba(255, 243, 0, 0.4)');
    expect(parseCssColor('var(--affine-text-highlight-yellow)')).toBe('var(--affine-text-highlight-yellow)');
  });

  it('drops values that are not a safe color', () => {
    expect(parseCssColor('yellow;position:fixed')).toBeUndefined();
    expect(parseCssColor('url(javascript:alert(1))')).toBeUndefined();
    expect(parseCssColor(true)).toBeUndefined();
  });
});
