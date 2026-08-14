# 万物流转

## Commands
- `pnpm run dev` — dev server (Next 16 默认使用 Turbopack)
- `pnpm run build` — production build (also verifies TS + lint)
- `pnpm run lint` — ESLint (flat config: `eslint.config.mjs` 扩展 `eslint-config-next` + 自定义规则)
- `pnpm run test` — Vitest unit tests

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
- Supabase does not store media objects. Article and fragment images are R2-only under the configured `R2_PUBLIC_BASE_URL/posts/` prefix.
- Fresh installs: run `supabase/schema.sql`, `supabase/migrations/003_create_fragments.sql`, then `supabase/schema-chat.sql`. Existing installs additionally run applicable numbered files in `supabase/migrations/` manually.

## Conventions
- Prefer Server Components; avoid `"use client"` unless necessary
- Path alias: `@/` → `src/`
- Dark mode via `next-themes` (`class` strategy), CSS variables in `globals.css`
- `site.config.json` drives music player (MetingJS + APlayer), Giscus comments, social links, features
- Images in posts auto-cleanup from R2 on update/delete
- TipTap JSON is canonical for `tiptap` posts; do not persist generated HTML or silently convert legacy MDX.

## Protected features (do not remove)
Netease music player, Live2D engine/resources (retain for the future desktop project; do not mount it in the website public layout by default), Memory wall, Giscus comments, custom editor, timeline archive, i18n, AI chat (anonymous free-model-only + rate limit, login for history & model switching)

## Prohibited
- Modify `.env*` files or commit secrets
- Run automatic DB migrations
- Delete or bypass `src/lib/api/` abstraction layer

## Cursor Cloud specific instructions

Standard commands live in `## Commands` above and in `README.md`. Notes below cover only non-obvious setup/run caveats for this VM.

### The app needs Supabase to run
Every page that reads posts (home, blog, archive, admin) throws without Supabase env vars. Dev here uses a **local Supabase stack** (Supabase CLI + Docker), configured via a gitignored `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, plus the CLI's default anon/service-role demo keys). If `.env.local` is missing, recreate it from `.env.example` pointing at the local stack.

### Bootstrapping local Supabase (only if not already running)
`docker` + the `supabase` CLI are installed at the system level. Bring the stack up with:
- Start the docker daemon if `docker ps` fails: `sudo dockerd` (run in a background tmux session), then `sudo chmod 666 /var/run/docker.sock`.
- `supabase start` (from repo root; config is `supabase/config.toml`).
- **Non-obvious gotcha — schema + grants:** `supabase start` only auto-applies files in `supabase/migrations/` (just `003_create_fragments.sql`). The core tables live in `supabase/schema.sql`, `supabase/storage.sql`, `supabase/schema-chat.sql` and must be applied manually: `docker exec -i supabase_db_workspace psql -U postgres -d postgres < supabase/<file>.sql`. After that you MUST grant table privileges to the API roles (hosted Supabase does this automatically, local does not — otherwise every read returns `42501 permission denied`): `grant select,insert,update,delete on all tables in schema public to anon, authenticated, service_role;` (plus `grant usage on schema public ...`).
- Create an admin login via the Auth admin API (service-role key): `POST http://127.0.0.1:54321/auth/v1/admin/users` with `{"email":...,"password":...,"email_confirm":true}`. Admin credentials used during setup: `admin@example.com` / `admin123456`. Then log in at `/login` and write posts at `/admin`.

### Dev/build gotcha
Do NOT run `npm run build` while `npm run dev` is running — both write to `.next` (Turbopack) and the dev server starts returning "Internal Server Error". If the dev server shows that error, stop it, `rm -rf .next`, and restart `npm run dev`.

### AI chat (`/chat`)
`/chat` pages load without AI keys, but sending a message needs a configured provider from `ai-models.json` (its `apiKeyEnv` set in `.env.local`, e.g. `GOOGLE_GENERATIVE_AI_API_KEY`). No key was configured during setup, so chat responses are not exercised locally.
