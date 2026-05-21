import { verifyAdminSecret } from "@/lib/auth/admin";
import { getDataProvider } from "@/lib/api/provider";
import { uploadPostImage } from "@/lib/api/supabase/storage";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: Request) {
  if (getDataProvider() !== "supabase") {
    return Response.json({ error: "Upload requires DATA_PROVIDER=supabase" }, { status: 501 });
  }

  const auth = request.headers.get("authorization");
  const adminSecret = auth?.startsWith("Bearer ")
    ? auth.slice(7)
    : request.headers.get("x-admin-secret") ?? undefined;

  if (!verifyAdminSecret(adminSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file instanceof File ? file.name : "paste.png";
    const url = await uploadPostImage(buffer, name, file.type);
    return Response.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
