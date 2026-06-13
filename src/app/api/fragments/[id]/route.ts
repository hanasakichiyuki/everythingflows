import { createClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

  const body = await request.json();
  const { text } = body;

  const { data, error } = await supabase
    .from("fragments")
    .update({ text: text || null })
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

  const { error } = await supabase
    .from("fragments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[fragments] DELETE error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/fragments");

  return NextResponse.json({ ok: true });
}
