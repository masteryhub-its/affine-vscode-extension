import { formatAffineError } from '../errors/format-error';
import { DocumentPanelReplyType } from '../utils/enums/document-panel-reply-type.enum';
import { normalizeBlockText } from '../yjs/encode-block-edit';
import type { EditRequest } from './edit-message';

/** The two writes the page preview can ask for. The Affine client implements this. */
export interface PageEditor {
  editBlockText(workspaceId: string, docId: string, blockId: string, text: string): Promise<boolean>;
  appendParagraph(workspaceId: string, docId: string, text: string): Promise<string>;
}

export interface SavedReply {
  readonly type: DocumentPanelReplyType.SAVED;
  readonly blockId: string;
  readonly text: string;
}

export interface AppendedReply {
  readonly type: DocumentPanelReplyType.APPENDED;
  readonly blockId: string;
  readonly text: string;
}

export interface FailedReply {
  readonly type: DocumentPanelReplyType.FAILED;
  readonly blockId?: string;
  readonly message: string;
}

export type EditReply = SavedReply | AppendedReply | FailedReply;

/** Performs one edit and always returns what to tell the page; it never throws. */
export async function runEdit(editor: PageEditor, workspaceId: string, docId: string, request: EditRequest): Promise<EditReply> {
  try {
    const text = normalizeBlockText(request.text);
    if (request.kind === 'edit') {
      await editor.editBlockText(workspaceId, docId, request.blockId, request.text);
      return { type: DocumentPanelReplyType.SAVED, blockId: request.blockId, text };
    }
    const blockId = await editor.appendParagraph(workspaceId, docId, request.text);
    return { type: DocumentPanelReplyType.APPENDED, blockId, text };
  } catch (error: unknown) {
    const message = formatAffineError(error);
    return request.kind === 'edit' ? { type: DocumentPanelReplyType.FAILED, blockId: request.blockId, message } : { type: DocumentPanelReplyType.FAILED, message };
  }
}
