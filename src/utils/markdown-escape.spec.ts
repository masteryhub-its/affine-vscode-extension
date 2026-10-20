import { escapeMarkdown } from './markdown-escape';

describe('escapeMarkdown', () => {
  it('leaves plain text alone', () => {
    expect(escapeMarkdown('Fix login timeout')).toBe('Fix login timeout');
  });

  it('escapes characters that would start formatting, links or HTML', () => {
    expect(escapeMarkdown('*bold* _it_ `code` [x](https://e.com) <b>')).toBe('\\*bold\\* \\_it\\_ \\`code\\` \\[x\\]\\(https://e\\.com\\) \\<b\\>');
  });

  it('escapes a backslash so it cannot undo the escaping', () => {
    expect(escapeMarkdown('a\\*b')).toBe('a\\\\\\*b');
  });

  it('keeps an issue key readable', () => {
    expect(escapeMarkdown('ENG-12')).toBe('ENG\\-12');
  });
});
