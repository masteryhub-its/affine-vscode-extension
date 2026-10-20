import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import type { PageBlock } from '../yjs/parse-page-doc';

export interface OutlineItem {
  readonly anchor: string;
  readonly level: number;
  readonly text: string;
}

const MAX_OUTLINE_LEVEL = 3;

/** The id the renderer puts on the heading at this block position, and the outline links to. */
export function headingAnchorId(blockIndex: number): string {
  return `h-${blockIndex}`;
}

/** The headings of a page (levels 1 to 3) for the "On this page" panel. */
export function extractOutline(blocks: readonly PageBlock[]): readonly OutlineItem[] {
  const items: OutlineItem[] = [];
  blocks.forEach((block, index) => {
    if (block.kind !== PageBlockKind.HEADING || block.level > MAX_OUTLINE_LEVEL) {
      return;
    }
    const text = block.inlines
      .map((span) => span.text)
      .join('')
      .trim();
    if (text.length > 0) {
      items.push({ anchor: headingAnchorId(index), level: block.level, text });
    }
  });
  return items;
}
