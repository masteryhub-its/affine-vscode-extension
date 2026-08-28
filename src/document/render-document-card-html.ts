import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { escapeHtml } from '../sidebar/escape-html';

export interface RenderDocumentCardHtmlInput {
  readonly title: string;
  readonly url: string;
  readonly nonce: string;
  readonly cspSource: string;
}

const DOCUMENT_CARD_CSS = `
  :root { color-scheme: light dark; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: var(--vscode-descriptionForeground); margin: 0 0 12px; max-width: 52rem; }
  .url { word-break: break-all; font-family: var(--vscode-editor-font-family); font-size: 12px; }
  button { padding: 8px 14px; border: none; border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
`;

const DOCUMENT_CARD_SCRIPT = `
  const vscode = acquireVsCodeApi();
  const open = () => vscode.postMessage({ type: '${DocumentPanelMessageType.OPEN_EXTERNAL}' });
  document.getElementById('open-external').addEventListener('click', open);
`;

function renderBody(input: RenderDocumentCardHtmlInput): string {
  return `
  <h1>${escapeHtml(input.title)}</h1>
  <p>AFFiNE cannot run inside Cursor. The in-editor browser has no login session, so AFFiNE shows “you do not have access”.</p>
  <p>Pages open in your system browser. Sign in at this server in that browser if you are asked to.</p>
  <p class="url">${escapeHtml(input.url)}</p>
  <button type="button" id="open-external">Open in browser</button>`;
}

function renderShell(input: RenderDocumentCardHtmlInput, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${input.cspSource} 'unsafe-inline'; script-src 'nonce-${input.nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>${DOCUMENT_CARD_CSS}</style>
</head>
<body>
  ${body}
  <script nonce="${input.nonce}">${DOCUMENT_CARD_SCRIPT}</script>
</body>
</html>`;
}

export function renderDocumentCardHtml(input: RenderDocumentCardHtmlInput): string {
  return renderShell(input, renderBody(input));
}
