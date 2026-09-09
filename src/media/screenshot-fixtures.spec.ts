import { renderPageHtml } from '../document/render-page-html';
import { renderSidebarHtml } from '../sidebar/sidebar-html';
import { MarketplaceShotName } from '../utils/enums/marketplace-shot-name.enum';
import { previewPageHtmlInput, signedInSidebarHtmlInput, signedOutSidebarHtmlInput } from './screenshot-fixtures';
import { wrapMarketplaceFrame } from './screenshot-frame';

describe('marketplace screenshot fixtures', () => {
  it('renders a signed-in sidebar with Organize folders', () => {
    const html = renderSidebarHtml(signedInSidebarHtmlInput());
    expect(html).toContain('API Handbook');
    expect(html).toContain('Favorites');
    expect(html).toContain('Product');
  });

  it('renders a sign-in form for the signed-out shot', () => {
    const html = renderSidebarHtml(signedOutSidebarHtmlInput());
    expect(html).toContain('Sign in');
    expect(html).toContain('https://app.affine.pro');
  });

  it('renders a preview with tables and callouts', () => {
    const html = renderPageHtml(previewPageHtmlInput());
    expect(html).toContain('API Handbook');
    expect(html).toContain('preview-table');
    expect(html).toContain('callout');
  });

  it('wraps the real webview HTML in an editor chrome', () => {
    const html = wrapMarketplaceFrame({
      kind: MarketplaceShotName.SIDEBAR,
      sidebarHtml: renderSidebarHtml(signedInSidebarHtmlInput()),
      previewHtml: undefined,
    });
    expect(html).toContain('Activity Bar');
    expect(html).toContain('API Handbook');
    expect(html).toContain('Visual Studio Code');
  });
});
