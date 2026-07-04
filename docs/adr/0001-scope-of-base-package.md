# 0001. Scope of the base package

## Status

Accepted

## Context

`cockpit-plugin-base-react` started as an extraction from `cockpit-compose`, and `cockpit-caddy` was built against it from early on. Both consumers now pull in a broad surface: UI components, hooks, systemd integration, shared tooling config (`tsconfig`, `eslint`, `vitest`, `playwright`, `esbuild`), a testing harness, and reusable CI/CD workflows.

As migration continued, the same questions kept coming up without a written answer:

- Does this new piece of code belong in base, or is it specific enough to one consumer that it should stay local?
- Is a given export part of the supported public API, or internal tooling that happens to live in the same repo?
- Is "only one consumer currently uses this" a problem, or an expected state for a shared library?

The [export audit](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/26) ([findings](../wiki/Export-Audit.md)) answered the third question empirically: `EnvEditor`/`EnvTable` (compose-only), `lib/tar` and `systemd/*` (caddy-only), and similar single-consumer exports are all genuinely generic — they just don't happen to be needed by both apps yet. That's a healthy, expected state, not scope creep. This ADR writes down the reasoning behind that conclusion, and the boundary it implies, so it doesn't need re-deriving next time.

## Decision

**What belongs in base:** anything reusable across more than one Cockpit plugin *in principle*, even if only one consumer currently uses it — UI primitives, hooks, systemd integration, i18n plumbing, shared tooling config, testing helpers, and reusable CI/CD workflows. The test for "does this belong in base" is not "do both consumers use it today" but "would a hypothetical third Cockpit plugin plausibly want this without modification."

**What stays in a consumer repo:** business logic specific to that plugin's domain — compose-file parsing and container orchestration (`cockpit-compose`), Caddy-config generation and reverse-proxy semantics (`cockpit-caddy`). Also anything a consumer customizes with domain-specific wording or validation, even when it's built *on top of* a generic base primitive (e.g. each consumer's own translated `labels` for `ServiceControl`, or caddy's own confirm-dialog copy).

**Public API vs. internal tooling:** the `"exports"` map in `package.json` is the actual contract — if it's not listed there, it's not public API, regardless of whether it happens to be importable via a raw file path. Within `"exports"`, most subpaths ship real consumer-facing functionality (components, hooks, `systemd/*`, `i18n`, `testing`). A few are maintenance tooling that happens to be published alongside it rather than genuinely part of the "build a plugin" experience: `scripts/i18n-coverage.mjs` (published as the `cockpit-i18n-check` bin) and `scripts/test-vm.sh` (`cockpit-test-vm`) are project-maintenance scripts, not something a plugin's own code imports.

**A caught exception, not yet a broken rule:** the [export audit](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/26) also found `ExternalAddressInput`'s hardcoded HTTP/H2/H3 scheme list ([#84](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/84)) — a component that's structurally generic (lives in `src/components/`, no consumer-specific imports) but has a genuinely domain-specific assumption baked into its defaults. The audit didn't relocate it, because "generic location, domain-specific default value" is a narrower, more fixable problem than "this doesn't belong in base at all" — the fix is making the default overridable, not moving the file. This ADR's scope test is about *location*, not about every default value inside an otherwise-correctly-placed file being perfectly generic.

## Consequences

- Adding an export to base doesn't require proving both consumers need it immediately — "generic in principle, adopted by one consumer so far" is an acceptable, expected PR to merge.
- Cross-referenced by [#26](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/26) (export audit — the empirical check behind this decision), [#29](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/29) (fixed the `"types"` field to point at the real public entrypoint, `src/index.ts`, rather than the ambient `cockpit.d.ts` globals — a concrete instance of "the `exports` map is the contract" from this ADR), and [#33](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/33) (the [compatibility matrix](../wiki/Compatibility.md), which depends on base's public surface being well-defined enough to reason about what's a breaking change).
- New export PRs should ask "would a third plugin want this unmodified," not "do both current consumers use it" — the latter test would have wrongly flagged `lib/tar`, `systemd/*`, and `EnvEditor`/`EnvTable` as candidates for relocation, when the audit found all of them genuinely reusable.
- Doesn't resolve every case by itself — `ExternalAddressInput`'s scheme list ([#84](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/84)) and `lib/uri.ts` being unused anywhere ([#85](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/85)) still needed individual judgment calls beyond this ADR's location-based test.
