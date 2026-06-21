# Testing

## Setup

The package ships a Vitest setup file that configures jsdom and installs jest-dom matchers. Reference it from your plugin's `vitest.config.ts` (handled automatically when you extend the base config):

```ts
import { defineConfig } from "@rxtx4816/cockpit-plugin-base-react/vitest.config.base";
export default defineConfig();
```

---

## Test utilities

```ts
import { mockCockpit, mockHttpClient } from "@rxtx4816/cockpit-plugin-base-react/testing/helpers";
```

### mockCockpit

Returns an in-memory mock of the `cockpit` browser global. Stubs out `cockpit.spawn`, `cockpit.file`, `cockpit.http`, and channel creation so tests never attempt real system calls.

Set it up in your test file:

```ts
beforeEach(() => {
  vi.stubGlobal("cockpit", mockCockpit());
});
```

Individual spawn calls can be configured to return specific output or to reject, letting you test both success and error paths.

### mockHttpClient

Returns a mock of the Cockpit HTTP client with configurable per-path responses. Useful for testing components that call `cockpit.http().get(path)`.

```ts
const client = mockHttpClient({ "/api/status": '{"running": true}' });
```

`get`, `post`, and `request` are all `vi.fn()` instances, so you can assert call counts and arguments with standard Vitest matchers.

---

## Running tests

```bash
npm test          # single run
npm run test:watch  # watch mode
```
