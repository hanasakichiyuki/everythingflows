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

Run each missing file in `migrations/` in numeric order. For the Novel editor,
run `004_posts_tiptap_content.sql`; it:

- adds `posts.content_json jsonb`;
- allows `content_format = 'tiptap'`;
- requires JSON content for TipTap rows.

Existing `html` and `mdx` rows are not rewritten. HTML articles can be
explicitly converted in the admin editor; MDX remains on its source path.

## Post content contract

- `html`: canonical content remains in `body`.
- `mdx`: canonical source remains in `body`.
- `tiptap`: canonical ProseMirror document is in `content_json`; `body` is not
  used for rendering.

The public application generates HTML from TipTap JSON on the server and then
passes it through DOMPurify. Image cleanup walks TipTap image nodes directly.
