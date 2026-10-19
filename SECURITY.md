# Security policy

## Supported versions

We support the latest release on `main`. Older `.vsix` builds are not patched.

## Report a vulnerability

Do **not** open a public issue for security problems (token leaks, auth bypass, injection, unsafe sync writes).

1. Email **contact@masteryhub-its.com**, or
2. Use [GitHub private vulnerability reporting](https://github.com/masteryhub-its/affine-vscode-extension/security/advisories/new) once the repo is public.

Include the extension version, editor (VS Code / Cursor), and steps to reproduce. We will acknowledge receipt and work on a fix before any public disclosure.

Please do not attach live access tokens. Rotate anything that may already have leaked.

## Design notes

- Credentials are stored in editor Secret Storage, bound to `affine.serverUrl`. The server URL is a user-level setting; workspace settings cannot redirect your credentials, and a settings change does not delete them.
- Requests have a timeout. Sign-in never retries.
- Webviews use a strict content security policy with nonce scripts. Page content is rebuilt from a typed model and escaped, never inserted as raw HTML.
- Writes are Yjs updates computed against the current document, so they merge with concurrent edits. Multi-step writes report which step failed.
- If the server still supports access tokens, password sign-in creates one named "VS Code · AFFiNE". It is not revoked automatically; revoke it in AFFiNE settings after signing out.
- Runtime dependencies are audited in CI (`npm audit --omit=dev`).
