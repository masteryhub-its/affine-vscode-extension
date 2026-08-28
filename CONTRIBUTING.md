# How to contribute

You do not need to work at MasteryHub. **Issues, pull requests, docs, and review are all welcome.**

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

| I want to… | Where to go |
| --- | --- |
| Report a bug in this extension | [Open a bug report](https://github.com/MasteryHub-ITS/affine-vscode/issues/new?template=bug_report.yml) |
| Suggest a feature | [Open a feature request](https://github.com/MasteryHub-ITS/affine-vscode/issues/new?template=feature_request.yml) |
| Send a code or docs change | [Open a pull request](#submit-a-pull-request) |
| Report a security problem | [SECURITY.md](./SECURITY.md) — **not** a public issue |
| Report a bug in AFFiNE itself | [toeverything/AFFiNE](https://github.com/toeverything/AFFiNE/issues) |

Pick a form from [New issue](https://github.com/MasteryHub-ITS/affine-vscode/issues/new/choose). Blank issues are turned off so reports stay complete.

## Submit an issue

### Bug

Use this when something in **this VS Code / Cursor client** is wrong (sidebar, preview, sign-in, move, trash, sync).

1. Search [existing issues](https://github.com/MasteryHub-ITS/affine-vscode/issues) so we do not duplicate work.
2. Open **[Bug report](https://github.com/MasteryHub-ITS/affine-vscode/issues/new?template=bug_report.yml)**.
3. Fill in:
   - Extension version (for example `0.2.0`)
   - Editor (VS Code or Cursor, and the version if you know it)
   - AFFiNE server URL (Cloud or self-hosted — **no tokens**)
   - What you did, what you expected, what happened
   - Optional: the **AFFiNE** output channel, with tokens and cookies redacted

A good bug is reproducible. One problem per issue.

### Feature

Use this when the extension cannot do something you need, or the current flow is awkward.

1. Search [existing issues](https://github.com/MasteryHub-ITS/affine-vscode/issues) first.
2. Open **[Feature request](https://github.com/MasteryHub-ITS/affine-vscode/issues/new?template=feature_request.yml)**.
3. Describe the **user problem** first, then a proposal. UI sketches are welcome. Implementation detail is optional.
4. Say where it belongs if you know (sidebar, Pages tree, preview, sync / move / trash, sign-in).

For anything larger than a small fix, wait for a maintainer to agree on shape before you write a lot of code.

### What not to file here

- **AFFiNE server or web app bugs** — file those upstream, not against this client.
- **Security issues** (token leaks, auth bypass, injection) — follow [SECURITY.md](./SECURITY.md). Email **contact@masteryhub-its.com** or use [private vulnerability reporting](https://github.com/MasteryHub-ITS/affine-vscode/security/advisories/new). Do not paste live tokens.

## Submit a pull request

Docs typos and tiny fixes can go straight to a PR. For behavior changes, [open an issue](https://github.com/MasteryHub-ITS/affine-vscode/issues/new/choose) first so we can agree on the approach.

### 1. Fork and branch

```bash
git clone https://github.com/<your-account>/affine-vscode.git
cd affine-vscode
git remote add upstream https://github.com/MasteryHub-ITS/affine-vscode.git
git checkout -b feat/short-description
```

If you have write access, skip the fork and branch from `main` in this repo.

Branch prefixes: `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`.

You need **Node 20+** (`node -v`).

```bash
npm install
npm run validate
```

Press **F5** in VS Code or Cursor to launch the Extension Development Host and try the real sidebar.

### 2. Write the change

Read [CODE_STANDARDS.md](./CODE_STANDARDS.md) before you edit code.

- New behavior and bug fixes: add or extend a `*.spec.ts`, watch it **fail**, then write the minimum production code.
- Keep VS Code / Cursor APIs in `src/vscode/`. Put parse, HTTP, and HTML logic in plain modules so Jest can run it.
- Named types only — no inline object types on parameters or returns.
- Do not add `Co-authored-by` lines for Cursor, Copilot, or other agents. Human authors only.
- No secrets, cookies, access tokens, or `.env` files in the diff.

Useful contributions include bugs against real workspaces, preview fidelity, tests, docs, accessibility, and features that stay in the editor without embedding the AFFiNE web app.

### 3. Check locally

```bash
npm run validate
```

That runs type-check, ESLint, Prettier, and tests. GitHub Actions runs the same on every pull request, plus compile.

If the change is user-facing, update [README.md](./README.md) and [FEATURES.md](./FEATURES.md). Maintainers update [CHANGELOG.md](./CHANGELOG.md) when a version ships.

### 4. Open the PR

1. Push your branch to your fork (or to this repo if you have write access).
2. Open a pull request against **`main`**: [compare](https://github.com/MasteryHub-ITS/affine-vscode/compare).
3. Fill in the PR template (summary, test plan, checklist).
4. Title the PR like a conventional commit: `feat: …`, `fix: …`, `docs: …`.
5. Keep the PR focused. Separate refactors from behavior changes.

### Pull request checklist

- [ ] Title uses a conventional commit (`feat:`, `fix:`, `docs:`, …)
- [ ] `npm run validate` passes locally
- [ ] New behavior has a `*.spec.ts` that failed before the implementation
- [ ] No secrets, cookies, or access tokens in the diff
- [ ] User-facing changes update the README and FEATURES.md
- [ ] UI changes were tried in the Extension Development Host (**F5**)

### After you open it

A maintainer will review types, tests, and whether VS Code APIs stayed in `src/vscode/`. CI must stay green. You may be asked for changes; push more commits to the same branch.

Once merged, maintainers ship a `.vsix` on GitHub Releases when they cut a version. Publishing to the Visual Studio Marketplace and Open VSX comes later.

## If you just want to use it

Install the `.vsix` from [Releases](https://github.com/MasteryHub-ITS/affine-vscode/releases) (see [README](./README.md)). Star the repo if it saves you time — that is how other self-hosted teams find it.

## Releases (maintainers)

Bump `package.json` version, update [CHANGELOG.md](./CHANGELOG.md), run `npm run package`, and attach the `.vsix` to a GitHub Release.

## Plane plugin

When `plane-vscode` exists, copy this file (with repo URLs), [CODE_STANDARDS.md](./CODE_STANDARDS.md), `.github/` templates and workflows, and the same ESLint / Prettier / `tsconfig` strictness. Keep one contribution experience across both plugins.
