import { isFilesystemMode } from "@/lib/api/provider";
import { listPosts, publishPost } from "@/lib/api/posts";
import type { ContentFormat } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? undefined;
  const posts = await listPosts(locale ?? undefined);
  return Response.json({ data: posts });
}

export async function POST(request: Request) {
  if (isFilesystemMode()) {
    return Response.json(
      {
        error: "Not implemented",
        message: "Filesystem mode: switch DATA_PROVIDER=supabase to publish online",
      },
      { status: 501 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await publishPost({
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    body: String(body.body ?? body.content ?? ""),
    contentFormat: (body.contentFormat as ContentFormat) ?? "html",
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    category: body.category ? String(body.category) : undefined,
    locale: String(body.locale ?? "zh"),
    published: body.published !== false,
    slug: body.slug ? String(body.slug) : undefined,
    id: body.id ? String(body.id) : undefined,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ data: result.post }, { status: 201 });
}
