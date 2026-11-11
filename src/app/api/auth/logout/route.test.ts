import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/server-client", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

const { POST } = await import("./route");

describe("POST /api/auth/logout", () => {
  it("用相对路径跳回登录页（不能带 request.url 的内部地址）", async () => {
    const response = await POST();

    expect(signOut).toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });
});
