/**
 * One stylesheet for every AFFiNE webview. All colours come from the editor theme (`--vscode-*`), so Dark, Light and
 * High Contrast themes work without a second set of values. The only literal colours in the previews are the label
 * colours the server sends, and those are passed in as `--chip` and `--chip-fg`.
 */
export const THEME_CSS = String.raw`
*, *::before, *::after { box-sizing: border-box; }
:root {
  color-scheme: light dark;
  --radius: 4px;
  --muted: var(--vscode-descriptionForeground);
  --line: var(--vscode-widget-border, var(--vscode-panel-border, transparent));
  --subtle: color-mix(in srgb, var(--vscode-foreground) 6%, transparent);
  --warn: var(--vscode-editorWarning-foreground);
  --danger: var(--vscode-errorForeground);
  --ok: var(--vscode-charts-green);
}
body {
  margin: 0;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  line-height: 1.5;
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}
a { color: var(--vscode-textLink-foreground); }
a:hover { color: var(--vscode-textLink-activeForeground); }
h1, h2, h3, p, ul, ol, dl, dd { margin: 0; }
.muted { color: var(--muted); }
.warn { color: var(--warn); }
.icon { flex: none; vertical-align: -2px; }

.page { max-width: 1040px; padding: 20px 28px 48px; }
.crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.head { margin-bottom: 14px; }
.key { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.title { font-size: 1.6em; line-height: 1.25; font-weight: 600; overflow-wrap: anywhere; }

.actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 20px; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 2px;
  font: inherit; font-size: 12.5px; line-height: 18px;
  color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
  background: var(--vscode-button-secondaryBackground, transparent);
  border: 1px solid var(--vscode-button-border, var(--line));
  cursor: pointer;
}
.btn:hover { background: var(--vscode-button-secondaryHoverBackground, var(--subtle)); }
.btn.primary { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
.btn.primary:hover { background: var(--vscode-button-hoverBackground); }
.btn.ghost { background: transparent; border-color: transparent; color: var(--vscode-textLink-foreground); }
.btn.ghost:hover { background: var(--subtle); }
.btn:disabled { opacity: 0.5; cursor: default; }
button:focus-visible, a:focus-visible, textarea:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 28px; align-items: start; }
.layout > * { min-width: 0; }
.section { margin-bottom: 24px; }
.section > h2 { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.count { font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); border-radius: 10px; padding: 0 7px; font-size: 11px; }
.progress { width: 90px; height: 4px; border-radius: 2px; overflow: hidden; background: var(--vscode-progressBar-background); opacity: 0.35; }
.progress > i { display: block; height: 100%; background: var(--ok); opacity: 1; }

.prose { overflow-wrap: anywhere; }
.prose > * + * { margin-top: 10px; }
.prose ul, .prose ol { padding-left: 22px; }
.prose code { font-family: var(--vscode-editor-font-family); font-size: 0.92em; background: var(--vscode-textCodeBlock-background); border-radius: 3px; padding: 1px 4px; }
.prose pre { overflow: auto; padding: 10px 12px; border-radius: var(--radius); background: var(--vscode-textCodeBlock-background); }
.prose pre code { padding: 0; background: transparent; }
.prose blockquote { margin-left: 0; padding: 0 12px; border-left: 3px solid var(--vscode-textBlockQuote-border); color: var(--muted); }
.prose table { border-collapse: collapse; }
.prose th, .prose td { border: 1px solid var(--line); padding: 4px 8px; text-align: left; }
.prose img { max-width: 100%; }
.mention { color: var(--vscode-textLink-foreground); background: var(--vscode-badge-background); border-radius: 4px; padding: 0 4px; }
.image-placeholder { color: var(--muted); font-style: italic; }
li.task-done, li.task-open { list-style: none; margin-left: -22px; }
li.task-done::before { content: '\2611  '; }
li.task-open::before { content: '\2610  '; }
li.task-done { color: var(--muted); text-decoration: line-through; }

.list { border: 1px solid var(--line); border-radius: var(--radius); }
.row { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 4px 10px; border-bottom: 1px solid var(--line); text-align: left; }
.row:last-child { border-bottom: 0; }
button.row { width: 100%; font: inherit; color: inherit; background: transparent; border-top: 0; border-left: 0; border-right: 0; cursor: pointer; }
button.row:hover { background: var(--subtle); }
.row .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row .id { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; flex: none; }

.props { border: 1px solid var(--line); border-radius: var(--radius); padding: 6px 0; }
.prop { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 6px; align-items: center; padding: 6px 12px; font-size: 12.5px; }
.prop dt { color: var(--muted); }
.prop dd { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 1px 9px 1px 6px; border-radius: 10px; background: var(--subtle); }
.chip { display: inline-flex; align-items: center; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: var(--chip-fg, var(--vscode-badge-foreground)); background: var(--chip, var(--vscode-badge-background)); }
.avatar { display: inline-grid; place-items: center; flex: none; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 600; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); }
.avatar.lg { width: 28px; height: 28px; font-size: 11px; }

.comment { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; margin-bottom: 14px; }
.comment-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
.comment-meta strong { color: var(--vscode-foreground); font-weight: 600; }
.comment-body { margin-top: 2px; overflow-wrap: anywhere; }
.comment-edit { padding: 0; border: 0; background: transparent; font: inherit; font-size: 12px; color: var(--vscode-textLink-foreground); cursor: pointer; }
.comment-editor-actions { display: flex; gap: 8px; }
.composer { border: 1px solid var(--vscode-input-border, var(--line)); border-radius: var(--radius); background: var(--vscode-input-background); }
.composer:focus-within { border-color: var(--vscode-focusBorder); }
.composer textarea { display: block; width: 100%; min-height: 64px; padding: 8px 10px; resize: vertical; font: inherit; color: var(--vscode-input-foreground); background: transparent; border: 0; outline: none; }
.composer-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; font-size: 12px; color: var(--muted); border-top: 1px solid var(--line); }
textarea { font: inherit; }
kbd { padding: 0 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 11px; color: var(--vscode-foreground); background: var(--subtle); border: 1px solid var(--line); }

.skeleton { height: 12px; border-radius: 3px; background: linear-gradient(90deg, var(--subtle), color-mix(in srgb, var(--vscode-foreground) 14%, transparent), var(--subtle)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
.skeleton.title { height: 26px; width: 60%; }
.skeleton.line { margin-top: 10px; }
@keyframes shimmer { to { background-position: -200% 0; } }
.notice { padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--subtle); }

body.vscode-high-contrast .btn,
body.vscode-high-contrast .props,
body.vscode-high-contrast .list,
body.vscode-high-contrast .pill,
body.vscode-high-contrast .chip,
body.vscode-high-contrast .notice,
body.vscode-high-contrast-light .btn,
body.vscode-high-contrast-light .props,
body.vscode-high-contrast-light .list,
body.vscode-high-contrast-light .pill,
body.vscode-high-contrast-light .chip,
body.vscode-high-contrast-light .notice { border: 1px solid var(--vscode-contrastBorder); }

@media (max-width: 720px) {
  .page { padding: 16px 14px 40px; }
  .layout { grid-template-columns: minmax(0, 1fr); }
  .props { order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
`;
