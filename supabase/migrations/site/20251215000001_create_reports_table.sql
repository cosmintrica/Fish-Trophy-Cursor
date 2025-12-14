-- Create reports table for user reports on records and catches
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  report_type text not null check (report_type in ('record', 'catch')),
  item_id uuid not null,
  item_url text not null,
  message text not null check (char_length(message) >= 10 and char_length(message) <= 500),
  reporter_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create index for faster queries
create index if not exists idx_reports_item on public.reports(item_id, report_type);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_reporter on public.reports(reporter_id);
create index if not exists idx_reports_created on public.reports(created_at desc);

-- Enable RLS
alter table public.reports enable row level security;

-- Policy: Anyone can create reports
create policy "Anyone can create reports"
  on public.reports
  for insert
  to authenticated, anon
  with check (true);

-- Policy: Users can view their own reports
create policy "Users can view their own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Policy: Admins can view all reports
create policy "Admins can view all reports"
  on public.reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Admins can update reports
create policy "Admins can update reports"
  on public.reports
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
create or replace function public.update_reports_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at
create trigger update_reports_updated_at
  before update on public.reports
  for each row
  execute function public.update_reports_updated_at();

