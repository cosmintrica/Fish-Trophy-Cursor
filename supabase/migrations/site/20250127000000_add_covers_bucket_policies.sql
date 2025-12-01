-- =============================================
-- Add covers bucket and storage policies
-- Similar to avatars bucket policies
-- =============================================

-- Create covers bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('covers','covers', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Covers: upload/update/delete doar pe folderul userului; view public
-- Similar to avatars policies

drop policy if exists "Users can upload own cover" on storage.objects;
drop policy if exists "Users can update own cover" on storage.objects;
drop policy if exists "Users can delete own cover" on storage.objects;
drop policy if exists "Anyone can view covers" on storage.objects;

create policy "Users can upload own cover" on storage.objects
  for insert with check (bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own cover" on storage.objects
  for update using (bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own cover" on storage.objects
  for delete using (bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view covers" on storage.objects
  for select using (bucket_id = 'covers');

