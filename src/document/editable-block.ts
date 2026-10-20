import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import type { PageBlock, PageInlineSpan, TablePageBlock } from '../yjs/parse-page-doc';

export interface EditableText {
  readonly blockId: string;
  readonly text: string;
  /** The block keeps its line breaks (code), instead of holding one line. */
  readonly multiline?: boolean;
}

/** Bold, links, colours and the like show the stored text as it is; a mention or linked page shows a stand-in. */
function showsStoredText(span: PageInlineSpan): boolean {
  return span.mentionUserId === undefined && span.linkedDocId === undefined;
}

/**
 * The id and text of a block that can be edited in place: a paragraph, heading, quote or list item. Formatting and links
 * on the text that stays are kept. A block with a mention or linked page returns undefined and is edited in AFFiNE,
 * because the text shown for those is not the text stored.
 */
export function editableTextOf(block: PageBlock): EditableText | undefined {
  if (block.kind === PageBlockKind.CODE) {
    return block.blockId === undefined ? undefined : { blockId: block.blockId, text: block.text, multiline: true };
  }
  if (block.kind !== PageBlockKind.PARAGRAPH && block.kind !== PageBlockKind.HEADING && block.kind !== PageBlockKind.QUOTE && block.kind !== PageBlockKind.LIST) {
    return undefined;
  }
  if (block.blockId === undefined || !block.inlines.every(showsStoredText)) {
    return undefined;
  }
  return { blockId: block.blockId, text: block.inlines.map((span) => span.text).join('') };
}

/** The editable text of each table cell, in the shape of the table's rows; undefined for a cell that cannot be edited. */
export function editableCellsOf(table: TablePageBlock): readonly (readonly (EditableText | undefined)[])[] {
  return table.rows.map((row, rowIndex) =>
    row.map((text, columnIndex) => {
      const blockId = table.cellIds?.[rowIndex]?.[columnIndex];
      return blockId === undefined ? undefined : { blockId, text };
    })
  );
}
