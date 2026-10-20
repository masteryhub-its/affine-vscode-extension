const SPECIAL = /[\\`*_{}[\]()#+\-.!|<>~]/gu;

/** Escapes text from the server before it goes into a hover, so a title cannot add links or formatting. */
export function escapeMarkdown(value: string): string {
  return value.replace(SPECIAL, '\\$&');
}
