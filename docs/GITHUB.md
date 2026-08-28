# Publishing this repo on GitHub

Use this once when moving off GitLab onto **[masteryhub-its](https://github.com/masteryhub-its)**. The Plane plugin can follow the same checklist.

## Create the public repo

From this directory, after the first commit:

```bash
gh repo create masteryhub-its/affine-vscode-extension \
  --public \
  --source=. \
  --remote=origin \
  --description "MasteryHub ITS client for AFFiNE — browse, preview, move, and trash pages on self-hosted AFFiNE or AFFiNE Cloud." \
  --push
```

If `origin` already exists, create the empty repo in the org UI, then:

```bash
git remote add origin https://github.com/masteryhub-its/affine-vscode-extension.git
git push -u origin main
```

## Topics (helps stars and search)

On the repo **About** panel, add:

`vscode` `vscode-extension` `cursor` `affine` `yjs` `self-hosted` `notes` `wiki`

Tick **Releases**, **Issues**, and **Packages** as you use them. Turn on **Private vulnerability reporting** (Settings → Code security).

## Branch protection

On `main`: require the **CI** check, require a pull request for everyone except emergencies, and do not allow skipping status checks.

## After the first push

1. Star the repo from the org or your user account (empty-star projects look abandoned).
2. Pin it on the [org profile](https://github.com/masteryhub-its) if it should be the public face of the editor plugins.
3. Create a GitHub Release for `0.2.0` and attach `affine-0.2.0.vsix`.
4. Copy this folder’s `.github/`, `CODE_STANDARDS.md`, and `CONTRIBUTING.md` into `plane-vscode-extension` when that repo starts.

## Optional later

- Open VSX and VS Marketplace publisher `masteryhub-its`
- GitHub Discussions for Q&A (keep Issues for bugs/features)
- Org community files in [masteryhub-its/.github](https://github.com/masteryhub-its/.github) so CoC / security defaults apply to every public repo
