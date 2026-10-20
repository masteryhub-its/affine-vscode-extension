import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { copyActionFromMessage } from './copy-message';

const URL = 'https://affine.example/workspace/ws/doc';

describe('copyActionFromMessage', () => {
  it('copies the page link', () => {
    expect(copyActionFromMessage({ type: DocumentPanelMessageType.COPY_LINK }, URL)).toEqual({ text: URL, confirmation: 'Page link copied' });
  });

  it('copies the text of a code block', () => {
    expect(copyActionFromMessage({ type: DocumentPanelMessageType.COPY_TEXT, text: 'const a = 1;' }, URL)).toEqual({ text: 'const a = 1;', confirmation: 'Code copied' });
  });

  it.each([{ type: DocumentPanelMessageType.COPY_TEXT }, { type: DocumentPanelMessageType.COPY_TEXT, text: '' }, { type: DocumentPanelMessageType.COPY_TEXT, text: 5 }])(
    'ignores an unusable code copy %j',
    (message) => {
      expect(copyActionFromMessage(message, URL)).toBeUndefined();
    }
  );

  it('ignores a code block that is implausibly large', () => {
    expect(copyActionFromMessage({ type: DocumentPanelMessageType.COPY_TEXT, text: 'x'.repeat(300_000) }, URL)).toBeUndefined();
  });

  it.each([null, undefined, 'copyLink', 5, [], {}, { type: 'other' }])('ignores %j', (message) => {
    expect(copyActionFromMessage(message, URL)).toBeUndefined();
  });
});
