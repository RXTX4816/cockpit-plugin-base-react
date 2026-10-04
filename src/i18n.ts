import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import baseAr from "./i18n/locales/ar.json";
import baseCs from "./i18n/locales/cs.json";
import baseDe from "./i18n/locales/de.json";
import baseEn from "./i18n/locales/en.json";
import baseEs from "./i18n/locales/es.json";
import baseFi from "./i18n/locales/fi.json";
import baseFr from "./i18n/locales/fr.json";
import baseHe from "./i18n/locales/he.json";
import baseId from "./i18n/locales/id.json";
import baseIt from "./i18n/locales/it.json";
import baseJa from "./i18n/locales/ja.json";
import baseKa from "./i18n/locales/ka.json";
import baseKo from "./i18n/locales/ko.json";
import baseNl from "./i18n/locales/nl.json";
import basePl from "./i18n/locales/pl.json";
import basePtBR from "./i18n/locales/pt-BR.json";
import baseRo from "./i18n/locales/ro.json";
import baseRu from "./i18n/locales/ru.json";
import baseSk from "./i18n/locales/sk.json";
import baseSv from "./i18n/locales/sv.json";
import baseTr from "./i18n/locales/tr.json";
import baseUk from "./i18n/locales/uk.json";
import baseZhCN from "./i18n/locales/zh-CN.json";
import baseZhTW from "./i18n/locales/zh-TW.json";

/**
 * i18next `resources` map keyed by locale (e.g. `"en"`, `"de"`), each with a
 * `translation` namespace object. Pass this to {@link initCockpitI18n}.
 */
export type LocaleResources = Record<string, { translation: Record<string, unknown> }>;

/**
 * Translations for shared base components in every supported locale
 * (`ErrorBoundary`, `LogViewer`, `ExternalLinkModal`, `ConfirmDialog`, `ServiceControl`, ...).
 *
 * Merge them under your own strings with {@link withBaseTranslations} so consumers only
 * need to define strings for their own plugin-specific UI.
 *
 * Even without spreading this in, shared components still render sensible English
 * defaults — every base string lookup supplies its own fallback — so adopting this
 * is an enhancement (real translations for non-English locales), not a requirement.
 */
export const baseTranslations: Record<string, Record<string, unknown>> = {
  ar: baseAr,
  cs: baseCs,
  de: baseDe,
  en: baseEn,
  es: baseEs,
  fi: baseFi,
  fr: baseFr,
  he: baseHe,
  id: baseId,
  it: baseIt,
  ja: baseJa,
  ka: baseKa,
  ko: baseKo,
  nl: baseNl,
  pl: basePl,
  "pt-BR": basePtBR,
  ro: baseRo,
  ru: baseRu,
  sk: baseSk,
  sv: baseSv,
  tr: baseTr,
  uk: baseUk,
  "zh-CN": baseZhCN,
  "zh-TW": baseZhTW,
};

type Tree = Record<string, unknown>;

function deepMerge(base: Tree, own: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(own)) {
    const b = out[k];
    out[k] = v && typeof v === "object" && b && typeof b === "object"
      ? deepMerge(b as Tree, v as Tree)
      : v;
  }
  return out;
}

/**
 * Deep-merges {@link baseTranslations} under each of your locales, so shared
 * components are translated too. Your strings win on collision, and sections you
 * share with the base (e.g. `common`) are merged key by key rather than replaced.
 *
 * @example
 * ```ts
 * initCockpitI18n(buildLocaleResources(withBaseTranslations({ en, de })));
 * ```
 */
export function withBaseTranslations(locales: Record<string, Tree>): Record<string, Tree> {
  return Object.fromEntries(
    Object.entries(locales).map(([code, own]) => [code, deepMerge(baseTranslations[code] ?? {}, own)]),
  );
}

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
