import { formatAffineError } from '../errors/format-error';
import { DocumentPanelReplyType } from '../utils/enums/document-panel-reply-type.enum';
import { normalizeBlockText } from '../yjs/encode-block-edit';
import type { EditRequest } from './edit-message';
import { parseNewBlock, type NewBlockSpec } from './new-block';

/** The two writes the page preview can ask for. The Affine client implements this. */
export interface PageEditor {
  editBlockText(workspaceId: string, docId: string, blockId: string, text: string): Promise<boolean>;
  appendBlock(workspaceId: string, docId: string, spec: NewBlockSpec): Promise<string>;
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
  /** The new block is not a plain paragraph (a heading, list, formatted text...), so the page must be drawn again to show it. */
  readonly reload: boolean;
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
    const text = normalizeBlockText(request.text, request.kind === 'edit' && request.multiline);
    if (request.kind === 'edit') {
      await editor.editBlockText(workspaceId, docId, request.blockId, request.text);
      return { type: DocumentPanelReplyType.SAVED, blockId: request.blockId, text };
    }
    const spec = parseNewBlock(normalizeBlockText(request.text));
    const blockId = await editor.appendBlock(workspaceId, docId, spec);
    const plain = spec.kind === 'paragraph' && spec.segments.every((segment) => segment.attributes === undefined);
    return { type: DocumentPanelReplyType.APPENDED, blockId, text: plain ? spec.segments.map((segment) => segment.text).join('') : text, reload: !plain };
  } catch (error: unknown) {
    const message = formatAffineError(error);
    return request.kind === 'edit' ? { type: DocumentPanelReplyType.FAILED, blockId: request.blockId, message } : { type: DocumentPanelReplyType.FAILED, message };
  }
}
