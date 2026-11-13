-- Overdrive - Box, PARTE 4: el perfil público del dueño (lo que se ve en la portada de todas las secciones).
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede repetir sin romper nada.
-- Solo el dueño (la primera cuenta registrada) puede cambiarlo; cualquiera lo puede leer.

create table if not exists public.site_profile (
  id text primary key default 'main' check (id = 'main'),
  display_name text not null default 'Alchemy Studios' check (char_length(display_name) between 1 and 60),
  role text not null default 'CREADOR' check (char_length(role) <= 40),
  eyebrow text not null default 'ARCHIVO PERSONAL' check (char_length(eyebrow) <= 60),
  title_lead text not null default 'Lo que estoy' check (char_length(title_lead) <= 60),
  title_main text not null default 'construyendo' check (char_length(title_main) <= 60),
  tagline text not null default 'Proyectos, videos, betas, demos y avances.' check (char_length(tagline) <= 160),
  note text not null default 'Dale ♥ a lo que te guste.' check (char_length(note) <= 120),
  bio text not null default '' check (char_length(bio) <= 600),
  location text not null default '' check (char_length(location) <= 60),
  status_text text not null default '' check (char_length(status_text) <= 80),
  logo_url text,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8),
  hidden_tabs text[] not null default '{}',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

insert into public.site_profile (id) values ('main') on conflict (id) do nothing;

alter table public.site_profile enable row level security;

drop policy if exists "perfil visible" on public.site_profile;
create policy "perfil visible" on public.site_profile for select using (true);

drop policy if exists "solo el dueño crea el perfil" on public.site_profile;
create policy "solo el dueño crea el perfil" on public.site_profile for insert
  with check ((select public.is_owner()));

drop policy if exists "solo el dueño edita el perfil" on public.site_profile;
create policy "solo el dueño edita el perfil" on public.site_profile for update
  using ((select public.is_owner())) with check ((select public.is_owner()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'site_profile') then
    alter publication supabase_realtime add table public.site_profile;
  end if;
end;
$$;
