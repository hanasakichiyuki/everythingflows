import { expect, test } from "@playwright/test";

test.describe("公共内容路径", () => {
  test("首页提供内容入口并可打开搜索", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "浏览全部碎片" })
    ).toBeVisible();

    await page.getByRole("button", { name: "搜索文章、碎片和更多内容" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("博客列表和登录入口可用", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "文章" })).toBeVisible();

    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "登录写作工作台" })
    ).toBeVisible();
  });

  test("文章详情保留标题与可读正文", async ({ page }) => {
    await page.goto("/blog");
    const postLink = page.locator("main article a[href^='/blog/']").first();
    const hasPublishedPost = (await postLink.count()) > 0;
    test.skip(!hasPublishedPost, "测试环境没有已发布文章可供阅读验证");

    const href = await postLink.getAttribute("href");
    expect(href).toMatch(/^\/blog\/[^/]+$/);
    await page.goto(href!);

    await expect(page.locator("main article > header h1")).toBeVisible();
    await expect(page.locator("main .prose-blog")).toBeVisible();
  });

  test("匿名聊天支持输入，并可通过键盘关闭历史面板", async ({ page }) => {
    await page.goto("/chat");

    const composer = page.locator("textarea[aria-describedby='chat-composer-hint']");
    const historyTrigger = page.locator("#chat-history-trigger");
    await expect(composer).toBeVisible();
    await expect(historyTrigger).toBeVisible();
    await expect(page.locator("main a[href='/login']")).toBeVisible();

    await composer.fill("测试输入");
    await expect(composer).toHaveValue("测试输入");

    await historyTrigger.click();
    await expect(page.locator("#chat-history-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#chat-history-dialog")).toBeHidden();
    await expect(historyTrigger).toBeFocused();
  });

  test("减少动效偏好会缩短非必要动画", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const motionState = await page
      .locator("main .anim-fade-up")
      .first()
      .evaluate((element) => ({
        animationName: window.getComputedStyle(element).animationName,
        reducedMotionEnabled: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }));
    expect(motionState.reducedMotionEnabled).toBe(true);
    expect(["", "none"]).toContain(motionState.animationName);
  });
});

test.describe("移动端导航", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("底部导航保持可见并标记当前页面", async ({ page }) => {
    await page.goto("/blog");
    const navigation = page.getByRole("navigation", { name: "移动端主导航" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "博客" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

test.describe("平板断点", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("768px 使用桌面侧栏，不保留移动导航或播放器安全间距", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "移动端主导航" })).toBeHidden();
    await expect(page.locator("div.fixed.inset-x-0.bottom-0.z-50")).toHaveCount(0);
    const offsets = await page.evaluate(() => ({
      navigationOffset: getComputedStyle(document.documentElement).getPropertyValue("--mobile-nav-offset").trim(),
      playerOffset: getComputedStyle(document.documentElement).getPropertyValue("--mobile-player-offset").trim(),
    }));
    expect(offsets).toEqual({ navigationOffset: "0px", playerOffset: "0px" });
  });
});

test("从移动端切换到平板宽度时会同步清理移动端布局状态", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "移动端主导航" })).toBeVisible();
  await expect(page.locator("div.fixed.inset-x-0.bottom-0.z-50")).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("navigation", { name: "移动端主导航" })).toBeHidden();
  await expect(page.locator("div.fixed.inset-x-0.bottom-0.z-50")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        navigationOffset: getComputedStyle(document.documentElement).getPropertyValue("--mobile-nav-offset").trim(),
        playerOffset: getComputedStyle(document.documentElement).getPropertyValue("--mobile-player-offset").trim(),
      }))
    )
    .toEqual({ navigationOffset: "0px", playerOffset: "0px" });
});
