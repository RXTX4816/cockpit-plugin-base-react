import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import baseEn from "./i18n/locales/en.json";
import baseDe from "./i18n/locales/de.json";
import basePl from "./i18n/locales/pl.json";

/**
 * i18next `resources` map keyed by locale (e.g. `"en"`, `"de"`), each with a
 * `translation` namespace object. Pass this to {@link initCockpitI18n}.
 */
export type LocaleResources = Record<string, { translation: Record<string, unknown> }>;

/**
 * English, German, and Polish translations for shared base components
 * (`ErrorBoundary`, `LogViewer`, `ExternalLinkModal`, `ConfirmDialog`, `ServiceControl`, ...).
 *
 * Spread into your own resources before passing them to {@link initCockpitI18n} so
 * consumers only need to define strings for their own plugin-specific UI:
 *
 * @example
 * ```ts
 * initCockpitI18n({
 *   en: { translation: { ...baseTranslations.en, ...myEn } },
 *   de: { translation: { ...baseTranslations.de, ...myDe } },
 * });
 * ```
 *
 * Even without spreading this in, shared components still render sensible English
 * defaults — every base string lookup supplies its own fallback — so adopting this
 * is an enhancement (real translations for non-English locales), not a requirement.
 */
export const baseTranslations: Record<string, Record<string, unknown>> = {
  en: baseEn,
  de: baseDe,
  pl: basePl,
};

/**
 * Wraps a plain `{ locale: translationObject }` map in the `{ translation: X }`
 * shape {@link initCockpitI18n} expects, so consumers don't hand-wrap every locale.
 *
 * @example
 * ```ts
 * initCockpitI18n(buildLocaleResources({ en, de }));
 * ```
 */
export function buildLocaleResources(locales: Record<string, Record<string, unknown>>): LocaleResources {
  return Object.fromEntries(
    Object.entries(locales).map(([code, translation]) => [code, { translation }]),
  );
}

// Reads Cockpit's language setting in priority order:
// 1. document.documentElement.lang — Cockpit sets this live when the user changes language
// 2. localStorage["cockpit:language"] — Cockpit mirrors the preference here
// 3. Falls back to "en" via fallbackLng
const cockpitDetector = {
  name: "cockpit",
  detect(): string | undefined {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return htmlLang;
    try {
      const stored = localStorage.getItem("cockpit:language");
      if (stored) return stored;
    } catch {
      // localStorage may be unavailable in restricted contexts
    }
    return undefined;
  },
  cacheUserLanguage() {
    // Language is owned by Cockpit settings — never write back
  },
};

/**
 * Initialises i18next with Cockpit's active locale and sets up a live observer
 * so the UI re-translates when the user switches language in Cockpit settings.
 *
 * Call once at plugin startup, before {@link bootstrapPlugin}.
 *
 * @param resources - Translation resources keyed by locale. See {@link LocaleResources}.
 */
export function initCockpitI18n(resources: LocaleResources): void {
  void i18n
    .use({ type: "languageDetector", ...cockpitDetector } as Parameters<typeof i18n.use>[0])
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      load: "all",
      interpolation: {
        escapeValue: false,
      },
    });

  // Cockpit updates document.documentElement.lang when the user switches language at runtime.
  // i18next only detects on init, so we observe the attribute and sync the change.
  new MutationObserver(() => {
    const lang = document.documentElement.lang;
    if (lang && lang !== i18n.language) {
      void i18n.changeLanguage(lang);
    }
  }).observe(document.documentElement, { attributeFilter: ["lang"] });
}

export { i18n };
