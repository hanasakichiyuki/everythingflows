import { createClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteFragmentImage } from "@/lib/api/fragments";
import { validateFragmentText } from "@/lib/fragment-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ canManage: false });

  const { data, error } = await supabase
    .from("fragments")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[fragments] ownership check error:", error);
    return NextResponse.json({ error: "权限检查失败" }, { status: 500 });
  }

  return NextResponse.json({ canManage: Boolean(data) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !Object.prototype.hasOwnProperty.call(payload, "text")
  ) {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;

  const { data: existing, error: existingError } = await supabase
    .from("fragments")
    .select("id,type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[fragments] PATCH lookup error:", existingError);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "碎片不存在或无权编辑" }, { status: 404 });
  }

  const textValidation = validateFragmentText(body.text, {
    required: existing.type === "text",
  });
  if (!textValidation.ok) {
    return NextResponse.json({ error: textValidation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fragments")
    .update({ text: textValidation.text })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[fragments] PATCH error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/fragments");
  revalidatePath("/fragments/[id]", "page");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("fragments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,image_url")
    .maybeSingle();

  if (error) {
    console.error("[fragments] DELETE error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "碎片不存在或无权删除" }, { status: 404 });
  }

  if (data.image_url) await deleteFragmentImage(data.image_url);

  revalidatePath("/");
  revalidatePath("/fragments");
  revalidatePath("/fragments/[id]", "page");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true });
}
