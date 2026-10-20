import { parseDocumentPanelMessageType } from '../utils/document-panel-message-type';
import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';

export interface CopyAction {
  readonly text: string;
  readonly confirmation: string;
}

const MAX_COPY_LENGTH = 200_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What a copy button in the page preview asks for, checked, or undefined when the message is not a usable copy request. */
export function copyActionFromMessage(message: unknown, pageUrl: string): CopyAction | undefined {
  if (!isRecord(message)) {
    return undefined;
  }
  const type = parseDocumentPanelMessageType(message['type']);
  if (type === DocumentPanelMessageType.COPY_LINK) {
    return { text: pageUrl, confirmation: 'Page link copied' };
  }
  if (type === DocumentPanelMessageType.COPY_TEXT) {
    const text = message['text'];
    return typeof text === 'string' && text.length > 0 && text.length <= MAX_COPY_LENGTH ? { text, confirmation: 'Code copied' } : undefined;
  }
  return undefined;
}
