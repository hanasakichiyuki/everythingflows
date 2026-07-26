import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

loadEnvConfig(process.cwd());

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type TemporaryE2eData = {
  title: string;
  email: string;
  userId?: string;
};

const temporaryE2eData = new Set<TemporaryE2eData>();

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError;
}

async function findUserIdByEmail(supabase: SupabaseClient, email: string) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user.id;
    if (data.users.length < perPage) return undefined;
  }
}

async function cleanupTemporaryE2eData(
  supabase: SupabaseClient,
  temporaryData: TemporaryE2eData
) {
  await withRetry(async () => {
    const { error: postError } = await supabase
      .from("posts")
      .delete()
      .eq("title", temporaryData.title);
    if (postError) throw postError;

    const userId =
      temporaryData.userId ??
      (await findUserIdByEmail(supabase, temporaryData.email));
    if (userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  });
  temporaryE2eData.delete(temporaryData);
}

test.describe("后台认证路径", () => {
  test.afterAll(async () => {
    const supabase = getAdminClient();
    if (!supabase) return;
    for (const data of temporaryE2eData) {
      await cleanupTemporaryE2eData(supabase, data);
    }
  });

  test("未认证访问会被引导到登录页", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("同一 Supabase 项目内可完成草稿、预览、发布和删除", async ({ page }) => {
    test.setTimeout(90_000);
    const supabase = getAdminClient();
    test.skip(!supabase, "需要 Supabase service role 才能创建并清理临时 E2E 账号");

    const runId = randomUUID().replace(/-/g, "").slice(0, 12);
    const title = `E2E cleanup ${runId}`;
    const email = `everythingflows-e2e-${runId}@example.invalid`;
    const password = `E2e!${randomUUID()}Aa`;
    const dataToClean: TemporaryE2eData = { title, email };
    temporaryE2eData.add(dataToClean);

    try {
      const { data, error } = await withRetry(() =>
        supabase!.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
      );
      if (error || !data.user) throw error ?? new Error("无法创建临时 E2E 账号");
      dataToClean.userId = data.user.id;

      await page.goto("/login");
      await page.locator("#login-email").fill(email);
      await page.locator("#login-password").fill(password);
      await page.locator("button[type='submit']").click();
      await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);

      await page.locator("#post-title").fill(title);
      const editor = page.locator(".tiptap-editor[contenteditable='true']");
      await expect(editor).toBeVisible();
      await editor.fill("这是一篇会在测试结束后自动删除的临时文章。");

      await page.getByRole("button", { name: "保存草稿" }).click();
      await expect(page).toHaveURL(/\/admin\/edit\/[^/]+$/);
      const postId = page.url().split("/").at(-1);
      expect(postId).toBeTruthy();

      await page.getByRole("button", { name: "预览更新" }).click();
      const preview = page.getByRole("dialog");
      await expect(preview.getByRole("heading", { name: title })).toBeVisible();
      await preview.getByRole("button", { name: "确认更新" }).click();
      await expect(page).toHaveURL(/\/blog\/e2e-cleanup-/);
      await expect(page.locator("main article > header h1")).toHaveText(title);

      await page.goto(`/admin/edit/${postId}`);
      await expect(page.locator("#post-title")).toHaveValue(title);
      await page.getByRole("button", { name: "删除这篇文章" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "确认删除" }).click();
      await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    } finally {
      await cleanupTemporaryE2eData(supabase!, dataToClean);
    }
  });
});
