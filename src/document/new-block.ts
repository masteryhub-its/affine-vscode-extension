import { parseInlineMarkdown, type InlineSegment } from '../yjs/inline-markdown';

export type NewListKind = 'bulleted' | 'numbered' | 'todo';

export type NewBlockSpec =
  | { readonly kind: 'paragraph' | 'quote'; readonly segments: readonly InlineSegment[] }
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly segments: readonly InlineSegment[] }
  | { readonly kind: 'list'; readonly list: NewListKind; readonly checked: boolean; readonly segments: readonly InlineSegment[] }
  | { readonly kind: 'code'; readonly language: string; readonly text: string }
  | { readonly kind: 'divider' };

const HEADING = /^(#{1,6})\s+(.*)$/u;
const TODO = /^(?:[-*•]\s+)?\[([ xX]?)\]\s+(.*)$/u;
const BULLET = /^[-*•]\s+(.*)$/u;
const NUMBERED = /^\d{1,4}[.)]\s+(.*)$/u;
const QUOTE = /^>\s?(.*)$/u;
const DIVIDER = /^(?:-{3,}|\*{3,}|_{3,})$/u;
const FENCE = /^```\s*([A-Za-z0-9_+#.-]*)\s*(.*)$/u;

/**
 * What a line typed on the empty line at the end of a page becomes, using the same shortcuts as AFFiNE and Markdown:
 * "# " for a heading, "- " for a bullet, "1. " for a numbered item, "[] " for a to-do, "> " for a quote, "---" for a
 * divider and a fence for code. Anything else is a paragraph. Bold, italic, strikethrough, code and links are applied.
 */
export function parseNewBlock(line: string): NewBlockSpec {
  const value = line.trim();
  const heading = HEADING.exec(value);
  if (heading !== null) {
    return { kind: 'heading', level: (heading[1] ?? '#').length as 1 | 2 | 3 | 4 | 5 | 6, segments: parseInlineMarkdown(heading[2] ?? '') };
  }
  if (DIVIDER.test(value)) {
    return { kind: 'divider' };
  }
  const fence = FENCE.exec(value);
  if (fence !== null) {
    return { kind: 'code', language: fence[1] ?? '', text: fence[2] ?? '' };
  }
  const todo = TODO.exec(value);
  if (todo !== null) {
    return { kind: 'list', list: 'todo', checked: (todo[1] ?? '').toLowerCase() === 'x', segments: parseInlineMarkdown(todo[2] ?? '') };
  }
  const bullet = BULLET.exec(value) ?? (/^[-*•]$/u.test(value) ? ['', ''] : null);
  if (bullet !== null) {
    return { kind: 'list', list: 'bulleted', checked: false, segments: parseInlineMarkdown(bullet[1] ?? '') };
  }
  const numbered = NUMBERED.exec(value);
  if (numbered !== null) {
    return { kind: 'list', list: 'numbered', checked: false, segments: parseInlineMarkdown(numbered[1] ?? '') };
  }
  const quote = QUOTE.exec(value);
  if (quote !== null) {
    return { kind: 'quote', segments: parseInlineMarkdown(quote[1] ?? '') };
  }
  return { kind: 'paragraph', segments: parseInlineMarkdown(value) };
}
