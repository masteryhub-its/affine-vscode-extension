import { MAX_BLOCK_TEXT_LENGTH } from '../yjs/encode-block-edit';
import type { NewBlockSpec } from './new-block';

export interface SelectionSource {
  /** Path inside the workspace; never an absolute path, so a home folder is not written into a page. */
  readonly relativePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly languageId: string;
  readonly text: string;
}

function fileName(path: string): string {
  return path.startsWith('/') || /^[a-z]:[\\/]/iu.test(path) ? (path.split(/[\\/]/u).pop() ?? path) : path;
}

/** The blocks that record a piece of code on an AFFiNE page: where it is from, then the code itself with its lines. */
export function selectionBlocks(source: SelectionSource): readonly NewBlockSpec[] {
  const where = source.endLine > source.startLine ? `lines ${source.startLine}–${source.endLine}` : `line ${source.startLine}`;
  const from: NewBlockSpec = {
    kind: 'paragraph',
    segments: [{ text: 'From ' }, { text: fileName(source.relativePath), attributes: { code: true } }, { text: `, ${where}` }],
  };
  const code = source.text
    .replace(/\r\n?/gu, '\n')
    .replace(/^(?:[ \t]*\n)+/u, '')
    .replace(/\s+$/u, '')
    .slice(0, MAX_BLOCK_TEXT_LENGTH);
  return code.length === 0 ? [from] : [from, { kind: 'code', language: source.languageId === 'plaintext' ? '' : source.languageId, text: code }];
}
