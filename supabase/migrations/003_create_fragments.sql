-- Create fragments table for Memory Wall
create table if not exists fragments (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('image', 'text')),
  text text,
  image_url text,
  width text default 'md' check (width in ('sm', 'md', 'lg')),
  height text default 'medium' check (height in ('short', 'medium', 'tall')),
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table fragments enable row level security;

-- Everyone can read fragments
create policy "Fragments are viewable by everyone"
  on fragments for select
  using (true);

-- Only authenticated users can insert
create policy "Authenticated users can insert fragments"
  on fragments for insert
  with check (auth.role() = 'authenticated');

-- Users can update their own fragments
create policy "Users can update their own fragments"
  on fragments for update
  using (auth.uid() = user_id);

-- Users can delete their own fragments
create policy "Users can delete their own fragments"
  on fragments for delete
  using (auth.uid() = user_id);
