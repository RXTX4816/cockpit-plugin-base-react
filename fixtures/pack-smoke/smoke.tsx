// Smoke-tests the packed npm tarball (not source) — mirrors src/__contract__/
// exports.test.ts's manifest, but proves the actual published "files"/"exports"
// combination resolves both at runtime (this script) and for types
// (tsc --noEmit against this same file, run separately).
import * as root from "@rxtx4816/cockpit-plugin-base-react";
import * as i18n from "@rxtx4816/cockpit-plugin-base-react/i18n";
import * as components from "@rxtx4816/cockpit-plugin-base-react/components";
import * as systemd from "@rxtx4816/cockpit-plugin-base-react/systemd";
import * as useAsyncAction from "@rxtx4816/cockpit-plugin-base-react/hooks/useAsyncAction";
import * as testingHelpers from "@rxtx4816/cockpit-plugin-base-react/testing/helpers";
// Note: "./dark-theme" is intentionally not executed here — it touches
// window/document at module load time (it's meant to run inside a real
// browser/Cockpit iframe), so it can't run under plain Node regardless of
// whether packaging is correct. Its subpath is still resolved and type-
// checked via type-check-only.ts (never executed, tsc --noEmit only).

const checks: Array<[string, Record<string, unknown>, string[]]> = [
  ["root", root, ["initCockpitI18n", "bootstrapPlugin", "useAsyncAction"]],
  ["i18n", i18n, ["initCockpitI18n", "buildLocaleResources", "baseTranslations"]],
  ["components", components, ["ErrorBoundary", "ToastProvider", "ConfirmDialog", "PluginPage"]],
  ["systemd", systemd, ["ServiceControl", "ServiceStatusBadge", "useServiceStatus"]],
  ["hooks/useAsyncAction", useAsyncAction, ["useAsyncAction"]],
  ["testing/helpers", testingHelpers, ["mockProcess", "mockHttpClient"]],
];

let failed = false;
for (const [label, mod, expected] of checks) {
  for (const name of expected) {
    if (!(name in mod)) {
      console.error(`FAIL: "${label}" is missing expected export "${name}"`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log(`Pack smoke test passed: ${checks.length} subpaths resolved with all expected exports present.`);
