import { expect, test } from "@playwright/test";

test("首页桌面端视觉基线", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveScreenshot("home-desktop.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.02,
  });
});

test("博客移动端视觉基线", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await expect(page.locator("main")).toHaveScreenshot("blog-mobile.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.02,
  });
});
