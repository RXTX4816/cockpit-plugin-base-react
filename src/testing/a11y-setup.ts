// Internal-only setup for this repo's own accessibility tests. Not exported via
// package.json — consumers don't need axe-core pulled into their test runs.
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// @types/jest-axe only augments jest's global Matchers. Vitest 4 bridged those into
// its own assertion type; Vitest 5 no longer does, so declare the matcher on
// Vitest's Matchers interface directly.
declare module "vitest" {
  // Type parameters must match Vitest's declaration exactly, T included.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoViolations(): R;
  }
}
