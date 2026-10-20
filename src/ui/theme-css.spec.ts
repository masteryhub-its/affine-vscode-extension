import { THEME_CSS } from './theme-css';

describe('THEME_CSS', () => {
  it('takes every colour from the editor theme, never a hard-coded value', () => {
    expect(THEME_CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/u);
    expect(THEME_CSS).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/u);
    expect(THEME_CSS).toContain('var(--vscode-foreground)');
    expect(THEME_CSS).toContain('var(--vscode-editor-background)');
  });

  it('shows keyboard focus on every control', () => {
    expect(THEME_CSS).toContain(':focus-visible');
    expect(THEME_CSS).toContain('var(--vscode-focusBorder)');
  });

  it('adds borders in high contrast themes, where colour alone is not enough', () => {
    expect(THEME_CSS).toContain('body.vscode-high-contrast');
    expect(THEME_CSS).toContain('var(--vscode-contrastBorder)');
  });

  it('stops animating when the user asks for less motion', () => {
    expect(THEME_CSS).toContain('prefers-reduced-motion');
  });

  it('lets grid children shrink and stacks the layout on a narrow panel', () => {
    expect(THEME_CSS).toContain('min-width: 0');
    expect(THEME_CSS).toContain('@media (max-width');
  });

  it('styles the pieces the previews use', () => {
    for (const selector of ['.btn', '.btn.primary', '.pill', '.chip', '.avatar', '.props', '.progress', '.skeleton', '.composer', '.prose']) {
      expect(THEME_CSS).toContain(selector);
    }
  });
});
