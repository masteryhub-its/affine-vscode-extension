import { parseNewBlock } from './new-block';

const text = (value: string): readonly { text: string }[] => [{ text: value }];

describe('parseNewBlock', () => {
  it('is a paragraph by default, with its formatting marks applied', () => {
    expect(parseNewBlock('Hello')).toEqual({ kind: 'paragraph', segments: text('Hello') });
    expect(parseNewBlock('a **b**')).toEqual({ kind: 'paragraph', segments: [{ text: 'a ' }, { text: 'b', attributes: { bold: true } }] });
  });

  it.each([
    ['# One', 1],
    ['## Two', 2],
    ['### Three', 3],
    ['###### Six', 6],
  ])('reads %s as a heading', (line, level) => {
    expect(parseNewBlock(line)).toMatchObject({ kind: 'heading', level });
  });

  it('needs a space after the marks, so # alone or #tag stays text', () => {
    expect(parseNewBlock('#tag')).toMatchObject({ kind: 'paragraph' });
    expect(parseNewBlock('####### seven')).toMatchObject({ kind: 'paragraph' });
  });

  it.each([
    ['- item', 'bulleted'],
    ['* item', 'bulleted'],
    ['• item', 'bulleted'],
    ['1. item', 'numbered'],
    ['12) item', 'numbered'],
  ])('reads %s as a list item', (line, list) => {
    expect(parseNewBlock(line)).toEqual({ kind: 'list', list, checked: false, segments: text('item') });
  });

  it.each([
    ['[] task', false],
    ['[ ] task', false],
    ['- [ ] task', false],
    ['[x] task', true],
    ['- [X] task', true],
  ])('reads %s as a to-do', (line, checked) => {
    expect(parseNewBlock(line)).toEqual({ kind: 'list', list: 'todo', checked, segments: text('task') });
  });

  it('reads > as a quote', () => {
    expect(parseNewBlock('> wise words')).toEqual({ kind: 'quote', segments: text('wise words') });
  });

  it('reads --- as a divider', () => {
    expect(parseNewBlock('---')).toEqual({ kind: 'divider' });
    expect(parseNewBlock('***')).toEqual({ kind: 'divider' });
    expect(parseNewBlock('--')).toMatchObject({ kind: 'paragraph' });
  });

  it('reads a fenced line as code, with an optional language', () => {
    expect(parseNewBlock('```ts const x = 1;')).toEqual({ kind: 'code', language: 'ts', text: 'const x = 1;' });
    expect(parseNewBlock('```')).toEqual({ kind: 'code', language: '', text: '' });
  });

  it('keeps list text that has no content as an empty item', () => {
    expect(parseNewBlock('- ')).toMatchObject({ kind: 'list', segments: [] });
  });

  it('trims the edges but keeps the text', () => {
    expect(parseNewBlock('   spaced   ')).toEqual({ kind: 'paragraph', segments: text('spaced') });
  });
});
