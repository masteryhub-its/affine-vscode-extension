import { parseInlineMarkdown } from './inline-markdown';

describe('parseInlineMarkdown', () => {
  it('leaves plain text alone', () => {
    expect(parseInlineMarkdown('just text')).toEqual([{ text: 'just text' }]);
    expect(parseInlineMarkdown('')).toEqual([]);
  });

  it.each([
    ['**bold**', { bold: true }],
    ['__bold__', { bold: true }],
    ['*italic*', { italic: true }],
    ['_italic_', { italic: true }],
    ['~~gone~~', { strike: true }],
    ['`code`', { code: true }],
  ])('turns %s into formatted text without the marks', (source, attributes) => {
    const text = source.replace(/[*_~`]/gu, '');
    expect(parseInlineMarkdown(source)).toEqual([{ text, attributes }]);
  });

  it('turns [text](url) into a link', () => {
    expect(parseInlineMarkdown('see [the docs](https://example.com/a?b=1) now')).toEqual([{ text: 'see ' }, { text: 'the docs', attributes: { link: 'https://example.com/a?b=1' } }, { text: ' now' }]);
  });

  it('only links to web addresses and mail addresses', () => {
    expect(parseInlineMarkdown('[x](javascript:alert(1))')).toEqual([{ text: '[x](javascript:alert(1))' }]);
    expect(parseInlineMarkdown('[mail](mailto:a@b.co)')).toEqual([{ text: 'mail', attributes: { link: 'mailto:a@b.co' } }]);
  });

  it('mixes marks in one line', () => {
    expect(parseInlineMarkdown('a **b** c `d` e')).toEqual([{ text: 'a ' }, { text: 'b', attributes: { bold: true } }, { text: ' c ' }, { text: 'd', attributes: { code: true } }, { text: ' e' }]);
  });

  it('keeps code literal, so marks inside it are not formatting', () => {
    expect(parseInlineMarkdown('`a **b** c`')).toEqual([{ text: 'a **b** c', attributes: { code: true } }]);
  });

  it('leaves unmatched or empty marks as typed', () => {
    expect(parseInlineMarkdown('2 * 3 * 4')).toEqual([{ text: '2 * 3 * 4' }]);
    expect(parseInlineMarkdown('a ** b')).toEqual([{ text: 'a ** b' }]);
    expect(parseInlineMarkdown('snake_case_name')).toEqual([{ text: 'snake_case_name' }]);
    expect(parseInlineMarkdown('****')).toEqual([{ text: '****' }]);
  });

  it('allows italic inside bold', () => {
    expect(parseInlineMarkdown('**a *b* c**')).toEqual([
      { text: 'a ', attributes: { bold: true } },
      { text: 'b', attributes: { bold: true, italic: true } },
      { text: ' c', attributes: { bold: true } },
    ]);
  });

  it('never loses or adds characters other than the marks', () => {
    const source = 'x **y** [z](https://a.co) `w` ~~v~~ *u*';
    const plain = parseInlineMarkdown(source)
      .map((segment) => segment.text)
      .join('');
    expect(plain).toBe('x y z w v u');
  });
});
