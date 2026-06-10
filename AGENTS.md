# 万物流转

## Commands
- `npm run dev` — dev server (turbo)
- `npm run build` — production build (also verifies TS + lint)
- `npm run lint` — ESLint (next/core-web-vitals, next/typescript)
- no test framework

## Architecture
- Next.js 15 App Router, React 19, TS 5, Tailwind CSS
- i18n: `zh` only, `localePrefix: "never"` — no locale in URL
- **Data abstraction**: always use `src/lib/api/posts.ts` (dispatches to supabase or filesystem via `DATA_PROVIDER` env). Never read MDX files directly.
- **Supabase clients**: `server-client.ts` (SSR session, anon key), `browser-client.ts` (client login), `middleware.ts` (session refresh). Only `getSupabaseAdmin()` in `lib/api/supabase/client.ts` uses `SUPABASE_SERVICE_ROLE_KEY`.
- **Auth**: Supabase email/password. Admin Server Actions in `src/app/actions/posts.ts` check session. Legacy REST at `POST /api/posts` uses `Authorization: Bearer <ADMIN_SECRET>`.
- **Middleware order**: Supabase session refresh → protect `/admin` (redirect to /login) → next-intl routing

## Data provider
- `DATA_PROVIDER=supabase` — reads/writes Supabase `posts` table via service role
- `DATA_PROVIDER=filesystem` (default) — reads MDX from `content/blog/`
- Publishing requires `DATA_PROVIDER=supabase`

## Supabase
- Table `posts` (slug unique, body, content_format `html`|`mdx`, tags[], locale, published)
- Table `fragments` (memory wall entries)
- Bucket `post-images` (public, max 5MB, jpeg/png/gif/webp)
- Run `supabase/schema.sql` then `supabase/storage.sql` in SQL Editor

## Conventions
- Prefer Server Components; avoid `"use client"` unless necessary
- Path alias: `@/` → `src/`
- Dark mode via `next-themes` (`class` strategy), CSS variables in `globals.css`
- `site.config.json` drives music player (MetingJS + APlayer), Giscus comments, social links, features
- Images in posts auto-cleanup from Supabase storage on update/delete

## Protected features (do not remove)
Netease music player, Live2D, Memory wall, Giscus comments, custom editor, timeline archive, i18n

## Prohibited
- Modify `.env*` files or commit secrets
- Run automatic DB migrations
- Delete or bypass `src/lib/api/` abstraction layer
