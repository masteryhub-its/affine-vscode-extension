# AFFiNE by MasteryHub ITS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/masteryhub-its/affine-vscode-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/masteryhub-its/affine-vscode-extension/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/masteryhub-its/affine-vscode-extension?style=social)](https://github.com/masteryhub-its/affine-vscode-extension/stargazers)

Browse, preview, search, move, and trash pages from **self-hosted AFFiNE** or **AFFiNE Cloud** without leaving VS Code or Cursor.

This is an open-source **[MasteryHub ITS](https://www.masteryhub-its.com)** client. It is **not** an official [Toeverything](https://github.com/toeverything/AFFiNE) product. There is no official AFFiNE editor extension; this one talks to your server over GraphQL and Yjs.

**Every shipped capability** is listed in [FEATURES.md](./FEATURES.md) (commands, preview blocks, settings, and what we do not do).

**Contributions are welcome.** How to file a bug, request a feature, or open a PR is in [CONTRIBUTING.md](./CONTRIBUTING.md) and summarized under [Open for contributions](#open-for-contributions). If the extension helps you, **star the repo** so other teams can find it.

A [Plane](https://github.com/makeplane/plane) plugin will follow the same standards.

## Built by MasteryHub ITS

[MasteryHub Information Technology Solutions](https://www.masteryhub-its.com) is a product engineering team based in Egypt. We ship MVPs and internal platforms for startups and growing companies.

We built this extension because **the knowledge lives in AFFiNE and the work lives in the editor**. Specs, decisions, and whiteboards sat in a browser tab while code sat in Cursor. That split is expensive: you lose the page, you lose the mention, you context-switch for a title. We wanted AFFiNE next to the file tree — same folders, local preview, move and trash — without pasting tokens into `settings.json`.

Toeverything does not ship a VS Code or Cursor client. We wrote the one we needed, use it ourselves, and open-sourced it so any team on AFFiNE Cloud or their own instance can do the same.

## Why we use AFFiNE

MasteryHub uses AFFiNE as a wiki and whiteboard — an open-source stand-in for Notion and Miro that you can self-host.

We chose it because:

- **One app for docs and boards.** Hierarchical pages, linked references, and an infinite canvas. A page can be a document or a whiteboard without exporting between tools.
- **Self-hostable.** Teams can keep pages and attachments on their own AFFiNE instance instead of only a vendor cloud.
- **Local-first collaboration.** Real-time editing uses Yjs CRDTs, which is why this extension can preview a page even when the server indexer is off.
- **Open source we can extend.** GraphQL, websockets, and a documented self-host path meant we could build an editor client instead of waiting for a marketplace plugin.

Editing rich docs still happens in AFFiNE. Pages are Yjs CRDTs, not Markdown files on disk. This extension is the bridge from the editor back to that workspace.

## Features

Full catalog (including preview coverage and non-goals): **[FEATURES.md](./FEATURES.md)**.

### Connect

- AFFiNE Cloud (`https://app.affine.pro`), MasteryHub’s instance, or any custom self-hosted URL
- Sign in with an access token, or email and password (password is used once to mint a token and is not stored)
- Sign out from the sidebar, Pages toolbar, or command palette
- Status bar shows signed-in email, or a sign-in prompt
- Works with VS Code and Cursor 1.90+

### Sidebar and Pages tree

- Activity-bar AFFiNE view plus a **Pages** tree that mirrors Organize folders
- Nested folders and nested pages, with page counts per workspace
- Filter pages by title in the sidebar
- **Search** pages (command palette, sidebar Search, or the Pages toolbar) — titles always; full text when the server indexer is on
- Sync / refresh the catalog from the server
- Page actions (move, trash with spinner, open in browser) appear on hover so titles stay readable
- **Force reload** AFFiNE (sidebar, pages, and previews) without restarting the editor
- Signed-in name, email, avatar, server URL, and last-synced time

### Command palette

- Sign in, Search AFFiNE Pages, Open AFFiNE Document, Sync, Force Reload, Sign out
- Move and trash stay on the tree / sidebar (not in the palette)

### Local preview

Click a page (or a search / Open Document hit) to open a **read-only** preview in the editor (from Yjs — works when the server indexer is off):

- Title, creator, and last editor (deduped when they are the same person), with avatars
- Headings 1–6, paragraphs, quotes, bullets, numbered lists, and to-do checkboxes
- Bold, italic, underline, strike, inline code, and links
- Code blocks, dividers, bookmarks, LaTeX source, and image captions
- Inline `@mentions` with name and avatar; click opens the page in AFFiNE
- Web links, linked pages, and synced-doc embeds open in the system browser
- Whiteboard-only pages show a short stub and **Open in AFFiNE**

Tables, databases, attachments, embeds, and image blobs are not drawn in preview — open the page in AFFiNE. See [FEATURES.md](./FEATURES.md#local-preview).

### Organize

- Move a page to another Organize folder (sidebar button or Pages tree)
- Send a page to **AFFiNE trash** (not a permanent delete); confirm, then a spinner on that row
- Writes go over Socket.IO / Yjs, same as the AFFiNE web app
- Open the real AFFiNE editor in your **system browser** (login session stays there)

### Security

- Access tokens in editor Secret Storage — never in `settings.json`
- Password is not persisted after sign-in
- Optional default workspace (`affine.defaultWorkspaceId`); empty means every workspace you can access
- `affine.clientVersion` defaults to `0.26.0` so the server accepts sync sessions
- `affine.openMode` is always the system browser (Simple Browser has no AFFiNE session)

Marketplace and Open VSX publishing are on the roadmap. Until then, install from the `.vsix`.

## Open for contributions

This client is MIT-licensed and built in the open. Anyone using self-hosted AFFiNE or AFFiNE Cloud can help.

**How to participate** — full steps in [CONTRIBUTING.md](./CONTRIBUTING.md):

1. **Bug** — [open a bug report](https://github.com/masteryhub-its/affine-vscode-extension/issues/new?template=bug_report.yml) with extension version, editor, server URL (no tokens), and what happened.
2. **Feature** — [open a feature request](https://github.com/masteryhub-its/affine-vscode-extension/issues/new?template=feature_request.yml). Describe the problem, then a proposal. Open an issue before large changes so we can agree on shape.
3. **Pull request** — fork, branch from `main`, write a failing `*.spec.ts` then the code, run `npm run validate`, and open a PR against `main` using the template.
4. **Security** — do not file public issues. Follow [SECURITY.md](./SECURITY.md).

Useful work includes bugs against real workspaces, preview fidelity, tests, docs, translations, accessibility, and features that stay in the editor without embedding the AFFiNE web app.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_STANDARDS.md](./CODE_STANDARDS.md), and the [Code of Conduct](./CODE_OF_CONDUCT.md). CI must stay green.

The same contribution kit is what we will use for the Plane plugin.

## Install

1. Download the `.vsix` from [Releases](https://github.com/masteryhub-its/affine-vscode-extension/releases), or run `npm run package` in this repo.
2. VS Code / Cursor: **Extensions → … → Install from VSIX…**
3. **Restart** the editor.
4. Open the AFFiNE icon in the activity bar, set the server if needed, and sign in.

## Settings

| Key | Default |
| --- | --- |
| `affine.serverUrl` | `https://affine.masteryhub-its.com` |
| `affine.defaultWorkspaceId` | empty (all workspaces) |
| `affine.openMode` | `external` (system browser) |
| `affine.clientVersion` | `0.26.0` |

Use `https://app.affine.pro` for AFFiNE Cloud, or your self-hosted URL with no trailing slash.

## Requirements

- VS Code or Cursor 1.90+
- An AFFiNE account on that server
- Node 20+ only if you are developing the extension

## Develop

```bash
npm install
npm run validate
```

Press **F5** for the Extension Development Host. `npm run package` writes a sideload `.vsix`.

## Security

See [SECURITY.md](./SECURITY.md). Do not file token leaks as public issues.

## License

[MIT](./LICENSE) © MasteryHub ITS
