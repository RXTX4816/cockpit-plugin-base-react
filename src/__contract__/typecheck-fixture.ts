// Not a test — a fixture that imports every public subpath so `npm run
// typecheck` (which already includes all of src/**/*) catches type-level
// export breakage too, separate from exports.test.ts's runtime import checks.
// Adding/removing a public export should touch this file and that manifest.

export * as root from "../index";
import "../dark-theme"; // side-effect only module, no exports
export * as i18n from "../i18n";
export * as bootstrap from "../bootstrap";
export * as useAsyncAction from "../hooks/useAsyncAction";
export * as useAutoRefresh from "../hooks/useAutoRefresh";
export * as useAsyncStream from "../hooks/useAsyncStream";
export * as useConfirmAction from "../hooks/useConfirmAction";
export * as usePollingFetch from "../hooks/usePollingFetch";
export * as useAdminMode from "../hooks/useAdminMode";
export * as useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
export * as useOperationCounter from "../hooks/useOperationCounter";
export * as usePersistedSet from "../hooks/usePersistedSet";
export * as useDarkMode from "../hooks/useDarkMode";
export * as useLayout from "../hooks/useLayout";
export * as useLocalStorage from "../hooks/useLocalStorage";
export * as useSessionStorage from "../hooks/useSessionStorage";
export * as useDialogState from "../hooks/useDialogState";
export * as components from "../components/index";
export * as systemd from "../systemd/index";
export * as testingHelpers from "../testing/helpers";
export * as libLogParser from "../lib/logParser";
export * as libAnsi from "../lib/ansi";
export * as libBytes from "../lib/bytes";
export * as libParseJsonOutput from "../lib/parseJsonOutput";
export * as libTimestamp from "../lib/timestamp";
export * as libColor from "../lib/color";
export * as libTar from "../lib/tar";
export * as libEnvLint from "../lib/envLint";
export * as libUri from "../lib/uri";
export * as libCockpitFs from "../lib/cockpit-fs";
