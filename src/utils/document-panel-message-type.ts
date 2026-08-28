import { DocumentPanelMessageType } from './enums/document-panel-message-type.enum';

const DOCUMENT_PANEL_MESSAGE_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(DocumentPanelMessageType));

export function parseDocumentPanelMessageType(value: unknown): DocumentPanelMessageType | undefined {
  if (typeof value !== 'string' || !DOCUMENT_PANEL_MESSAGE_TYPE_VALUES.has(value)) {
    return undefined;
  }
  return value as DocumentPanelMessageType;
}
