import { escapeHtml } from '../sidebar/escape-html';
import { THEME_CSS } from './theme-css';

export interface DocumentShellInput {
  readonly title: string;
  readonly nonce: string;
  readonly cspSource: string;
  readonly body: string;
  /** Extra places images may load from, after the webview itself (for example the page's own server). */
  readonly imageSources?: readonly string[];
  readonly script?: string;
  readonly extraCss?: string;
}

/** The page frame every webview shares: a strict content security policy, the theme stylesheet and one nonce script. */
export function renderDocumentShell(input: DocumentShellInput): string {
  const { title, nonce, cspSource, body, script, extraCss } = input;
  const images = [cspSource, ...(input.imageSources ?? [])].join(' ');
  const scriptTag = script === undefined ? '' : `\n  <script nonce="${nonce}">\n${script}\n  </script>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${images}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${THEME_CSS}${extraCss ?? ''}</style>
</head>
<body>
${body}${scriptTag}
</body>
</html>`;
}
