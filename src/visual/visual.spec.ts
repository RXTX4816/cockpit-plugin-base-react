import { test, expect } from "@playwright/test";

const FULL_PAGE_VIEWS = ["confirm-dialog", "toasts"];
const ELEMENT_VIEWS = ["status-badges", "service-status-badges"];

for (const view of FULL_PAGE_VIEWS) {
  test(`${view} matches its baseline screenshot`, async ({ page }) => {
    await page.goto(`/?view=${view}`);
    if (view === "confirm-dialog") {
      await page.getByRole("dialog").waitFor();
    } else {
      await page.getByText("Saved successfully").waitFor();
    }
    await expect(page).toHaveScreenshot(`${view}.png`);
  });
}

// Screenshotting the whole (mostly blank) page for small elements like badges
// dilutes the diff ratio enough that real color/text changes can go unnoticed —
// screenshot the element locator directly instead.
for (const view of ELEMENT_VIEWS) {
  test(`${view} matches its baseline screenshot`, async ({ page }) => {
    await page.goto(`/?view=${view}`);
    const root = page.getByTestId("fixture-root");
    await root.waitFor();
    await expect(root).toHaveScreenshot(`${view}.png`);
  });
}
