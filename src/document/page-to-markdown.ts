import type { MentionPeople } from '../client/affine.types';
import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { PageBlock, PageInlineSpan, ParsedPage } from '../yjs/parse-page-doc';
import { numberListItems } from './list-numbering';

export interface MarkdownOptions {
  readonly people?: MentionPeople;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]])/gu, '\\$1');
}

function inlineMarkdown(span: PageInlineSpan, people: MentionPeople): string {
  if (span.mentionUserId !== undefined) {
    const name = people[span.mentionUserId]?.name.trim();
    return name === undefined || name.length === 0 ? escapeMarkdown(span.text) : `@${escapeMarkdown(name)}`;
  }
  if (span.code) {
    const fence = span.text.includes('`') ? '``' : '`';
    return `${fence}${span.text}${fence}`;
  }
  const lead = /^\s*/u.exec(span.text)?.[0] ?? '';
  const trail = span.text.trim().length === 0 ? '' : (/\s*$/u.exec(span.text)?.[0] ?? '');
  let body = escapeMarkdown(span.text.trim());
  if (body.length === 0) {
    return span.text;
  }
  if (span.bold && span.italic) {
    body = `***${body}***`;
  } else if (span.bold) {
    body = `**${body}**`;
  } else if (span.italic) {
    body = `*${body}*`;
  }
  if (span.strike) {
    body = `~~${body}~~`;
  }
  if (span.link !== undefined) {
    body = `[${body}](${span.link})`;
  }
  return `${lead}${body}${trail}`;
}

function inlines(spans: readonly PageInlineSpan[], people: MentionPeople): string {
  return spans.map((span) => inlineMarkdown(span, people)).join('');
}

function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/gu) ?? []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function tableCell(cell: string): string {
  return escapeMarkdown(cell).replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ');
}

function table(rows: readonly (readonly string[])[]): string {
  const [head, ...body] = rows;
  if (head === undefined) {
    return '';
  }
  const line = (cells: readonly string[]): string => `| ${cells.map(tableCell).join(' | ')} |`;
  return [line(head), `| ${head.map(() => '---').join(' | ')} |`, ...body.map(line)].join('\n');
}

function listLine(block: PageBlock & { readonly kind: PageBlockKind.LIST }, number: number | undefined, people: MentionPeople): string {
  const indent = '  '.repeat(block.depth);
  const text = inlines(block.inlines, people);
  if (block.list === PageListKind.NUMBERED) {
    return `${indent}${number ?? 1}. ${text}`;
  }
  if (block.list === PageListKind.TODO) {
    return `${indent}- [${block.checked ? 'x' : ' '}] ${text}`;
  }
  return `${indent}- ${text}`;
}

/** A page as Markdown text, for reading, copying or diffing outside AFFiNE. */
export function pageToMarkdown(page: ParsedPage, options: MarkdownOptions = {}): string {
  const people = options.people ?? {};
  const numbers = numberListItems(page.blocks);
  const chunks: string[] = [];
  if (page.title.length > 0) {
    chunks.push(`# ${escapeMarkdown(page.title)}`);
  }
  if (page.edgelessOnly) {
    chunks.push('_This page is a whiteboard. Open it in AFFiNE to see it._');
    return `${chunks.join('\n\n')}\n`;
  }
  let openList: string[] | undefined;
  const closeList = (): void => {
    if (openList !== undefined) {
      chunks.push(openList.join('\n'));
      openList = undefined;
    }
  };
  page.blocks.forEach((block, index) => {
    if (block.kind === PageBlockKind.LIST) {
      const line = listLine(block, numbers[index], people);
      const previous = page.blocks[index - 1];
      const sameRun = previous?.kind === PageBlockKind.LIST && (block.depth > 0 || previous.list === block.list);
      if (openList === undefined || !sameRun) {
        closeList();
        openList = [];
      }
      openList.push(line);
      return;
    }
    closeList();
    const chunk = blockMarkdown(block, people);
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
  });
  closeList();
  return `${chunks.join('\n\n')}\n`;
}

function blockMarkdown(block: PageBlock, people: MentionPeople): string {
  switch (block.kind) {
    case PageBlockKind.HEADING:
      return `${'#'.repeat(Math.min(block.level + 1, 6))} ${inlines(block.inlines, people)}`;
    case PageBlockKind.PARAGRAPH:
      return inlines(block.inlines, people).trim();
    case PageBlockKind.QUOTE:
      return `> ${inlines(block.inlines, people)}`;
    case PageBlockKind.LIST:
      return '';
    case PageBlockKind.CODE: {
      const fence = fenceFor(block.text);
      return `${fence}${block.language}\n${block.text}\n${fence}`;
    }
    case PageBlockKind.DIVIDER:
      return '---';
    case PageBlockKind.BOOKMARK:
      return `[${escapeMarkdown(block.title.length > 0 ? block.title : block.url)}](${block.url})`;
    case PageBlockKind.IMAGE:
      return `[Image${block.caption.length > 0 ? `: ${escapeMarkdown(block.caption)}` : ''}]`;
    case PageBlockKind.LATEX:
      return `$$\n${block.latex}\n$$`;
    case PageBlockKind.LINKED_DOC:
      return `[${escapeMarkdown(block.title)}]`;
    case PageBlockKind.TABLE:
      return table(block.rows);
    case PageBlockKind.CALLOUT:
      return `> ${block.emoji} ${inlines(block.inlines, people)}`.trimEnd();
    case PageBlockKind.ATTACHMENT:
      return `[Attachment: ${escapeMarkdown(block.name)}${block.size.length > 0 ? ` (${block.size})` : ''}]`;
  }
}
