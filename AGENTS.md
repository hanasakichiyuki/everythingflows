# 万物流转

## Commands
- `npm run dev` — dev server (turbo)
- `npm run build` — production build (also verifies TS + lint)
- `npm run lint` — ESLint (next/core-web-vitals, next/typescript)
- no test framework

## Architecture
- Next.js 15 App Router, React 19, TS 5, Tailwind CSS
- i18n: `zh` only, `localePrefix: "never"` — no locale in URL
- **Data abstraction**: always use `src/lib/api/posts.ts` — a thin seam that delegates to the Supabase implementation (`lib/api/supabase/posts.ts`). To swap databases later, add a same-signature impl module and re-point the delegation here; callers stay unchanged.
- **Supabase clients**: `server-client.ts` (SSR session, anon key, reads cookies), `browser-client.ts` (client login), `middleware.ts` (session refresh). In `lib/api/supabase/client.ts`: `getSupabaseAdmin()` uses `SUPABASE_SERVICE_ROLE_KEY` (writes + draft reads, bypasses RLS); `getSupabasePublic()` uses anon key (public reads, subject to RLS `published=true`, no cookies → ISR-safe).
- **Auth**: Supabase email/password. Admin Server Actions in `src/app/actions/posts.ts` check session. Legacy REST at `POST /api/posts` uses `Authorization: Bearer <ADMIN_SECRET>`.
- **Middleware order**: Supabase session refresh → protect `/admin` (redirect to /login) → next-intl routing

## Data provider
- Backend is Supabase (the only implementation). `lib/api/provider.ts` is a vestigial seam: `getDataProvider()` returns `"supabase"`. The legacy filesystem/MDX provider was removed (2026-06-12).
- Public reads go through anon key + RLS (`getSupabasePublic`); writes/draft reads use service role (`getSupabaseAdmin`).

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
