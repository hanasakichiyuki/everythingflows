-- Run after schema.sql — creates public bucket for post images

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

create policy "Public read post images"
  on storage.objects for select
  using (bucket_id = 'post-images');
