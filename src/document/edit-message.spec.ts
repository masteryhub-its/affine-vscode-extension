import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { parseEditMessage } from './edit-message';

describe('parseEditMessage', () => {
  it('reads a request to change one block', () => {
    expect(parseEditMessage({ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'abc-123', text: 'New text' })).toEqual({ kind: 'edit', blockId: 'abc-123', text: 'New text' });
  });

  it('reads a request to add a paragraph', () => {
    expect(parseEditMessage({ type: DocumentPanelMessageType.APPEND_PARAGRAPH, text: 'More' })).toEqual({ kind: 'append', text: 'More' });
  });

  it('allows an empty string when changing a block, so a block can be cleared', () => {
    expect(parseEditMessage({ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'a', text: '' })).toEqual({ kind: 'edit', blockId: 'a', text: '' });
  });

  it.each([
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, text: 'x' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: '', text: 'x' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'a' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 5, text: 'x' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'has space', text: 'x' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'x'.repeat(200), text: 'x' }],
    [{ type: DocumentPanelMessageType.EDIT_BLOCK, blockId: 'a', text: 'x'.repeat(30_000) }],
    [{ type: DocumentPanelMessageType.APPEND_PARAGRAPH }],
    [{ type: DocumentPanelMessageType.APPEND_PARAGRAPH, text: '' }],
    [{ type: DocumentPanelMessageType.APPEND_PARAGRAPH, text: 7 }],
    [{ type: 'other', text: 'x' }],
    [null],
    [undefined],
    ['editBlock'],
    [[]],
  ])('ignores a message that is not a usable edit: %j', (message) => {
    expect(parseEditMessage(message)).toBeUndefined();
  });
});
