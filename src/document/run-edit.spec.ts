import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { DocumentPanelReplyType } from '../utils/enums/document-panel-reply-type.enum';
import { runEdit, type PageEditor } from './run-edit';

function editor(overrides: Partial<PageEditor> = {}): PageEditor & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    editBlockText: (workspaceId, docId, blockId, text) => {
      calls.push(`edit ${workspaceId}/${docId}/${blockId}: ${text}`);
      return Promise.resolve(true);
    },
    appendBlock: (workspaceId, docId, spec) => {
      calls.push(`append ${workspaceId}/${docId}: ${spec.kind}`);
      return Promise.resolve('new-block-id');
    },
    ...overrides,
  };
}

describe('runEdit', () => {
  it('keeps the line breaks of a code block in the reply', async () => {
    const reply = await runEdit(editor(), 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'one\r\ntwo', multiline: true });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.SAVED, text: 'one\ntwo' });
  });

  it('saves an edit and replies with the block and the text that is now saved', async () => {
    const page = editor();
    const reply = await runEdit(page, 'w1', 'd1', { kind: 'edit', blockId: 'b1', text: 'New', multiline: false });
    expect(reply).toEqual({ type: DocumentPanelReplyType.SAVED, blockId: 'b1', text: 'New' });
    expect(page.calls).toEqual(['edit w1/d1/b1: New']);
  });

  it('replies with the one-line text, matching what is stored', async () => {
    const reply = await runEdit(editor(), 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'one\ntwo', multiline: false });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.SAVED, text: 'one two' });
  });

  it('still says saved when nothing needed to change', async () => {
    const page = editor({ editBlockText: () => Promise.resolve(false) });
    expect(await runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'same', multiline: false })).toMatchObject({ type: DocumentPanelReplyType.SAVED });
  });

  it.each([
    ['## Heading', 'heading'],
    ['- item', 'list'],
    ['> quote', 'quote'],
    ['---', 'divider'],
    ['```ts x', 'code'],
  ])('adds %s as the right kind of block and asks for the page to be drawn again', async (text, kind) => {
    const page = editor();
    const reply = await runEdit(page, 'w', 'd', { kind: 'append', text });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.APPENDED, reload: true });
    expect(page.calls).toEqual([`append w/d: ${kind}`]);
  });

  it('asks for the page to be drawn again when a paragraph has bold or a link', async () => {
    expect(await runEdit(editor(), 'w', 'd', { kind: 'append', text: 'a **b**' })).toMatchObject({ reload: true });
  });

  it('adds a paragraph and replies with the new block id', async () => {
    const page = editor();
    const reply = await runEdit(page, 'w1', 'd1', { kind: 'append', text: 'More' });
    expect(reply).toEqual({ type: DocumentPanelReplyType.APPENDED, blockId: 'new-block-id', text: 'More', reload: false });
    expect(page.calls).toEqual(['append w1/d1: paragraph']);
  });

  it('replies with the reason when an edit fails, and names the block', async () => {
    const page = editor({ editBlockText: () => Promise.reject(new AffineError('Failed to save your edit: socket closed', AffineErrorCode.SYNC_ERROR)) });
    const reply = await runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'x', multiline: false });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.FAILED, blockId: 'b1' });
    expect((reply as { message: string }).message).toContain('socket closed');
  });

  it('replies with the reason when adding text fails, with no block id', async () => {
    const page = editor({ appendBlock: () => Promise.reject(new Error('offline')) });
    const reply = await runEdit(page, 'w', 'd', { kind: 'append', text: 'x' });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.FAILED });
    expect('blockId' in reply).toBe(false);
  });

  it('never throws', async () => {
    const page = editor({
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error rejection is exactly what this test covers
      editBlockText: () => Promise.reject(undefined),
    });
    await expect(runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b', text: 'x', multiline: false })).resolves.toMatchObject({ type: DocumentPanelReplyType.FAILED });
  });
});
