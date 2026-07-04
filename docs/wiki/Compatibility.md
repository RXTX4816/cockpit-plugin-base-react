# Compatibility

Tracks which versions of `cockpit-plugin-base-react`, `cockpit-compose`, and `cockpit-caddy` are expected to work together, and what to do when a base change requires a coordinated consumer update.

## Compatibility matrix

| Base version | `cockpit-compose` | `cockpit-caddy` | Status | Notes |
|---|---|---|---|---|
| `v1.0.15` (current) | `v0.10.3` | `v0.4.0` | ✅ Supported | Current state of all three `main` branches as of this writing. Both consumers pin base as an exact devDependency version (`1.0.15`, no `^`/`~` range) — bumping requires an explicit PR in each consumer, not an automatic `npm update`. |

Base's own `package.json` `"version"` field reads `0.0.0` — this is expected, not a bug. `semantic-release-plugin.yml` manages the real released version via git tags (`v1.0.15` etc.) and npm publishes; the committed `package.json` field isn't kept in sync with it.

Add a new row here whenever a base release changes what either consumer needs (a new minimum version, a newly-required migration step, etc.) — not for every patch release.

## Status legend

- ✅ **Supported** — known to work together, verified by `downstream-check.yml` and/or manual testing.
- ⚠️ **Deprecated** — still works, but consumers should move off it; a newer combination is recommended.
- ❌ **Incompatible** — known not to work together (e.g. a consumer hasn't yet adopted a breaking base change).

## Upgrade policy

**When does a base change require a coordinated consumer update?**

- Any change classified as breaking in the [export audit](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/26) (once it lands), or any change to the `"exports"` map that removes or renames a subpath/export.
- Any change [`downstream-check.yml`](CI-CD.md#internal-workflows-base-repo-only) flags as failing against a consumer's current `main`.
- Any change to a shared component's prop contract that a consumer's code currently relies on.

**How coordinated changes are handled today:**

1. `downstream-check.yml` runs on every base PR that touches source, packing the change and test-building it against both consumers' current `main`. A failing run there is the primary signal that a change isn't backward compatible.
2. When a base change is intentionally breaking, prepare (but don't merge) the corresponding consumer-side fix as a draft PR alongside the base PR — this repo's recent i18n work (`buildLocaleResources`, `ServiceControl`/`ServiceStatusBadge` i18n defaults) followed this pattern: draft PRs in both consumer repos, explicitly marked blocked until a new base version is published and their pin is bumped.
3. Publish the new base version, then un-draft and merge the consumer PRs, bumping their pinned version in the same change.
4. Update this page's matrix table with the new row.

**What consumers should check before upgrading their pinned base version:**

- Read the base release's notes/changelog (from conventional commit messages via `semantic-release-plugin.yml`) for anything marked `BREAKING CHANGE`.
- Re-run `npm run typecheck` and `npm run build` locally against the new version before committing the bump — `downstream-check.yml` does this automatically against `main`, but a consumer's own feature branches won't be covered by it.
- See the [Getting Started](Getting-Started.md) guide for the `yalc`-based local-linking workflow to test an unreleased base change before it's published.
