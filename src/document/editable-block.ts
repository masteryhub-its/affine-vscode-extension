import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import type { PageBlock, PageInlineSpan } from '../yjs/parse-page-doc';

export interface EditableText {
  readonly blockId: string;
  readonly text: string;
}

function isPlain(span: PageInlineSpan): boolean {
  return (
    !span.bold &&
    !span.italic &&
    !span.strike &&
    !span.underline &&
    !span.code &&
    span.link === undefined &&
    span.mentionUserId === undefined &&
    span.linkedDocId === undefined &&
    span.color === undefined &&
    span.background === undefined
  );
}

/**
 * The id and text of a block that can be edited in place: a paragraph, heading, quote or list item whose text has no
 * formatting, links or mentions. Anything richer returns undefined and is edited in AFFiNE, so nothing is flattened.
 */
export function editableTextOf(block: PageBlock): EditableText | undefined {
  if (block.kind !== PageBlockKind.PARAGRAPH && block.kind !== PageBlockKind.HEADING && block.kind !== PageBlockKind.QUOTE && block.kind !== PageBlockKind.LIST) {
    return undefined;
  }
  if (block.blockId === undefined || !block.inlines.every(isPlain)) {
    return undefined;
  }
  return { blockId: block.blockId, text: block.inlines.map((span) => span.text).join('') };
}
