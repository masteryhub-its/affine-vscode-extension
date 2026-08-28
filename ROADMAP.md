# AFFiNE by MasteryHub — feature roadmap

Product plan for the VS Code / Cursor client. **Shipped behavior** is in [FEATURES.md](./FEATURES.md). This file is the forward-looking catalog: phases, priorities, and permanent non-goals.

**Extension id:** `masteryhub-its.affine`  
**Current release:** v0.5.0  
**Default server:** `https://affine.masteryhub-its.com` (Global only)  
**Stack:** GraphQL + REST + Yjs (Socket.IO) — not Markdown on disk

---

## Honest assessment — should you install today?

**Short answer: yes for read-heavy spec work beside code.** v0.5.0 covers browse, preview (including tables, callouts, same-origin images), organize (new page/folder, rename, duplicate, restore), and links from the editor. You still open AFFiNE in the browser to edit page bodies.

### What you can do today (installed)

| Works in VS Code | Still need the browser for |
| --- | --- |
| Sign in, browse workspaces, Organize folders, favorites, collections, recents | In-editor body editing |
| Read-only preview (headings, lists, mentions, tables, callouts, images, attachments) | Databases, whiteboard, embeds |
| Search (title + ranked full-text) | Live collab cursors |
| New page/folder, rename, duplicate, move, trash, restore | Permanent delete (use AFFiNE trash semantics) |
| Hover titles on AFFiNE URLs; Open AFFiNE Link | — |

### When installation becomes worth it

| Milestone | Minimum bar for “install this” |
| --- | --- |
| **v0.5 (now)** | Catalog + preview + light organize + links from code — worth it if you *reference* docs beside code. |
| **Never (by design)** | In-editor rich-text editing of Yjs bodies — use AFFiNE web. |

**Recommendation:** Install for sidebar + preview + links. Do not expect an AFFiNE replacement inside VS Code.

---

## Principles (every phase)

| Rule | Why |
| --- | --- |
| Credentials in Secret Storage only, bound to Global `affine.serverUrl` | Cloned `.vscode/settings.json` must not retarget tokens |
| Open the real AFFiNE app in the system browser for editing | No iframe / Simple Browser — no session cookies there |
| Sidebar + tree first; palette for search, open, sync, sign-in, force reload | Matches CODE_STANDARDS UI bar |
| TDD: failing `*.spec.ts` before production code | Same toolchain as Plane plugin |
| `npm run validate` green before merge | Types, lint, format, tests |

---

## Shipped — v0.5.0

See [FEATURES.md](./FEATURES.md). v0.3–v0.5 from this roadmap are implemented (links/hover, new page/folder/restore, rename/duplicate, preview tables/callouts/images/attachments, favorites/collections/tags, catalog TTL + GraphQL fingerprint skip, recents, search ranking, clientVersion guard).

---

## v0.3 — Editor bridge (shipped)

| Feature | Detail |
| --- | --- |
| Link detection in selection | AFFiNE page URLs and `docId`-style paths for configured server → preview or browser |
| Hover provider | Show page title (from catalog cache) on known AFFiNE links |
| Command: Open AFFiNE Link | Same as Plane’s link command — works from editor context menu |
| Global-only server URL label | Sidebar + settings copy: “Global only”; status bar shows name, not email |
| Restore from trash | List trashed pages → restore via Yjs |
| New page | Quick Pick: workspace, folder, title → create via Yjs |
| New Organize folder | Same path as web app (Yjs folder node) |
| Output channel hardening | Audit toasts and logs for token/cookie/password leakage |

---

## v0.4 — Organize and preview depth (shipped)

| Feature | Detail |
| --- | --- |
| Rename page | Title update via Yjs (sidebar hover or context menu) |
| Duplicate page | Client duplicate flow |
| Favorites / pinned pages | Read pin state from workspace meta; sidebar section |
| Tags / properties (read-only) | Tags on preview chrome and tree subtitle |
| Preview: tables | Simple tables from Yjs (read-only HTML) |
| Preview: callouts | Styled callout blocks |
| Preview: images (same-origin) | `img-src` scoped to AFFiNE server origin + `data:` |
| Preview: attachments list | Filename + size; open in browser |
| Trash empty-state | “No pages in trash” |

