/**
 * Comments API stub — swap Giscus for Supabase-backed comments later.
 */
export async function GET() {
  return Response.json({
    provider: process.env.COMMENTS_PROVIDER ?? "giscus",
    message: "Client-side Giscus is used. Implement POST here for Supabase comments.",
  });
}

export async function POST() {
  return Response.json(
    { error: "Not implemented", message: "Enable Supabase comments in lib/api/comments.ts" },
    { status: 501 }
  );
}
