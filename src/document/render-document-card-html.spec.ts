import { renderDocumentCardHtml } from './render-document-card-html';

describe('renderDocumentCardHtml', () => {
  it('renders a local open page without embedding AFFiNE in an iframe', () => {
    const html = renderDocumentCardHtml({
      title: 'Roadmap',
      url: 'https://affine.masteryhub-its.com/workspace/ws/doc',
      nonce: 'n1',
      cspSource: 'https://example',
    });
    expect(html).toContain('Roadmap');
    expect(html).toContain('https://affine.masteryhub-its.com/workspace/ws/doc');
    expect(html).toContain('Open in browser');
    expect(html).toContain('id="open-external"');
    expect(html).toContain('do not have access');
    expect(html).not.toContain('<iframe');
  });

  it('escapes a hostile title', () => {
    const html = renderDocumentCardHtml({
      title: '<script>alert(1)</script>',
      url: 'https://affine.example/workspace/a/b',
      nonce: 'n1',
      cspSource: 'https://example',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
