import { expect, test } from "@playwright/test";

const pages = [
  { path: "/how-it-works", heading: /better gifting creates value/i },
  { path: "/affiliate-commissions", heading: /the retailer funds it/i },
  { path: "/creator-program", heading: /turn trusted recommendations/i },
] as const;

test.describe("Prospect business education", () => {
  for (const pageDefinition of pages) {
    test(`${pageDefinition.path} renders without horizontal page overflow`, async ({ page }) => {
      await page.goto(pageDefinition.path);

      await expect(page.getByRole("heading", { name: pageDefinition.heading })).toBeVisible();
      await expect(page.getByText("Creator commission sharing is a planned program.")).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    });
  }

  test("learning-center navigation moves between the commission and creator explanations", async ({ page }) => {
    await page.goto("/how-it-works");

    const educationNav = page.getByRole("navigation", { name: "How Wishlist Wizard works" });
    await educationNav.getByRole("link", { name: "Affiliate commissions" }).click();
    await expect(page).toHaveURL(/\/affiliate-commissions$/);
    await expect(page.getByText("A 20% share is not 20% of the purchase.")).toBeVisible();

    await educationNav.getByRole("link", { name: "Creator program" }).click();
    await expect(page).toHaveURL(/\/creator-program$/);
    await expect(page.getByRole("heading", { name: "No earnings guarantee" })).toBeVisible();
  });
});
