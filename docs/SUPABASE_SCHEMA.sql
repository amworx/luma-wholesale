-- Luma wholesale demo: shared cloud document.
-- Run once against the project via:
--   supabase db query --project-ref <ref> --file docs/SUPABASE_SCHEMA.sql
--
-- NOTE: This is demo-grade. RLS is enabled but policies intentionally allow
-- public read/write because the demo has no authentication. Anyone with the
-- app URL can read or change the shared data. See docs/CLOUD_SYNC.md.

create table if not exists public.luma_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.luma_store enable row level security;

drop policy if exists "luma_public_read" on public.luma_store;
create policy "luma_public_read" on public.luma_store
  for select to anon, authenticated using (true);

drop policy if exists "luma_public_insert" on public.luma_store;
create policy "luma_public_insert" on public.luma_store
  for insert to anon, authenticated with check (true);

drop policy if exists "luma_public_update" on public.luma_store;
create policy "luma_public_update" on public.luma_store
  for update to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.luma_store to anon, authenticated;

-- The single shared row.
insert into public.luma_store (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- Realtime: publish changes so every open device updates immediately.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'luma_store'
  ) then
    alter publication supabase_realtime add table public.luma_store;
  end if;
end $$;
