-- Ejecutá este archivo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  bpm numeric(6,2) not null check (bpm >= 30 and bpm <= 300),
  camelot_key text not null check (camelot_key ~ '^(?:[1-9]|1[0-2])[AB]$'),
  version text,
  album text,
  year integer check (year is null or (year >= 1900 and year <= 2100)),
  cover_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_title_idx on public.songs (lower(title));
create index if not exists songs_artist_idx on public.songs (lower(artist));
create index if not exists songs_bpm_idx on public.songs (bpm);
create index if not exists songs_key_idx on public.songs (camelot_key);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row execute procedure public.set_updated_at();

alter table public.songs enable row level security;

-- Cualquiera puede consultar el catálogo.
drop policy if exists "Public can read songs" on public.songs;
create policy "Public can read songs"
on public.songs for select
to anon, authenticated
using (true);

-- Sólo usuarios autenticados pueden modificar el catálogo.
-- Para una app personal: creá únicamente tu usuario admin y desactivá registros públicos.
drop policy if exists "Authenticated can insert songs" on public.songs;
create policy "Authenticated can insert songs"
on public.songs for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update songs" on public.songs;
create policy "Authenticated can update songs"
on public.songs for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete songs" on public.songs;
create policy "Authenticated can delete songs"
on public.songs for delete
to authenticated
using (true);
