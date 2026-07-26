# Supabase provider

## Setup

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Run `supabase/schema.sql`, `supabase/migrations/003_create_fragments.sql`, then `supabase/schema-chat.sql` in **SQL Editor**.
3. Copy **Project URL**, **anon key**, and **service role key** into `.env.local` (see `.env.example`).
4. Configure the R2 media variables from [`docs/R2_MEDIA_SETUP.md`](../../../../docs/R2_MEDIA_SETUP.md); Supabase does not store image objects.
5. Set `DATA_PROVIDER=supabase` and `ADMIN_SECRET` for `/admin` publish.

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

- **Server Action**: `publishPostAction` from `/admin`（经 proxy 校验登录态）。这是唯一的写入入口。
- 不再提供 `POST /api/posts` REST 接口：它未鉴权且走 service role，是越权写风险，已删除。写操作一律走 server action。

Service role is used server-side only; never expose it to the browser.
