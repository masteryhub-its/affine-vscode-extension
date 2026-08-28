# Code standards

These rules apply to MasteryHub **editor plugins** (this AFFiNE extension, and the Plane plugin that will follow the same shape). Copy this file into a new plugin repo as-is, then add product-specific notes at the bottom.

The bar is: **strict TypeScript, named types, tests first, `npm run validate` is green.**

## Quick check

```bash
npm install
npm run validate
```

`validate` runs type-check, ESLint (`--max-warnings 0`), Prettier check, and Jest.

## What enforces standards

| Layer | Tool |
| --- | --- |
| Types | TypeScript `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` |
| Lint | ESLint 9, `@typescript-eslint` type-checked, `--max-warnings 0` |
| Format | Prettier, **print width 200** |
| Tests | Jest + `ts-jest`, files named `*.spec.ts` next to the code |
| Bundle | esbuild, `vscode` external, CommonJS |

Do not add a second formatter (dprint, Biome) in these repos.

## TypeScript

- **No `any`.** Use `unknown` and narrow.
- **Explicit return types** on functions (expressions and typed callbacks may omit them when ESLint allows).
- **`public` / `private`** on class members.
- **Named types** for function parameters and return values. Never inline `{ ... }` on a parameter or as a return type. ESLint `no-restricted-syntax` enforces this.
- Prefer `type` imports (`import type { ... }`).
- No non-null assertions (`!`).
- Exhaustive `switch` on unions.
- Closed string sets (URL protocols, HTTP methods, tree kinds, error codes, credentials, sidebar messages, page blocks) are TypeScript **enums**, same as DriveX / WePray: `src/utils/enums/<name>.enum.ts`. Do not scatter string-literal discriminators.
- Optional properties: omit the key, or type it as `T | undefined`. Do not pass `undefined` into a property typed only as `T?` under `exactOptionalPropertyTypes`.

```ts
// ❌
export function movePage(input: { workspaceId: string; docId: string }): Promise<{ ok: boolean }> {}

// ✅
export interface MovePageInput {
  readonly workspaceId: string;
  readonly docId: string;
}

export interface MovePageResult {
  readonly ok: boolean;
}

export function movePage(input: MovePageInput): Promise<MovePageResult> {}
```

## Tests (TDD)

New behavior and bug fixes start with a **failing** `*.spec.ts`. Watch it fail for the right reason, then write the minimum production code.

- One behavior per test. If the name needs “and”, split it.
- Assert on real outcomes (parsed Yjs, HTML, error codes), not on mock call counts.
- Keep VS Code UI thin: put logic in plain modules under `src/` so Jest can run it without the editor.
- `src/vscode/**` is host wiring. Prefer not to unit-test it; cover the functions it calls.

## Layout

Keep the same folders in every editor plugin:

```
src/
  client/     # HTTP / GraphQL / product API
  errors/     # typed errors
  utils/      # shared enums and helpers (`utils/enums/*.enum.ts`)
  vscode/     # commands, tree, webview host
  sidebar/    # webview HTML + message parsing
```

Product-specific folders (Yjs, Plane API, …) sit beside those.

## Git

- Prefer [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Human authors only. Never add a `Co-authored-by` trailer for Cursor, Copilot, or other agents.
- Do not commit `.env`, tokens, cookies, or `.vsix` binaries.
- Do not skip hooks or CI (`--no-verify`) on shared branches.

## UI

- User-facing flows go through the sidebar / tree first.
- The Command Palette may expose search, open document, sign-in, sync, force reload, and sign out.
- Hide tree-item-only commands (move, trash) from the palette with `"when": "false"`.
- After a `.vsix` install, tell the user to **restart** the editor.

## Secrets and network

- Store credentials in Secret Storage, never in settings.
- Default server URLs are public product endpoints, not personal tokens.
- Sync / write paths must go through the product’s documented API (for AFFiNE: authenticated Socket.IO doc updates, not ad-hoc GraphQL writes).

## AFFiNE-specific

- Page titles and organize folders come from workspace Yjs when the indexer is off.
- Trash means AFFiNE trash (`meta.pages.trash`), not a permanent delete.
- Do not embed the AFFiNE web app in an iframe or Simple Browser; it has no session cookies there. Open the real editor with `vscode.env.openExternal`.
