import { describe, it, expect, vi } from "vitest";

// dark-theme.ts calls window.matchMedia at module load time (to sync with the
// system theme) — jsdom doesn't implement it, so importing that module in a
// test needs its own stub, unlike a real browser/Cockpit iframe.
vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

/**
 * Manifest of every JS/TS-importable subpath in package.json's "exports" map,
 * with the specific named exports each one must keep providing. Adding a new
 * export requires a deliberate manifest update here — that's what makes an
 * accidental rename/removal fail loudly instead of silently.
 *
 * Intentionally excludes non-module subpaths that are referenced by file path
 * rather than imported (./log-tokens.css, ./tsconfig.base.json) — those are
 * covered by the packed-artifact smoke test (#31) instead.
 */
const MANIFEST: Record<string, { importer: () => Promise<unknown>; exports: string[] }> = {
  ".": { importer: () => import("../index"), exports: [
    "initCockpitI18n", "bootstrapPlugin", "useAsyncAction", "useAutoRefresh", "useAsyncStream",
    "useConfirmAction", "usePollingFetch", "useLayout", "useAdminMode", "useKeyboardShortcuts",
    "useOperationCounter", "usePersistedSet", "useDarkMode", "useLocalStorage", "useSessionStorage",
    "useDialogState",
  ] },
  // @ts-expect-error dark-theme.ts has no import/export statements of its own
  // (side-effect only), so TS treats it as a script rather than a module here.
  "./dark-theme": { importer: () => import("../dark-theme"), exports: [] },
  "./i18n": { importer: () => import("../i18n"), exports: [
    "initCockpitI18n", "buildLocaleResources", "baseTranslations", "i18n",
  ] },
  "./bootstrap": { importer: () => import("../bootstrap"), exports: ["bootstrapPlugin"] },
  "./hooks/useAsyncAction": { importer: () => import("../hooks/useAsyncAction"), exports: ["useAsyncAction"] },
  "./hooks/useAutoRefresh": { importer: () => import("../hooks/useAutoRefresh"), exports: ["useAutoRefresh"] },
  "./hooks/useAsyncStream": { importer: () => import("../hooks/useAsyncStream"), exports: ["useAsyncStream"] },
  "./hooks/useConfirmAction": { importer: () => import("../hooks/useConfirmAction"), exports: ["useConfirmAction"] },
  "./hooks/usePollingFetch": { importer: () => import("../hooks/usePollingFetch"), exports: ["usePollingFetch"] },
  "./hooks/useAdminMode": { importer: () => import("../hooks/useAdminMode"), exports: ["useAdminMode"] },
  "./hooks/useKeyboardShortcuts": { importer: () => import("../hooks/useKeyboardShortcuts"), exports: ["useKeyboardShortcuts"] },
  "./hooks/useOperationCounter": { importer: () => import("../hooks/useOperationCounter"), exports: ["useOperationCounter"] },
  "./hooks/usePersistedSet": { importer: () => import("../hooks/usePersistedSet"), exports: ["usePersistedSet"] },
  "./hooks/useDarkMode": { importer: () => import("../hooks/useDarkMode"), exports: ["useDarkMode"] },
  "./hooks/useLayout": { importer: () => import("../hooks/useLayout"), exports: ["useLayout"] },
  "./hooks/useLocalStorage": { importer: () => import("../hooks/useLocalStorage"), exports: ["useLocalStorage"] },
  "./hooks/useSessionStorage": { importer: () => import("../hooks/useSessionStorage"), exports: ["useSessionStorage"] },
  "./hooks/useDialogState": { importer: () => import("../hooks/useDialogState"), exports: ["useDialogState"] },
  "./components": { importer: () => import("../components/index"), exports: [
    "ErrorBoundary", "ToastProvider", "useToast", "StatusBadge", "ConfirmDialog", "LogViewer",
    "HelpPopover", "PluginFooter", "CollapsibleSearch", "LayoutSelector", "Tooltip", "CodeEditor",
    "EnvEditor", "EnvTable", "ExternalLinkModal", "DiffEditor", "ExternalAddressInput", "PluginPage",
  ] },
  "./systemd": { importer: () => import("../systemd/index"), exports: [
    "getServiceStatus", "startService", "stopService", "restartService", "reloadService",
    "readFile", "writeFile", "fetchServiceLogs", "useServiceStatus", "ServiceControl", "ServiceStatusBadge",
  ] },
  "./testing": { importer: () => import("../testing/setup"), exports: [] },
  "./testing/helpers": { importer: () => import("../testing/helpers"), exports: [
    "mockProcess", "mockHttpClient", "mockCockpitFile", "mockCockpitPermission", "mockCockpitUser",
  ] },
  // The four entries below are plain JS with no declaration file (not part of
  // the TS-checked source, no build step); each import() is followed by a
  // ts-expect-error to suppress the resulting "implicitly has an 'any' type".
  // @ts-expect-error see comment above
  "./eslint.config.base": { importer: () => import("../../eslint.config.base.js"), exports: ["createEslintConfig"] },
  // @ts-expect-error see comment above
  "./vitest.config.base": { importer: () => import("../../vitest.config.base.js"), exports: ["createVitestConfig"] },
  // @ts-expect-error see comment above
  "./playwright.config.base": { importer: () => import("../../playwright.config.base.js"), exports: ["createPlaywrightConfig"] },
  // @ts-expect-error see comment above
  "./esbuild.config.base": { importer: () => import("../../esbuild.config.base.js"), exports: [
    "createEsbuildConfig", "createWatchConfig", "copyPatternFlyAssets",
  ] },
  "./lib/logParser": { importer: () => import("../lib/logParser"), exports: [
    "extractJsonPayload", "colorizeJson", "TOKEN_RE", "tokenColor", "tokenWeight", "highlightMessage", "highlightWithSearch",
  ] },
  "./lib/ansi": { importer: () => import("../lib/ansi"), exports: ["stripAnsi"] },
  "./lib/bytes": { importer: () => import("../lib/bytes"), exports: ["parseHumanBytes", "formatBytes"] },
  "./lib/parseJsonOutput": { importer: () => import("../lib/parseJsonOutput"), exports: ["parseJsonOutput"] },
  "./lib/timestamp": { importer: () => import("../lib/timestamp"), exports: ["formatArchiveTimestamp"] },
  "./lib/color": { importer: () => import("../lib/color"), exports: ["hashStr", "colorForKey"] },
  "./lib/tar": { importer: () => import("../lib/tar"), exports: [
    "createTarArchive", "extractTarArchive", "listArchiveMembers", "readArchiveMember", "listTarArchives",
  ] },
  "./lib/envLint": { importer: () => import("../lib/envLint"), exports: ["lintEnvContent"] },
  "./lib/uri": { importer: () => import("../lib/uri"), exports: ["parseHostPort", "isValidPort", "buildUrl", "portToUrl"] },
  "./lib/cockpit-fs": { importer: () => import("../lib/cockpit-fs"), exports: ["readFile", "writeFile"] },
  // @ts-expect-error plain JS with no declaration file, see comment above
  "./e2e": { importer: () => import("../e2e/fixtures.js"), exports: ["test", "expect"] },
};

describe("public export contract", () => {
  for (const [subpath, { importer, exports: expected }] of Object.entries(MANIFEST)) {
    it(`"${subpath}" resolves and exports: ${expected.join(", ") || "(side-effect only)"}`, async () => {
      const mod = await importer();
      for (const name of expected) {
        expect(mod, `expected "${subpath}" to export "${name}"`).toHaveProperty(name);
      }
    });
  }
});
