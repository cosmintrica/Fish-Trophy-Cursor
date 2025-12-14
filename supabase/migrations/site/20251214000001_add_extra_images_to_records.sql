-- Add extra_images column to records table to support multiple photos
alter table public.records 
add column if not exists extra_images text[] default array[]::text[];
