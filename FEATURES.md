# Features

Complete list of what **AFFiNE by MasteryHub** (v0.5.0) does in VS Code and Cursor. The [README](./README.md) is the short version. This file is the catalog.

This client talks to **self-hosted AFFiNE** or **AFFiNE Cloud** over GraphQL, REST, and Yjs. It is **not** an official Toeverything product. Editing still happens in the AFFiNE web app; this extension is the bridge next to your code.

## Connect and account

- Open the AFFiNE activity-bar icon (triangle) to sign in.
- Server presets: **MasteryHub** (`https://affine.masteryhub-its.com`), **AFFiNE Cloud** (`https://app.affine.pro`), or a **custom** self-hosted URL (no trailing slash).
- Save server from the sidebar. Sign out first if you need to switch instances.
- Sign in with an **access token**, or **email and password**. Password is used once to mint a named token and is not stored.
- Sign out from the sidebar, the Pages / AFFiNE toolbar, or the command palette.
- Status bar shows the signed-in **name** (not email), or a prompt to sign in.
- Access tokens live in editor **Secret Storage**, never in `settings.json`.
- Sidebar and settings copy: server URL is **Global only**.
- Works on **VS Code and Cursor 1.90+**.
- If `affine.clientVersion` is below `0.26.0`, the **AFFiNE** output channel warns that create, rename, and restore will not work.

## Sidebar (AFFiNE view)

- Signed-in **name, email, avatar**, server URL (Global only), and last-synced time.
- Buttons: **Sync**, **Search**, **New page**, **New folder**, **Restore from trash**, **Force reload**, **Sign out**.
- **Filter pages** by title (client-side, as you type).
- Nested **Organize folders** and nested pages, plus pages that are not in a folder.
- **Favorites** and **Collections** sections when the workspace has them.
- **Recent pages** (last 8 opened previews), stored in `globalState`.
- Page **count** per workspace; **tags** next to titles when present.
- Workspace labels from AFFiNE (not only truncated ids).
- Hover a page row for **move**, **trash** (trash-can icon; spinner while the request runs), and **open in browser**.
- Click a page title to open the **local preview**.
- Catalog uses a 60s in-memory cache. Sync/open reuse the Yjs tree when GraphQL doc ids and `updatedAt` are unchanged. **Force reload** invalidates the cache.

## Pages tree

- Second view in the same activity-bar container: **Pages**.
- Mirrors the same Organize folder tree.
- Click a page to open the local preview.
- Toolbar: search, force reload, sync, sign out (sign out only when signed in).
- Right-click a page: **Move to Folder**, **Move to Trash**, **Rename**, **Duplicate**.

## Search

- **Command palette:** `AFFiNE: Search AFFiNE Pages`.
- Sidebar **Search** button, and the search icon on the Pages / AFFiNE toolbar.
- Matches **page titles** always (works when the server indexer is off).
- Uses AFFiNE **full-text search** when `searchDocs` returns hits (indexer enabled on the server).
- Ranking prefers **title matches**, then full-text, then folder path.
- If the indexer is empty or errors, falls back to title filter.
- Optional `affine.defaultWorkspaceId` limits search (and Open Document) to that workspace; empty means every workspace you can access. Workspace picker respects that default.
- Picking a result opens the **local preview**, not the browser.

## Command palette

Visible commands:

| Command | What it does |
| --- | --- |
| Sign in to AFFiNE | Opens the sidebar sign-in UI |
| Search AFFiNE Pages | Keyword → pick a page → preview |
| Open AFFiNE Document | Pick a workspace (if needed) and a page → preview |
| Open AFFiNE Link | Open a selected AFFiNE page URL |
| New AFFiNE Page | Workspace, folder, title → create via Yjs |
| New AFFiNE Folder | Create an Organize folder |
| Restore AFFiNE Page | Pick a trashed page and restore it |
| Sync AFFiNE | Reload workspaces and pages from the server |
| Force Reload AFFiNE | Rebuild AFFiNE UI, catalog, and previews. Does **not** reload the editor window |
| Sign out of AFFiNE | Clears the stored credential |

Hidden from the palette (use the tree or sidebar): **Move to Folder**, **Move to Trash**, **Rename**, **Duplicate**.

## Local preview

Click a page (or open it from Search / Open Document) for a **read-only** preview built from the Yjs snapshot. This works when the server indexer is off.

