# CI/CD Workflows

The package ships reusable GitHub Actions workflows that plugins call with `uses:`. This keeps CI logic in one place and lets all plugins inherit fixes and improvements automatically.

## Using the workflows

In your plugin's `.github/workflows/`:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: RXTX4816/cockpit-plugin-base-react/.github/workflows/ci-plugin.yml@main
    with:
      plugin-name: cockpit-caddy
```

---

## Available workflows

### ci-plugin.yml

Runs on every push and pull request. Steps: lint → typecheck → test → build → verify build output.

Required inputs:
- `plugin-name` — used to verify `src/main.js` and `src/main.css` exist after build

### pkg-ci-plugin.yml

Builds and verifies RPM, DEB, and Arch packages using a placeholder `0.0.0` version. Confirms that the packaging definitions (`.spec`, `debian/`, `PKGBUILD`) are valid before a real release.

Required inputs:
- `plugin-name`
- `spec-file` — path to the RPM spec file (e.g. `cockpit-caddy.spec`)
- `aur-pkgname` — AUR package name

### semantic-release-plugin.yml

Determines the next version from conventional commits since the last git tag and creates the tag. Does not build or publish anything — it only tags. The tag then triggers whatever release workflow you have listening on `push.tags`.

Version bump rules:
- `BREAKING CHANGE` anywhere in a commit body → major
- `feat:` prefix → minor
- anything else → patch
- no commits since last tag → skip (exits 0, no tag created)

Required secrets:
- `RELEASE_TOKEN` — a GitHub token with `contents: write` permission

Optional inputs:
- `initial_version` — version to use when no prior tag exists (default: `v1.0.0`)

### release-plugin.yml

Builds release assets (tarball + sha256, RPM, DEB) and uploads them to a GitHub release. Also updates the `PKGBUILD` and pushes to AUR.

Required inputs:
- `plugin-name`, `spec-file`, `aur-pkgname`
- `maintainer-name`, `maintainer-email`

Required secrets:
- `AUR_SSH_KEY` — SSH private key registered with the AUR account
- `RELEASE_TOKEN` — GitHub token with `contents: write`

### sync-wiki-plugin.yml

Copies all `.md` files from `docs/wiki/` in your plugin repo to the GitHub Wiki. Triggered by push to main.

No inputs or secrets required beyond the default `GITHUB_TOKEN`.

---

## Release checklist (base package)

Until export/pack contract tests exist to automate this ([#30](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/30), [#31](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/31)), manually verify type resolution before publishing:

- [ ] Root import (`import { ... } from "@rxtx4816/cockpit-plugin-base-react"`) resolves correctly in `tsc --noEmit` and in-editor, in a consumer project (e.g. `cockpit-caddy`/`cockpit-compose` linked locally via `yalc`).

---

## Secrets reference

| Secret | Used by | Description |
|---|---|---|
| `RELEASE_TOKEN` | semantic-release, release | GitHub PAT with `contents: write` |
| `AUR_SSH_KEY` | release | SSH private key for AUR pushes |
| `NPM_TOKEN` | (base package only) | npm automation token for publishing |
