# 万物流转

## Commands
- `npm run dev` — dev server (Next 16 默认使用 Turbopack)
- `npm run build` — production build (also verifies TS + lint)
- `npm run lint` — ESLint (flat config: `eslint.config.mjs` 扩展 `eslint-config-next` + 自定义规则)
- `npm run test` — Vitest unit tests

## Architecture
- Next.js 16 App Router, React 19, TS 5, Tailwind CSS
- i18n: `zh` only, `localePrefix: "never"` — no locale in URL
- **Data abstraction**: always use the seam modules in `src/lib/api/` — `posts.ts` and `chat.ts` each delegate to their Supabase implementation in `lib/api/supabase/`. To swap databases later, add a same-signature impl module and re-point the delegation here; callers stay unchanged.
- **Supabase clients**: `server-client.ts` (SSR session, anon key, reads cookies), `browser-client.ts` (client login), `middleware.ts` (session refresh). In `lib/api/supabase/client.ts`: `getSupabaseAdmin()` uses `SUPABASE_SERVICE_ROLE_KEY` (writes + draft reads, bypasses RLS); `getSupabasePublic()` uses anon key (public reads, subject to RLS `published=true`, no cookies → ISR-safe).
- **Auth**: Supabase email/password. Admin Server Actions in `src/app/actions/posts.ts` and `src/app/actions/chat.ts` check session via `supabase.auth.getUser()`. `ADMIN_SECRET` / `verifyAdminSecret` in `lib/auth/admin.ts` is vestigial and currently unused.
- **Middleware order**: Supabase session refresh → protect `/admin` (redirect to /login) → next-intl routing. `/chat` is deliberately open to anonymous users (server-side enforces free-model-only + rate limit).
- **Post editor**: Novel supplies the UI primitives; TipTap 2 extensions and JSON schema live in `src/lib/editor/`. New posts store canonical TipTap JSON and render HTML on demand.

## Data provider
- Backend is Supabase (the only implementation). `lib/api/provider.ts` is a vestigial seam: `getDataProvider()` returns `"supabase"`. The legacy filesystem/MDX provider was removed (2026-06-12).
- Public reads go through anon key + RLS (`getSupabasePublic`); writes/draft reads use service role (`getSupabaseAdmin`).

## Supabase
- Table `posts` (slug unique, legacy body, content_json, content_format `html`|`mdx`|`tiptap`, tags[], locale, published)
- Table `fragments` (memory wall entries)
- Table `chat_conversations` (user_id, title, model_id, system_prompt) + `chat_messages` (conversation_id, role, content, model_id) — see `schema-chat.sql`
- Bucket `post-images` (public, max 5MB, jpeg/png/gif/webp)
- Fresh installs: run `supabase/schema.sql`, `supabase/storage.sql`, then `supabase/schema-chat.sql`. Existing installs additionally run numbered files in `supabase/migrations/` manually.

## Conventions
- Prefer Server Components; avoid `"use client"` unless necessary
- Path alias: `@/` → `src/`
- Dark mode via `next-themes` (`class` strategy), CSS variables in `globals.css`
- `site.config.json` drives music player (MetingJS + APlayer), Giscus comments, social links, features
- Images in posts auto-cleanup from Supabase storage on update/delete
- TipTap JSON is canonical for `tiptap` posts; do not persist generated HTML or silently convert legacy MDX.

## Protected features (do not remove)
Netease music player, Live2D, Memory wall, Giscus comments, custom editor, timeline archive, i18n, AI chat (anonymous free-model-only + rate limit, login for history & model switching)

## Prohibited
- Modify `.env*` files or commit secrets
- Run automatic DB migrations
- Delete or bypass `src/lib/api/` abstraction layer