**Chrome**

- Page title and **tags**
- Creator and last editor (avatars); one name if they are the same person
- **Open in AFFiNE** — system browser, where the real editor and your login session live
- Loading and error states; **AFFiNE** output channel for request failures

**Rendered blocks**

- Headings (levels 1–6), paragraphs, quotes
- Bulleted lists, numbered lists, to-do checkboxes (nested lists keep indent)
- Bold, italic, underline, strike, inline code, **highlight** (background), text color
- Web links (open in the system browser)
- Linked pages and synced-doc embeds (open that page in the system browser)
- Inline `@mentions` with name and avatar (open the current page in AFFiNE)
- Code blocks (language class), dividers, bookmarks
- LaTeX as source text (not rendered math)
- **Tables** (simple HTML)
- **Callouts**
- **Same-origin images** (`img-src` scoped to the AFFiNE server + `data:`)
- **Attachments** (filename + size; open blob URL in the browser)

**Special pages**

- Empty page: short empty-state copy
- Edgeless / whiteboard-only: “This page is a canvas. Open it in AFFiNE…”
- Surface / edgeless-only notes are skipped in the page body on purpose
- Trash list empty-state: “No pages in trash”

**Not rendered in preview** (open the page in AFFiNE instead)

- Databases / data views
- Column layouts
- YouTube / Figma / GitHub / iframe embeds
- Whiteboard drawing, frames, surface-ref
- Live collab (preview is a snapshot until you reopen)

## Organize

- **Move** a page to another Organize folder (sidebar hover, or Pages context menu). Folder picker in the editor.
- **Trash** a page (confirm first). This is AFFiNE trash (`meta.pages.trash`), not a permanent delete.
- **Restore** from trash (sidebar button or command).
- **New page** and **new Organize folder**.
- **Rename** and **duplicate** a page.
- Writes go over **Socket.IO / Yjs**, same path as the AFFiNE web app. Requires `affine.clientVersion` ≥ `0.26.0`.
- **Open in browser** from the sidebar hover actions — system browser only.

## Link detection

- AFFiNE page URLs for the configured server in the editor selection.
- Hover on a known page URL shows the catalog title.
- Command: **Open AFFiNE Link**.

## Force reload vs editor reload

- **Force reload** (sidebar, toolbar, palette): clears AFFiNE sidebar HTML, catalog cache, last-synced time, and preview tabs, then signs you back in to the catalog. The rest of Cursor / VS Code stays open.
- After installing a **new `.vsix`**, use **Developer: Reload Window** (or restart). Force reload does not load new extension JavaScript.

## Settings

| Key | Default | Effect |
| --- | --- | --- |
| `affine.serverUrl` | `https://affine.masteryhub-its.com` | Instance base URL. Cloud: `https://app.affine.pro`. No trailing slash. Global only. |
| `affine.defaultWorkspaceId` | empty | If set, search and Open Document target that workspace when it exists. |
| `affine.openMode` | `external` | Always the system browser. Simple Browser has no AFFiNE login session. |
| `affine.clientVersion` | `0.26.0` | `x-affine-client-version` header. Must stay ≥ 0.26.0 for write paths. |

## Security and diagnostics

- Tokens only in Secret Storage.
- Password not persisted after sign-in.
- Server URL must be `http` or `https` with no embedded credentials.
- Output channel name: **AFFiNE** (redact tokens and cookies before pasting into issues).
- Security reports: [SECURITY.md](./SECURITY.md), not public issues.

## Intentionally not in this client

These are out of scope, not missing by accident:

- Editing page bodies inside VS Code / Markdown write-back (pages are Yjs CRDTs)
- Whiteboard / edgeless editor inside the sidebar
- Embedding the AFFiNE web app in an iframe or Simple Browser
- Official AFFiNE MCP (needs Copilot on the server)
- OAuth (Google / GitHub) as the editor sign-in
- Visual Studio Marketplace / Open VSX listing (install from the `.vsix` until that ships)

## Related docs

- [README.md](./README.md) — product story, install, contribute
- [ROADMAP.md](./ROADMAP.md) — planned features by release (v1.0 marketplace)
- [CONTRIBUTING.md](./CONTRIBUTING.md) — issues and pull requests
- [CHANGELOG.md](./CHANGELOG.md) — what landed in each version
- [SECURITY.md](./SECURITY.md) — vulnerability reports
