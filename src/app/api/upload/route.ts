import { MediaConfigurationError, uploadPostImage } from "@/lib/api/media";
import { detectImageContentType } from "@/lib/image-validation";
import { createClient } from "@/lib/supabase/server-client";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  // Verify Supabase authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = detectImageContentType(buffer);
    if (!contentType) {
      return Response.json({ error: "图片文件格式无效" }, { status: 400 });
    }
    const name = file instanceof File ? file.name : "paste.png";
    const url = await uploadPostImage(buffer, name, contentType);
    return Response.json({ url });
  } catch (error) {
    console.error("[upload] failed");
    if (error instanceof MediaConfigurationError) {
      return Response.json({ error: "R2 图片存储尚未完成配置" }, { status: 503 });
    }
    return Response.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}
