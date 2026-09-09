# GitHub repo notes

Public repo: **[masteryhub-its/affine-vscode-extension](https://github.com/masteryhub-its/affine-vscode-extension)** (`origin` → `main`). The sibling Plane client is [plane-vscode-extension](https://github.com/masteryhub-its/plane-vscode-extension).

This file is ops memory, not a marketplace how-to.

## Already done

- Public GitHub repo, MIT, CI on push/PR (`npm run validate` + compile)
- Topics: `vscode` `vscode-extension` `cursor` `affine` `yjs` `self-hosted` `notes` `wiki`
- Issue templates, PR template, Code of Conduct, SECURITY.md

## Remaining (not marketplace)

1. Star / pin on the [org profile](https://github.com/masteryhub-its) if this should stay a public face of the editor plugins.
2. Turn on **Private vulnerability reporting** (Settings → Code security) if it is still off.
3. On `main`: require the **CI** check; do not allow skipping status checks.
4. Sideload releases: tag `v<version>`, run `npm run package`, attach `affine-<version>.vsix` to a GitHub Release. Creating a GitHub Release also runs `.github/workflows/publish.yml`.

## Marketplace / Open VSX

Workflow is in `.github/workflows/publish.yml`. Add GitHub Actions secrets:

- `VSCE_PAT` — Azure DevOps PAT with **Marketplace (Acquire, Publish)** for publisher `MasteryHubITS`
- `OVSX_PAT` — Open VSX access token for the same publisher id

Until those secrets exist, `publish.yml` will fail on Release and people should install from the `.vsix`. Do not commit tokens. Marketplace publisher is `MasteryHubITS` (display name MasteryHub ITS). Open VSX namespace should match that id. Publish is automatic on tag.

## Optional later

- GitHub Discussions for Q&A (keep Issues for bugs/features)
- Org community files in [masteryhub-its/.github](https://github.com/masteryhub-its/.github)
