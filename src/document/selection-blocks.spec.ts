import { selectionBlocks } from './selection-blocks';

const base = { relativePath: 'src/app/login.ts', startLine: 12, endLine: 14, languageId: 'typescript', text: 'const a = 1;\nconst b = 2;' };

describe('selectionBlocks', () => {
  it('says where the code is from, then holds the code with its lines', () => {
    const [from, code] = selectionBlocks(base);
    expect(from).toEqual({
      kind: 'paragraph',
      segments: [{ text: 'From ' }, { text: 'src/app/login.ts', attributes: { code: true } }, { text: ', lines 12–14' }],
    });
    expect(code).toEqual({ kind: 'code', language: 'typescript', text: 'const a = 1;\nconst b = 2;' });
  });

  it('says "line" for a single line', () => {
    const [from] = selectionBlocks({ ...base, endLine: 12 });
    expect(from).toMatchObject({ segments: [{ text: 'From ' }, expect.anything(), { text: ', line 12' }] });
  });

  it('uses no language for plain text', () => {
    expect(selectionBlocks({ ...base, languageId: 'plaintext' })[1]).toMatchObject({ language: '' });
  });

  it('drops blank lines at the edges but keeps indentation', () => {
    expect(selectionBlocks({ ...base, text: '\n\n  indented\n    more\n\n' })[1]).toMatchObject({ text: '  indented\n    more' });
  });

  it('never includes an absolute path', () => {
    const [from] = selectionBlocks({ ...base, relativePath: '/home/someone/app/x.ts' });
    expect(JSON.stringify(from)).not.toContain('/home/someone');
    expect(JSON.stringify(from)).toContain('x.ts');
  });

  it('keeps the code short enough to save', () => {
    const [, code] = selectionBlocks({ ...base, text: 'a'.repeat(50_000) });
    expect(code).toMatchObject({ kind: 'code' });
    expect((code as { text: string }).text.length).toBeLessThanOrEqual(20_000);
  });

  it('has only the location when there is no code', () => {
    expect(selectionBlocks({ ...base, text: '  \n ' })).toHaveLength(1);
  });
});
