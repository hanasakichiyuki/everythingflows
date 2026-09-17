-- 005_posts_tiptap_only.sql
--
-- 内容格式收敛：正文只剩结构化（tiptap）一种格式，退役 html / mdx。
--
-- 前置条件：所有历史 html / mdx 文章已转为 tiptap。一次性迁移已执行完毕（2026-09），
--          对应的后台迁移工具已随重构删除；若日后再出现旧格式行，需先用临时脚本转换。
--
-- 本文件内置「门禁」：只要还有非 tiptap 行、或 tiptap 行缺少 content_json，
-- 就 raise exception 并中止。这样即使有人在数据没迁完时误执行本文件，
-- 也绝不会把约束收窄到脏数据上、导致线上渲染失败。
--
-- ⚠️ 请在 Supabase SQL Editor 手动执行（项目约定：不自动执行数据库迁移）。

do $$
declare
  legacy_rows integer;
  missing_json integer;
begin
  select count(*) into legacy_rows
  from public.posts
  where content_format <> 'tiptap';

  select count(*) into missing_json
  from public.posts
  where content_format = 'tiptap' and content_json is null;

  if legacy_rows > 0 then
    raise exception
      '迁移未完成：仍有 % 篇非 tiptap 文章，请先完成内容迁移再执行本文件', legacy_rows;
  end if;

  if missing_json > 0 then
    raise exception
      '数据异常：% 篇 tiptap 文章缺少 content_json，请先人工修复', missing_json;
  end if;
end $$;

alter table public.posts
  drop constraint if exists posts_content_format_check;

alter table public.posts
  add constraint posts_content_format_check
  check (content_format = 'tiptap');

alter table public.posts
  alter column content_format set default 'tiptap';

comment on column public.posts.content_format is
  '正文格式。内容格式已收敛，恒为 tiptap。';

comment on column public.posts.body is
  '历史列，已停用：正文统一存放在 content_json（迁移前存放 html / mdx 源码）。';
