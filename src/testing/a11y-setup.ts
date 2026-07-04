// Internal-only setup for this repo's own accessibility tests. Not exported via
// package.json — consumers don't need axe-core pulled into their test runs.
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);
