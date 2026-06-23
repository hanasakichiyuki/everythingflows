-- ============================================================
-- AI Chat System — 重构版 (2026-06-21)
-- 在 SQL Editor 中先运行 schema.sql (posts 等)，再运行本文件。
-- 若从旧版升级，请先阅读末尾的「迁移」部分。
-- ============================================================

-- ============================================================
-- 1. 对话表
-- ============================================================

create table if not exists public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '新对话',
  model_id    text not null default 'gemini-2.0-flash',
  system_prompt text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chat_conversations_user_idx
  on public.chat_conversations (user_id, updated_at desc);

-- ============================================================
-- 2. 消息表
-- ============================================================

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null default '',
  model_id        text,
  created_at      timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at asc);

-- ============================================================
-- 3. updated_at 触发器 —— 由 Postgres 维护，不再依赖应用代码
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists chat_conversations_touch on public.chat_conversations;
create trigger chat_conversations_touch
  before update on public.chat_conversations
  for each row execute function public.touch_updated_at();

-- 每插入消息时自动 touch 对话的 updated_at
create or replace function public.touch_conversation_on_message()
returns trigger as $$
begin
  update public.chat_conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists chat_messages_touch_conversation on public.chat_messages;
create trigger chat_messages_touch_conversation
  after insert on public.chat_messages
  for each row execute function public.touch_conversation_on_message();

-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users manage own chat_conversations" on public.chat_conversations;
create policy "Users manage own chat_conversations"
  on public.chat_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own chat_messages" on public.chat_messages;
create policy "Users manage own chat_messages"
  on public.chat_messages for all
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
      and c.user_id = auth.uid()
    )
  );