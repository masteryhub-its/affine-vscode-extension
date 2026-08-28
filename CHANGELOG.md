# Changelog

## 0.5.0 — 2026-08-28

Local build covering the v0.3–v0.5 roadmap.

- New page, new Organize folder, restore from trash, rename, duplicate
- Open AFFiNE Link; hover titles on known page URLs; Global-only server URL copy
- Preview: tables, callouts, same-origin images, attachments
- Inline highlight (background) and text color in preview
- Favorites and collections in the sidebar; search ranks title matches first
- Recent pages (last 8) in the sidebar; tags on tree and preview
- Catalog TTL cache; skip Yjs refetch when GraphQL doc `updatedAt` is unchanged
- `affine.clientVersion` warning in the AFFiNE output channel when below 0.26.0

## 0.2.0

Local build until we publish to the Visual Studio Marketplace and Open VSX.

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
