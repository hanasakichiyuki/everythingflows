-- Run manually in the Supabase SQL Editor after supabase/schema.sql.
-- Existing HTML and MDX rows remain unchanged.

alter table public.posts
  add column if not exists content_json jsonb;

alter table public.posts
  drop constraint if exists posts_content_format_check;

alter table public.posts
  add constraint posts_content_format_check
  check (content_format in ('html', 'mdx', 'tiptap'));

alter table public.posts
  drop constraint if exists posts_tiptap_content_required;

alter table public.posts
  add constraint posts_tiptap_content_required
  check (content_format <> 'tiptap' or content_json is not null);

comment on column public.posts.content_json is
  'Canonical ProseMirror/TipTap JSON document when content_format = tiptap';
