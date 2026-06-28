## Summary

<!-- Describe what this PR does and why. Link to the relevant issue if applicable. -->

Closes #

---

## Type of change

- [ ] Bug fix
- [ ] New feature / enhancement
- [ ] Refactor (no behaviour change)
- [ ] Documentation update
- [ ] CI/CD / workflow change
- [ ] Dependency update
- [ ] Release / publishing

---

## Cross-repo impact

This repository is a shared base library consumed by `cockpit-compose` and `cockpit-caddy`. Please assess any impact before merging.

| Area | Impact | Notes |
|------|--------|-------|
| Exported API (`src/index.ts`, `package.json` exports) | None / Breaking / Additive | |
| Shared tooling config (`tsconfig`, `eslint`, `vitest`, `playwright`) | None / Breaking / Additive | |
| Reusable CI workflows (`.github/workflows/`) | None / Breaking / Additive | |
| Testing helpers (`mockCockpit`, `mockHttpClient`, `e2e`) | None / Breaking / Additive | |

**Does this require a coordinated change in `cockpit-compose` or `cockpit-caddy`?**
- [ ] No
- [ ] Yes — linked follow-up issue(s): <!-- list issue links -->

---

## Testing

- [ ] Unit tests pass (`npm test`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] E2E / VM tests verified (if applicable)
- [ ] Manually tested against a live Cockpit instance (if applicable)

---

## Security

- [ ] This change does not introduce new dependencies.
- [ ] New dependencies have been reviewed for known vulnerabilities.
- [ ] No secrets, tokens, or credentials are present in this diff.
- [ ] Workflow changes do not expose new secrets or elevated permissions unnecessarily.

---

## Docs & follow-up

- [ ] README or wiki updated (if user-facing behaviour changed)
- [ ] Changelog / release notes covered by conventional commit messages
- [ ] Follow-up issues opened for any deferred work
