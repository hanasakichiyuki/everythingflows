# Supabase provider

## Setup

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Run `supabase/schema.sql` then `supabase/storage.sql` in **SQL Editor**.
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local` (see `.env.example`).
4. Set `DATA_PROVIDER=supabase` and `ADMIN_SECRET` for `/admin` publish.

## Table: `posts`

| Column | Type | Notes |
|--------|------|-------|
| slug | text unique | URL path |
| body | text | HTML (new posts) or MDX (legacy) |
| content_format | `html` \| `mdx` | Default `html` |
| tags | text[] | Search & tag pages |
| locale | text | `zh` / `en` |
| published | boolean | Only `true` shown on site |

## Writes

- **Server Action**: `publishPostAction` from `/admin` (validates `ADMIN_SECRET`).
- **REST**: `POST /api/posts` with `Authorization: Bearer <ADMIN_SECRET>`.

Service role is used server-side only; never expose it to the browser.
