import { createClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const WIDTHS = ["sm", "md", "lg"] as const;
const HEIGHTS = ["short", "medium", "tall"] as const;

/** 图片 URL 只接受本站 Supabase storage，精确匹配项目域名。 */
function isAllowedImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  try {
    const allowedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    const host = new URL(url).hostname;
    return host === allowedHost;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fragments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fragments] GET error:", error);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { type, text, imageUrl } = body;
  const width = typeof body.width === "string" ? body.width : "md";
  const height = typeof body.height === "string" ? body.height : "medium";

  // 白名单校验（DB check 约束之外再加一道，避免非法值打到库触发 500）
  if (type !== "image" && type !== "text") {
    return NextResponse.json({ error: "type 不合法" }, { status: 400 });
  }
  if (!WIDTHS.includes(width as (typeof WIDTHS)[number])) {
    return NextResponse.json({ error: "width 不合法" }, { status: 400 });
  }
  if (!HEIGHTS.includes(height as (typeof HEIGHTS)[number])) {
    return NextResponse.json({ error: "height 不合法" }, { status: 400 });
  }
  if (type === "image" && !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "图片地址不合法" }, { status: 400 });
  }
  if (type === "text" && (typeof text !== "string" || !text.trim())) {
    return NextResponse.json({ error: "文字内容不能为空" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fragments")
    .insert({
      type,
      text: typeof text === "string" && text ? text : null,
      image_url: type === "image" ? (imageUrl as string) : null,
      width,
      height,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[fragments] POST error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }

  // 首页（最新碎碎念）与碎碎念页是 ISR，新增后立即失效缓存
  revalidatePath("/");
  revalidatePath("/fragments");

  return NextResponse.json({ data });
}
