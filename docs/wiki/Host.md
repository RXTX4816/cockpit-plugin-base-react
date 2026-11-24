# Host

`@rxtx4816/cockpit-plugin-base-react/host` is how plugin code runs commands and reads or writes files on the machine Cockpit is connected to. See [ADR 0002](https://github.com/RXTX4816/cockpit-plugin-base-react/blob/main/docs/adr/0002-host-module.md) for why it exists.

```ts
import { getHost, HostError, exists, mkdirp } from "@rxtx4816/cockpit-plugin-base-react/host";

const host = getHost();

// Run a command (no shell). Resolves with stdout, rejects with a HostError.
const version = await host.run(["caddy", "version"]);

// Escalate through Cockpit's superuser bridge; keep secrets out of argv.
await host.run(["sh", "-c", "umask 077; cat > /etc/caddy/dns.env"], { superuser: "try", stdin: secrets });

// Stream while it runs; cancel it from the caller.
const proc = host.run(["journalctl", "-fu", "caddy"], { onOutput: line => append(line) });
proc.close();

// Files: a missing file reads as null.
const caddyfile = await host.readFile("/etc/caddy/Caddyfile", { superuser: "try" });
await host.writeFile("/etc/caddy/Caddyfile", next, { superuser: "try" });

try { await host.run(["caddy", "validate"]); }
catch (e) { if (e instanceof HostError) toast(e.message, e.exitStatus); }
```

`HostError.message` is never empty: it is Cockpit's message, else what the command printed, else the exit status or problem code. `exists`, `mkdirp` and `remove` are small helpers that take a `Host`.

## Testing

```ts
import { afterEach, it, expect } from "vitest";
import { resetHost } from "@rxtx4816/cockpit-plugin-base-react/host";
import { installFakeHost } from "@rxtx4816/cockpit-plugin-base-react/testing/host";

afterEach(resetHost);

it("keeps the Caddyfile when validation fails", async () => {
  const host = installFakeHost({ "/etc/caddy/Caddyfile": original });
  host.onRun(["caddy", "validate"], () => { throw new Error("bad config"); });

  await expect(save(next)).rejects.toThrow();

  expect(host.files.get("/etc/caddy/Caddyfile")).toBe(original);
});
```

`FakeHost` has an in-memory `files` map, built-in `test`, `cat`, `mkdir` and `rm`, `onRun(match, handler)` routes (last one wins; a throwing handler becomes a `HostError`), `rootOwns(prefix)` and `setAdmin(false)` for permission cases, and `calls` / `commands` to see what ran. A command with no route rejects, so a test can't pass against something it forgot to describe.
