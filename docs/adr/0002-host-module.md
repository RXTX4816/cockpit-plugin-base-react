# 0002. A Host module for everything a plugin does to the machine

## Status

Accepted

## Context

Both plugins reach the machine through `cockpit.spawn` and `cockpit.file` directly: about 190 call sites between them. Each call decides for itself how to escalate, which stderr mode to use, how to unwrap Cockpit's error objects (whose `message` is often empty) and how to collect output. They ended up with two different escalation policies, copies of the same "drain a process to a string" loop, and three hand-written test fakes that route spawn calls by argv. The base offered components and hooks but nothing for this, so every host-facing bug was fixed once per plugin.

## Decision

`@rxtx4816/cockpit-plugin-base-react/host` is the seam. Its interface is `Host` with three methods: `run(argv, options)`, `readFile(path)` and `writeFile(path, content)`, plus the single error type `HostError`. `getHost()` returns the one plugin code talks to.

There are two adapters, so the seam is real:

- `createCockpitHost()` runs through the `cockpit` global and normalises every failure into a `HostError`.
- `FakeHost` (`@rxtx4816/cockpit-plugin-base-react/testing/host`) holds an in-memory filesystem, the file commands plugins rely on (`test`, `cat`, `mkdir`, `rm`), routes for everything else, and a model of root-owned paths and Administrative access. A command nobody described rejects.

What stays out: a plugin's *policy* for when to escalate (compose resolves it from file ownership and Socket mode; that is domain knowledge and stays in compose). The Host takes the answer as `superuser`. Also out: the `systemctl` wrappers, which are a consumer of the Host rather than part of it.

## Consequences

- Plugins migrate one call site at a time: adoption is additive and `cockpit.spawn` keeps working beside it.
- Tests describe the machine (files, commands that fail) instead of asserting argv, which is what `cockpit-caddy`'s `dnsRollback.test.ts` and compose's `mockImplementation` routers did by hand.
- `lib/cockpit-fs` and the `systemd` `readFile`/`writeFile` become redundant and can be deprecated once the plugins have moved.
- Cancellation is part of the interface (`HostProcess.close()`), where `cockpit.spawn` left it to each caller.
