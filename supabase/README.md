# Supabase setup

Database changes are intentionally manual. Never run migrations automatically
from the application or CI.

## Fresh project

Run these files in the Supabase SQL Editor:

1. `schema.sql`
2. `storage.sql`
3. `schema-chat.sql`

The current `schema.sql` already includes TipTap support.

## Existing project

Run each missing file in `migrations/` in numeric order:

- `004_posts_tiptap_content.sql` — adds `posts.content_json jsonb` and allows
  `content_format = 'tiptap'`.
- `005_posts_tiptap_only.sql` — collapses the content format to TipTap only.
  It **refuses to run while any non-TipTap row remains** (guard at the top of the
  file). The one-off `html` → `tiptap` conversion has already been completed for
  every existing row, and its tooling was deleted afterwards to avoid keeping an
  unreachable code path around. If legacy rows somehow reappear, convert them
  out-of-band (a throwaway script that runs the HTML through the editor schema to
  produce a TipTap document) before running this file.

## Post content contract

- `tiptap`: the canonical ProseMirror document lives in `content_json`. `body` is
  a disabled legacy column and stays empty for rows written after the migration.

The public application renders `content_json` straight into React elements on the
server — no HTML string, no sanitizer, no browser DOM emulation in the render
path. Image cleanup walks TipTap image nodes directly.
