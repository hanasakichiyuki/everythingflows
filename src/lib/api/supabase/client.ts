import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  content_format: "html" | "mdx";
  date: string;
  updated: string | null;
  tags: string[];
  category: string | null;
  published: boolean;
  locale: string;
  reading_time: string;
  created_at: string;
};

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/** Server-only client (service role). Used for reads/writes in RSC and API routes. */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example and supabase/schema.sql"
    );
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

/**
 * Public read client (anon key). Subject to RLS — only sees published posts
 * (see supabase/schema.sql "Public read published posts").
 *
 * Deliberately does NOT read request cookies (unlike server-client.ts), so it
 * stays compatible with static/ISR rendering. Use for public reads only;
 * anything needing drafts or writes must use getSupabaseAdmin().
 */
export function getSupabasePublic(): SupabaseClient {
  if (publicClient) return publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example"
    );
  }

  publicClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}