---

## v0.5 — Search, cache, and multi-workspace UX (shipped)

| Feature | Detail |
| --- | --- |
| Catalog cache + TTL | In-memory 60s cache; force reload invalidates |
| Incremental sync | Skip Yjs workspace refetch when GraphQL doc ids + `updatedAt` are unchanged |
| Workspace switcher | Quick Pick when the user has many workspaces; respect `defaultWorkspaceId` |
| Recent pages | Last 8 opened previews in the sidebar |
| Search ranking | Prefer title match, then full-text, then folder path |
| Collections (read-only) | Sidebar section from Organize collection records |
| Settings: `affine.clientVersion` guard | Warn in output channel if below 0.26.0 |

---

## v1.0 — Stable product

**Goal:** Public OSS release others can install without a `.vsix` handoff.

| Feature | Detail |
| --- | --- |
| Visual Studio Marketplace listing | Publisher `masteryhub-its`, CI publish workflow |
| Open VSX listing | For VSCodium / compatible editors |
| README + FEATURES parity | Install from marketplace, screenshots, short demo GIF |
| CHANGELOG discipline | One entry per release; semver |
| Compatibility matrix | Document tested AFFiNE server versions (Cloud + self-hosted) |
| Issue templates | Bug / feature / security (already in CONTRIBUTING) |
| Performance budget | Cold sync under N seconds for MasteryHub-sized workspace (define N in CI smoke) |

---

## v2.0+ — Optional / research

Only after v1.0 and proven server API stability. Not committed.

| Idea | Notes |
| --- | --- |
| `@mention` autocomplete in editor | Insert link to AFFiNE page into comment/commit message |
| TODO comment → page link | Parse `// TODO: …` and offer to link existing page (no auto-create) |
| Workspace export snippet | Copy page as Markdown/plain text to clipboard (lossy) |
| Official AFFiNE MCP bridge | If server ships stable MCP; extension opens MCP config docs |
| OAuth sign-in | Only if AFFiNE documents a safe device flow for third-party clients |

---

## Permanent non-goals

These stay out of scope by design (also in [FEATURES.md](./FEATURES.md)):

- **In-editor rich-text editing** of Yjs page bodies (CRDT conflict surface, not Markdown files)
- **Whiteboard / edgeless editor** inside VS Code
- **Embedding** AFFiNE web app in webview iframe or Simple Browser
- **OAuth (Google/GitHub)** as primary sign-in unless officially supported for extensions
- **Permanent delete** without going through AFFiNE trash semantics
- **Database / data-view editing** in preview
- **Replacing** the AFFiNE web app for collaboration

---

## Cross-cutting work (ongoing)

| Area | Tasks |
| --- | --- |
| Security | Bound credential, Global server URL, redirect manual, CSP, `formatAffineError` redaction, `openAffineUrl` allowlist |
| Tests | Fixture JSON for GraphQL responses; Yjs snapshot fixtures per block type |
| CI | `npm run validate` on PR; optional smoke against loopback mock server |
| Docs | Keep FEATURES.md = shipped; ROADMAP.md = planned; CHANGELOG = releases |

---

## Suggested implementation order (next)

1. **v1.0** marketplace publish + compatibility matrix  
2. Research items only after that (v2.0+)

---

## Related

- [FEATURES.md](./FEATURES.md) — what v0.5.0 does today  
- [CODE_STANDARDS.md](./CODE_STANDARDS.md) — engineering bar  
- [SECURITY.md](./SECURITY.md) — vulnerability reports  
- Plane sibling: [plane-vscode-extension ROADMAP](https://github.com/MasteryHub-ITS/plane-vscode-extension/blob/main/ROADMAP.md) (separate product plan)
