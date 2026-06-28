# Security Policy

## Supported Versions

Security fixes are applied to the latest release on the `main` branch. Older versions are not actively maintained for security patches.

| Version | Supported |
|---------|-----------|
| latest  | ✅         |
| older   | ❌         |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues through one of the following channels:

1. **GitHub Private Security Advisories** (preferred): Navigate to the [Security tab](https://github.com/RXTX4816/cockpit-plugin-base-react/security/advisories/new) of this repository and open a private advisory.
2. **Email**: Send a report to the maintainer via the email associated with this account. You can find contact details on the [GitHub profile](https://github.com/RXTX4816).

### What to include

- A clear description of the vulnerability and its potential impact.
- Steps to reproduce the issue or a proof-of-concept.
- Affected versions or branches.
- Any suggested mitigations if known.

## Response Timeline

- **Acknowledgment**: Within 5 business days.
- **Status update**: Within 14 days of acknowledgment.
- **Fix or mitigation**: Depends on severity; critical issues are prioritised.

## Disclosure Policy

Once a fix is available, the vulnerability will be disclosed publicly via a GitHub Security Advisory. You will be credited in the advisory unless you prefer anonymity.

## False Positives from Push Protection

This repository has GitHub Secret Scanning and Push Protection enabled. If push protection blocks a commit that contains a test value or placeholder (not a real secret), you may bypass the block by following GitHub's [documented bypass process](https://docs.github.com/en/code-security/secret-scanning/pushing-a-branch-blocked-by-push-protection).

Document the bypass reason in `CONTRIBUTING.md` or open an issue so the false positive can be reviewed and suppressed.

## Scope

This policy applies to the `@rxtx4816/cockpit-plugin-base-react` package and its published artifacts. If you discover a vulnerability in a downstream consumer repository (`cockpit-compose`, `cockpit-caddy`), please report it to that repository directly.
