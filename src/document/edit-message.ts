import { parseDocumentPanelMessageType } from '../utils/document-panel-message-type';
import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';

export interface EditBlockRequest {
  readonly kind: 'edit';
  readonly blockId: string;
  readonly text: string;
}

export interface AppendParagraphRequest {
  readonly kind: 'append';
  readonly text: string;
}

export type EditRequest = EditBlockRequest | AppendParagraphRequest;

const MAX_TEXT_LENGTH = 20_000;
const BLOCK_ID = /^[A-Za-z0-9_:-]{1,100}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What an edit message from the page asks for, checked, or undefined when it is not a usable request. */
export function parseEditMessage(message: unknown): EditRequest | undefined {
  if (!isRecord(message)) {
    return undefined;
  }
  const type = parseDocumentPanelMessageType(message['type']);
  const text = message['text'];
  if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
    return undefined;
  }
  if (type === DocumentPanelMessageType.EDIT_BLOCK) {
    const blockId = message['blockId'];
    return typeof blockId === 'string' && BLOCK_ID.test(blockId) ? { kind: 'edit', blockId, text } : undefined;
  }
  if (type === DocumentPanelMessageType.APPEND_PARAGRAPH) {
    return text.length > 0 ? { kind: 'append', text } : undefined;
  }
  return undefined;
}
