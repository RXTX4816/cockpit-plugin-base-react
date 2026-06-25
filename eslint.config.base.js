import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Globals shared by all Cockpit plugins.
// Pass extraGlobals to add plugin-specific names (e.g. CockpitHttpClient for caddy).
const BASE_GLOBALS = {
  console: "readonly",
  document: "readonly",
  window: "readonly",
  Window: "readonly",
  Element: "readonly",
  HTMLElement: "readonly",
  HTMLDivElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLTextAreaElement: "readonly",
  HTMLButtonElement: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  localStorage: "readonly",
  Event: "readonly",
  CustomEvent: "readonly",
  Promise: "readonly",
  queueMicrotask: "readonly",
  MutationObserver: "readonly",
  URL: "readonly",
  navigator: "readonly",
  Blob: "readonly",
  KeyboardEvent: "readonly",
  StorageEvent: "readonly",
  MessageEvent: "readonly",
  sessionStorage: "readonly",
  performance: "readonly",
  HTMLPreElement: "readonly",
  HTMLTableSectionElement: "readonly",
  requestAnimationFrame: "readonly",
  Node: "readonly",
  PointerEvent: "readonly",
  MouseEvent: "readonly",
  cockpit: "readonly",
  CockpitProcess: "readonly",
  CockpitChannel: "readonly",
  CockpitHttpClient: "readonly",
  CockpitUser: "readonly",
  CockpitPermission: "readonly",
  CockpitLocation: "readonly",
  CockpitTransport: "readonly",
  CockpitDBusProxy: "readonly",
  CockpitDBusClient: "readonly",
};

/**
 * @param {Record<string, "readonly" | "writable">} extraGlobals
 * @returns {import("eslint").Linter.Config[]}
 */
export function createEslintConfig(extraGlobals = {}) {
  return [
    {
      ignores: ["src/main.js", "src/main.css"],
    },
    eslint.configs.recommended,
    {
      files: ["src/**/*.{ts,tsx}"],
      languageOptions: {
        parser: tsparser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          ecmaFeatures: { jsx: true },
        },
        globals: { ...BASE_GLOBALS, ...extraGlobals },
      },
      plugins: {
        "@typescript-eslint": tseslint,
        react,
        "react-hooks": reactHooks,
      },
      rules: {
        ...tseslint.configs.recommended.rules,
        ...react.configs.recommended.rules,
        ...reactHooks.configs.recommended.rules,
        "react/react-in-jsx-scope": "off",
        "react-hooks/set-state-in-effect": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      },
      settings: { react: { version: "detect" } },
    },
    {
      files: ["src/e2e/**/*.{ts,tsx}"],
      languageOptions: {
        globals: { process: "readonly" },
      },
      rules: {
        "react-hooks/rules-of-hooks": "off",
      },
    },
  ];
}
