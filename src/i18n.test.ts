import { describe, it, expect } from "vitest";
import { baseTranslations, buildLocaleResources, withBaseTranslations } from "./i18n";

describe("buildLocaleResources", () => {
  it("wraps each locale's translations in a translation namespace", () => {
    const en = { greeting: "hi" };
    const de = { greeting: "hallo" };
    expect(buildLocaleResources({ en, de })).toEqual({
      en: { translation: en },
      de: { translation: de },
    });
  });

  it("returns an empty object for empty input", () => {
    expect(buildLocaleResources({})).toEqual({});
  });
});

function leaves(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).flatMap(([k, v]) =>
      v !== null && typeof v === "object"
        ? Object.entries(leaves(v as Record<string, unknown>, `${prefix}${k}.`))
        : [[`${prefix}${k}`, String(v)]],
    ),
  );
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();

describe("baseTranslations", () => {
  const en = leaves(baseTranslations.en);

  it.each(Object.keys(baseTranslations).filter(l => l !== "en"))("%s has exactly the English keys", locale => {
    expect(Object.keys(leaves(baseTranslations[locale])).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(baseTranslations).filter(l => l !== "en"))("%s keeps every {{placeholder}}", locale => {
    const tr = leaves(baseTranslations[locale]);
    for (const [key, value] of Object.entries(en)) {
      expect(placeholders(tr[key]), key).toEqual(placeholders(value));
    }
  });
});

describe("withBaseTranslations", () => {
  it("keeps base keys in sections the plugin also defines", () => {
    const merged = withBaseTranslations({ de: { common: { save: "Speichern" } } });
    expect(merged.de.common).toEqual({ ...(baseTranslations.de.common as object), save: "Speichern" });
  });

  it("lets the plugin's strings win on collision", () => {
    const merged = withBaseTranslations({ en: { common: { cancel: "Never mind" } } });
    expect((merged.en.common as Record<string, string>).cancel).toBe("Never mind");
  });

  it("passes through locales the base doesn't ship", () => {
    expect(withBaseTranslations({ xx: { a: "b" } })).toEqual({ xx: { a: "b" } });
  });
});
