import { createClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";

/**
 * 登出后跳回登录页。
 *
 * 这里**必须**用相对路径，不能用 `new URL("/login", request.url)`：
 * standalone 模式下 route handler 拿到的 `request.url` 是服务器内部地址
 * （`http://localhost:3000/...`，nginx 只透传了 `Host`、没给 `x-forwarded-host`），
 * 用它拼绝对地址会把浏览器送到访客自己机器的 3000 端口，表现为「无法访问」。
 * 相对 Location 由浏览器按当前 origin 解析，本地开发与线上都天然正确。
 *
 * 用 303 而不是 307：表单提交是 POST，307 会要求浏览器把 POST 原样重放到
 * `/login`，而登录页只接受 GET。
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
