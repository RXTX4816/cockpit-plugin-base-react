# Architecture Decision Records

This directory records significant scope and architecture decisions for `cockpit-plugin-base-react` — the kind of question that otherwise gets re-litigated from scratch every time it comes up (what belongs in base vs. a consumer repo, what's public API vs. internal tooling, etc.).

## Format

Plain numbered Markdown files, `NNNN-short-title.md`, in this directory. No tooling, no special CLI — just files reviewed like any other PR. Each one follows this shape:

```md
# NNNN. Title

## Status

Proposed | Accepted | Superseded by NNNN

## Context

What prompted this decision — the question, tension, or recurring point of confusion.

## Decision

What was decided, stated plainly.

## Consequences

What this makes easier or harder going forward. Include things given up, not just things gained.
```

## When to write one

- A recurring "does X belong in base or a consumer repo?" question gets asked more than once.
- A decision about what counts as public/stable API vs. internal/experimental.
- Any other structural decision a future contributor would otherwise have to reverse-engineer from git history.

Not every PR needs one — most changes are just changes. Write an ADR when the *reasoning* behind a decision is worth preserving independently of the code that implements it.

## Proposing a new ADR

Open a PR adding `NNNN-title.md` (next sequential number, zero-padded to 4 digits) with status `Proposed`. Once merged, it's `Accepted` by default — update the status line in the same PR once you're confident, or in a quick follow-up. If a later ADR reverses an earlier one, don't delete the old file — mark it `Superseded by NNNN` and explain why in the new one's `Context`.
