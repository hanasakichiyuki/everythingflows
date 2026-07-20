-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  body text not null default '',
  content_json jsonb,
  content_format text not null default 'html' check (content_format in ('html', 'mdx', 'tiptap')),
  date timestamptz not null default now(),
  updated timestamptz,
  tags text[] not null default '{}',
  category text,
  published boolean not null default true,
  locale text not null default 'zh',
  reading_time text not null default '1 min read',
  created_at timestamptz not null default now(),
  constraint posts_tiptap_content_required
    check (content_format <> 'tiptap' or content_json is not null)
);

create index if not exists posts_locale_published_date_idx
  on public.posts (locale, published, date desc);

create index if not exists posts_tags_gin_idx on public.posts using gin (tags);

alter table public.posts enable row level security;

-- Public read published posts (anon key / client)
create policy "Public read published posts"
  on public.posts for select
  using (published = true);

-- Service role bypasses RLS for admin writes via Next.js API
