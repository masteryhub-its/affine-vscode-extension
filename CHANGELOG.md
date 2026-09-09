# Changelog

## 1.0.0 — 2026-09-09

Public store release: marketplace metadata, screenshots, and a CI catalog smoke budget.

- Default server is AFFiNE Cloud; self-hosted URLs are entered as custom (no private instance URL in the listing)
- Visual Studio Marketplace and Open VSX publish workflow on GitHub Release (`VSCE_PAT`, `OVSX_PAT`)
- Marketplace screenshots captured from the real sidebar and preview HTML
- Catalog smoke: 250 docs mapped under a 2s cold-sync budget in CI
- README install path for Marketplace / Open VSX, with GitHub `.vsix` as the sideload fallback

## 0.5.0 — 2026-08-28

Sideload build. Roadmap items labeled v0.3–v0.5 shipped in this version; **0.3.0 and 0.4.0 were not tagged separately**.

- New page, new Organize folder, restore from trash, rename, duplicate
- Open AFFiNE Link; hover titles on known page URLs; Global-only server URL copy
- Preview: tables, callouts, same-origin images, attachments
- Inline highlight (background) and text color in preview
- Favorites and collections in the sidebar; search ranks title matches first
- Recent pages (last 8) in the sidebar; tags on tree and preview
- Catalog TTL cache; skip Yjs refetch when GraphQL doc `updatedAt` is unchanged
- `affine.clientVersion` warning in the AFFiNE output channel when below 0.26.0

## 0.2.0

First sideload build (sign-in, sidebar, preview, move, trash, search).

- Sign in (token or email/password), sidebar, nested Organize folders, server presets
- Local read-only Yjs preview: authors, inline @mentions, linked pages, headings, lists, code, quotes, and related blocks
- Move pages between folders; send pages to AFFiNE trash
- Open the real AFFiNE editor in the system browser
- Tokens in Secret Storage; status bar session; profile avatar
- AFFiNE triangle icon in the activity bar and Extensions list
- Public details: who MasteryHub ITS is, why this client exists, full feature list ([FEATURES.md](./FEATURES.md)), contributions welcome
- Force reload AFFiNE (sidebar, pages, previews) without restarting the editor
- Hide page actions until hover so titles are not crowded
- Trash control uses a trash-can icon and a spinner while the page is moving to trash
- Search pages from the command palette, sidebar, or Pages toolbar; results open the local preview
- Command palette: sign in, search, open document, sync, force reload, sign out
- Mentions, web links, and linked pages in the preview open in the system browser
