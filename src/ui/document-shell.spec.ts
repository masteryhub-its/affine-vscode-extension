import { renderDocumentShell } from './document-shell';

describe('renderDocumentShell', () => {
  const html = renderDocumentShell({
    title: 'Standup <x>',
    nonce: 'n0nce',
    cspSource: 'vscode-webview://abc',
    imageSources: ['https://affine.example', 'data:'],
    body: '<p>hello</p>',
    script: "console.log('hi')",
    extraCss: '.extra { color: red; }',
  });

  it('escapes the title', () => {
    expect(html).toContain('<title>Standup &lt;x&gt;</title>');
  });

  it('forbids everything except the nonce script, the webview styles and the listed image sources', () => {
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-n0nce'");
    expect(html).toContain('style-src vscode-webview://abc');
    expect(html).toContain('img-src vscode-webview://abc https://affine.example data:;');
    expect(html).toContain("base-uri 'none'");
    expect(html).toContain("form-action 'none'");
  });

  it('allows only the webview itself for images when no other source is given', () => {
    expect(renderDocumentShell({ title: 't', nonce: 'n', cspSource: 'c', body: '' })).toContain('img-src c;');
  });

  it('puts the body, the nonce-tagged script and the extra styles in the page', () => {
    expect(html).toContain('<p>hello</p>');
    expect(html).toContain('<script nonce="n0nce">');
    expect(html).toContain('.extra { color: red; }');
  });

  it('omits the script tag when there is no script', () => {
    expect(renderDocumentShell({ title: 't', nonce: 'n', cspSource: 'c', body: '' })).not.toContain('<script');
  });

  it('includes the shared stylesheet', () => {
    expect(html).toContain('var(--vscode-foreground)');
  });
});
