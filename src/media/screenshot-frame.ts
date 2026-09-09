import { escapeHtml } from '../sidebar/escape-html';
import { MarketplaceShotName } from '../utils/enums/marketplace-shot-name.enum';
import { SCREENSHOT_HOVER_DOC_ID } from './screenshot-fixtures';
import { VSCODE_DARK_THEME_CSS } from './screenshot-theme';

export const MARKETPLACE_SHOT_WIDTH = 1280;
export const MARKETPLACE_SHOT_HEIGHT = 800;

export interface MarketplaceFrameInput {
  readonly kind: MarketplaceShotName;
  readonly sidebarHtml: string;
  readonly previewHtml: string | undefined;
}

interface ParsedWebview {
  readonly styles: string;
  readonly body: string;
}

function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function parseWebview(html: string): ParsedWebview {
  const styleMatch = /<style>([\s\S]*?)<\/style>/i.exec(html);
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return {
    styles: styleMatch?.[1] ?? '',
    body: stripScripts(bodyMatch?.[1] ?? ''),
  };
}

function activityIcon(): string {
  return `<svg class="activity-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L22 21H2z"/></svg>`;
}

function editorPlaceholder(): string {
  return `
    <main class="editor">
      <div class="tabs"><span class="tab active">extension.ts</span></div>
      <pre class="code"><span class="kw">export</span> <span class="kw">function</span> <span class="fn">activate</span>() {
  <span class="cm">// AFFiNE lives in the activity bar</span>
}</pre>
    </main>`;
}

function previewPane(preview: ParsedWebview): string {
  return `
    <main class="editor preview-host">
      <div class="tabs"><span class="tab active">API Handbook</span></div>
      <div class="preview-scroll">
        <style>${preview.styles}</style>
        ${preview.body}
      </div>
    </main>`;
}

export function wrapMarketplaceFrame(input: MarketplaceFrameInput): string {
  const sidebar = parseWebview(input.sidebarHtml);
  const preview = input.previewHtml === undefined ? undefined : parseWebview(input.previewHtml);
  const isPreview = input.kind === MarketplaceShotName.PREVIEW;
  const title = input.kind === MarketplaceShotName.SIGN_IN ? 'Sign in to AFFiNE' : 'AFFiNE by MasteryHub';
  const main = isPreview && preview !== undefined ? previewPane(preview) : editorPlaceholder();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${VSCODE_DARK_THEME_CSS}
    html, body { margin: 0; height: 100%; background: #1f1f1f; font-family: var(--vscode-font-family); overflow: hidden; }
    .chrome { display: flex; flex-direction: column; height: 100%; color: #cccccc; }
    .titlebar { height: 36px; display: flex; align-items: center; padding: 0 14px; background: #181818; border-bottom: 1px solid #2b2b2b; font-size: 12px; }
    .workbench { flex: 1; display: flex; min-height: 0; }
    .activity { width: 48px; background: #181818; border-right: 1px solid #2b2b2b; display: flex; flex-direction: column; align-items: center; padding-top: 12px; gap: 16px; }
    .activity-logo { width: 26px; height: 26px; fill: #cccccc; }
    .activity-dot { width: 22px; height: 22px; border-radius: 4px; background: #2b2b2b; }
    .sidebar { width: ${isPreview ? '300px' : '380px'}; background: var(--vscode-sideBar-background); border-right: 1px solid #2b2b2b; overflow: auto; }
    .sidebar .webview { min-height: 100%; }
    .editor { flex: 1; background: var(--vscode-editor-background); display: flex; flex-direction: column; min-width: 0; }
    .tabs { height: 35px; display: flex; align-items: stretch; background: #181818; border-bottom: 1px solid #2b2b2b; }
    .tab { display: flex; align-items: center; padding: 0 16px; font-size: 12px; background: #1e1e1e; border-right: 1px solid #2b2b2b; }
    .code { margin: 24px; font-family: var(--vscode-editor-font-family); font-size: 13px; line-height: 1.6; color: #d4d4d4; }
    .kw { color: #569cd6; }
    .fn { color: #dcdcaa; }
    .cm { color: #6a9955; }
    .preview-host { background: var(--vscode-editor-background); }
    .preview-scroll { flex: 1; overflow: auto; }
    .doc-row:has([data-doc="${SCREENSHOT_HOVER_DOC_ID}"]) .doc-actions { display: flex; }
    .sidebar .brand { margin-bottom: 8px; }
    .sidebar .card { padding: 8px; margin-bottom: 8px; }
    .sidebar button { margin-top: 6px; }
    .sidebar .actions { gap: 4px; }
    .sidebar .actions button { min-width: 80px; }
    .sidebar h2 { margin: 6px 0; }
    ${sidebar.styles}
  </style>
</head>
<body>
  <div class="chrome">
    <header class="titlebar">${escapeHtml(title)} — Visual Studio Code</header>
    <div class="workbench">
      <nav class="activity" aria-label="Activity Bar">${activityIcon()}<span class="activity-dot"></span><span class="activity-dot"></span></nav>
      <aside class="sidebar"><div class="webview">${sidebar.body}</div></aside>
      ${main}
    </div>
  </div>
</body>
</html>`;
}
