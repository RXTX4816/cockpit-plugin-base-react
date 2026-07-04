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

## Internal workflows (base repo only)

These run only in `cockpit-plugin-base-react`'s own CI — not reusable, not something plugins call with `uses:`.

### downstream-check.yml

Catches breaking base changes before they reach consumers: packs the current source tree, then checks out `cockpit-compose`'s and `cockpit-caddy`'s **default branch** (a fresh `actions/checkout` with `repository:` set — both are public repos, so the default `GITHUB_TOKEN` is sufficient, no PAT needed), overrides their pinned `@rxtx4816/cockpit-plugin-base-react` with the freshly packed tarball (`npm install <tarball> --no-save`, so it doesn't touch the consumer's own `package.json`/lockfile), and runs that consumer's own `typecheck` and `build` scripts against it.

Triggers on PRs to `main` that touch `src/**`, `package.json`, `*.config.base.js`, or `tsconfig.base.json`, and weekly on a schedule (to catch drift from changes landing in a consumer repo itself, not just a base PR).

**This intentionally uses each consumer's default branch.** An intentional breaking base change will fail this check until the consumer is updated in lockstep — that's a real cross-repo coordination signal, not a bug. There's currently no built-in way to acknowledge/skip it for a deliberate breaking change other than merging the base PR anyway and following up in the consumer repo promptly; a label-gated `continue-on-error` would be a reasonable follow-up if this becomes a recurring need.

### pack-smoke.yml / visual-regression.yml

See [Pack smoke tests](Testing.md#pack-smoke-tests) and [Visual Regression Testing](Testing.md#visual-regression-testing-internal-only).

---

## Release checklist (base package)

`src/__contract__/exports.test.ts` (runtime) and `src/__contract__/typecheck-fixture.ts` (type-level, picked up automatically by `npm run typecheck`) guard every public subpath's exports against source — see [Export contract tests](Testing.md#export-contract-tests). `npm run test:pack` (see [Pack smoke tests](Testing.md#pack-smoke-tests)) does the same thing against the actual packed npm tarball, catching `"files"` array omissions or export-path mistakes that only surface post-pack. `downstream-check.yml` (above) proves the packed tarball also builds and typechecks cleanly in both real consumers. All three run automatically in CI (path-filtered), but nothing currently gates a real `npm publish` on them — as a manual pre-publish step:

- [ ] `npm run test:pack` passes locally against the version about to be published.
- [ ] `downstream-check.yml`'s latest scheduled/PR run is green for both `cockpit-compose` and `cockpit-caddy` (or, if it's currently red due to an intentional breaking change, the consumer-side follow-up PR is ready to merge immediately after this release).

---

## Secrets reference

| Secret | Used by | Description |
|---|---|---|
| `RELEASE_TOKEN` | semantic-release, release | GitHub PAT with `contents: write` |
| `AUR_SSH_KEY` | release | SSH private key for AUR pushes |
| `NPM_TOKEN` | (base package only) | npm automation token for publishing |
