import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes markup characters so titles cannot inject HTML', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')"> & "`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp; &quot;');
  });
});
