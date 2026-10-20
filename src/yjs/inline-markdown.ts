export interface InlineAttributes {
  readonly bold?: true;
  readonly italic?: true;
  readonly strike?: true;
  readonly code?: true;
  readonly link?: string;
}

export interface InlineSegment {
  readonly text: string;
  readonly attributes?: InlineAttributes;
}

const SAFE_LINK = /^(?:https?:\/\/|mailto:)[^\s]+$/iu;

interface Mark {
  readonly open: string;
  readonly attribute: 'bold' | 'italic' | 'strike';
}

// Longer marks first, so ** is read as bold before * is read as italic.
const MARKS: readonly Mark[] = [
  { open: '**', attribute: 'bold' },
  { open: '__', attribute: 'bold' },
  { open: '~~', attribute: 'strike' },
  { open: '*', attribute: 'italic' },
  { open: '_', attribute: 'italic' },
];

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function push(out: InlineSegment[], text: string, attributes: InlineAttributes): void {
  if (text.length === 0) {
    return;
  }
  const last = out[out.length - 1];
  const same = last !== undefined && JSON.stringify(last.attributes ?? {}) === JSON.stringify(attributes);
  if (same) {
    out[out.length - 1] = { text: last.text + text, ...(Object.keys(attributes).length > 0 ? { attributes } : {}) };
    return;
  }
  out.push(Object.keys(attributes).length > 0 ? { text, attributes } : { text });
}

function parse(source: string, inherited: InlineAttributes, out: InlineSegment[]): void {
  let plain = '';
  const flush = (): void => {
    push(out, plain, inherited);
    plain = '';
  };
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    if (rest.startsWith('`')) {
      const end = source.indexOf('`', index + 1);
      if (end > index + 1) {
        flush();
        push(out, source.slice(index + 1, end), { ...inherited, code: true });
        index = end + 1;
        continue;
      }
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/u.exec(rest);
    if (link !== null && SAFE_LINK.test(link[2] ?? '')) {
      flush();
      parse(link[1] ?? '', { ...inherited, link: link[2] ?? '' }, out);
      index += link[0].length;
      continue;
    }
    const mark = MARKS.find((candidate) => rest.startsWith(candidate.open));
    if (mark !== undefined && !(mark.open.length === 1 && mark.open === '_' && isWordChar(source[index - 1]))) {
      const end = findClose(source, index + mark.open.length, mark.open);
      if (end !== undefined) {
        flush();
        parse(source.slice(index + mark.open.length, end), { ...inherited, [mark.attribute]: true }, out);
        index = end + mark.open.length;
        continue;
      }
    }
    plain += source.charAt(index);
    index += 1;
  }
  flush();
}

/** The position of the mark that closes one opened before `from`, or undefined when there is no usable closing mark. */
function findClose(source: string, from: number, mark: string): number | undefined {
  let end = source.indexOf(mark, from);
  while (end !== -1) {
    const inner = source.slice(from, end);
    const closesWord = mark === '_' && isWordChar(source[end + 1]);
    if (inner.length > 0 && !/^\s|\s$/u.test(inner) && !closesWord && !(mark.length === 1 && source[end + 1] === mark)) {
      return end;
    }
    if (inner.length === 0) {
      return undefined;
    }
    end = source.indexOf(mark, end + 1);
  }
  return undefined;
}

/** Splits one line of Markdown-style text into pieces with their formatting: bold, italic, strikethrough, code and links. */
export function parseInlineMarkdown(source: string): readonly InlineSegment[] {
  const out: InlineSegment[] = [];
  parse(source, {}, out);
  return out;
}
