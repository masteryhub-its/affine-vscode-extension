import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import type { PageBlock, PageInlineSpan } from '../yjs/parse-page-doc';
import { extractOutline, headingAnchorId } from './outline';

function span(text: string): PageInlineSpan {
  return { text, bold: false, italic: false, strike: false, underline: false, code: false, link: undefined, mentionUserId: undefined, linkedDocId: undefined };
}
function heading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string): PageBlock {
  return { kind: PageBlockKind.HEADING, level, inlines: [span(text)] };
}
const paragraph: PageBlock = { kind: PageBlockKind.PARAGRAPH, inlines: [span('body')] };

describe('extractOutline', () => {
  it('lists headings in order with their level and a stable anchor', () => {
    const blocks = [heading(2, 'Goals'), paragraph, heading(3, 'Versioning'), heading(2, 'Rollout')];
    expect(extractOutline(blocks)).toEqual([
      { anchor: 'h-0', level: 2, text: 'Goals' },
      { anchor: 'h-2', level: 3, text: 'Versioning' },
      { anchor: 'h-3', level: 2, text: 'Rollout' },
    ]);
  });

  it('skips headings without text and headings deeper than level 3', () => {
    expect(extractOutline([heading(2, '  '), heading(4, 'Deep'), heading(1, 'Title')])).toEqual([{ anchor: 'h-2', level: 1, text: 'Title' }]);
  });

  it('joins styled text runs', () => {
    const block: PageBlock = { kind: PageBlockKind.HEADING, level: 2, inlines: [span('API '), { ...span('Handbook'), bold: true }] };
    expect(extractOutline([block])[0]?.text).toBe('API Handbook');
  });

  it('returns nothing for a page without headings', () => {
    expect(extractOutline([paragraph])).toEqual([]);
  });

  it('builds the same anchor the renderer puts on the heading', () => {
    expect(headingAnchorId(7)).toBe('h-7');
  });
});
