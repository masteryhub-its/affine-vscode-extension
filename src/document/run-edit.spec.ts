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
    appendParagraph: (workspaceId, docId, text) => {
      calls.push(`append ${workspaceId}/${docId}: ${text}`);
      return Promise.resolve('new-block-id');
    },
    ...overrides,
  };
}

describe('runEdit', () => {
  it('saves an edit and replies with the block and the text that is now saved', async () => {
    const page = editor();
    const reply = await runEdit(page, 'w1', 'd1', { kind: 'edit', blockId: 'b1', text: 'New' });
    expect(reply).toEqual({ type: DocumentPanelReplyType.SAVED, blockId: 'b1', text: 'New' });
    expect(page.calls).toEqual(['edit w1/d1/b1: New']);
  });

  it('replies with the one-line text, matching what is stored', async () => {
    const reply = await runEdit(editor(), 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'one\ntwo' });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.SAVED, text: 'one two' });
  });

  it('still says saved when nothing needed to change', async () => {
    const page = editor({ editBlockText: () => Promise.resolve(false) });
    expect(await runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'same' })).toMatchObject({ type: DocumentPanelReplyType.SAVED });
  });

  it('adds a paragraph and replies with the new block id', async () => {
    const page = editor();
    const reply = await runEdit(page, 'w1', 'd1', { kind: 'append', text: 'More' });
    expect(reply).toEqual({ type: DocumentPanelReplyType.APPENDED, blockId: 'new-block-id', text: 'More' });
    expect(page.calls).toEqual(['append w1/d1: More']);
  });

  it('replies with the reason when an edit fails, and names the block', async () => {
    const page = editor({ editBlockText: () => Promise.reject(new AffineError('Failed to save your edit: socket closed', AffineErrorCode.SYNC_ERROR)) });
    const reply = await runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b1', text: 'x' });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.FAILED, blockId: 'b1' });
    expect((reply as { message: string }).message).toContain('socket closed');
  });

  it('replies with the reason when adding text fails, with no block id', async () => {
    const page = editor({ appendParagraph: () => Promise.reject(new Error('offline')) });
    const reply = await runEdit(page, 'w', 'd', { kind: 'append', text: 'x' });
    expect(reply).toMatchObject({ type: DocumentPanelReplyType.FAILED });
    expect('blockId' in reply).toBe(false);
  });

  it('never throws', async () => {
    const page = editor({
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error rejection is exactly what this test covers
      editBlockText: () => Promise.reject(undefined),
    });
    await expect(runEdit(page, 'w', 'd', { kind: 'edit', blockId: 'b', text: 'x' })).resolves.toMatchObject({ type: DocumentPanelReplyType.FAILED });
  });
});
