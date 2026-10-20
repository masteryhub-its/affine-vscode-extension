import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { PageBlock } from '../yjs/parse-page-doc';

/**
 * The number to show for each block: 1, 2, 3 for consecutive numbered items at one nesting level, and undefined for
 * everything else. Each level counts on its own and starts again whenever something else interrupts it.
 */
export function numberListItems(blocks: readonly PageBlock[]): readonly (number | undefined)[] {
  const counters: number[] = [];
  return blocks.map((block) => {
    if (block.kind !== PageBlockKind.LIST) {
      counters.length = 0;
      return undefined;
    }
    counters.length = block.depth + 1;
    if (block.list !== PageListKind.NUMBERED) {
      counters[block.depth] = 0;
      return undefined;
    }
    const next = (counters[block.depth] ?? 0) + 1;
    counters[block.depth] = next;
    return next;
  });
}
