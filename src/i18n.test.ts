import { describe, it, expect } from "vitest";
import { buildLocaleResources } from "./i18n";

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
