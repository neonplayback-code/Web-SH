-- Overdrive - Box, PARTE 5: endurecer la seguridad y corregir datos.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede repetir sin romper nada.
-- Ejecútalo DESPUÉS de las partes 1, 2 y 4.
--
-- Qué corrige:
--  1. Nadie puede cambiarse la fecha de su perfil para "adelantarse" y hacerse dueño (is_owner usa esa fecha).
--  2. Los nombres de usuario son únicos (sin distinguir mayúsculas) y las cuentas nuevas reciben uno libre.
--  3. Una publicación solo puede llevar el nombre de usuario real de su autor.
--  4. Los enlaces de las publicaciones y el logo del perfil solo pueden ser http(s).
--  5. Contador de visitas por publicación (tabla aparte, para no disparar el tiempo real en cada visita).

-- ---------- 1. Perfiles: solo se edita el nombre; la fecha la pone el servidor ----------

revoke update on public.profiles from authenticated, anon;
grant update (username) on public.profiles to authenticated;

create or replace function public.profiles_force_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;

drop trigger if exists profiles_created_at on public.profiles;
create trigger profiles_created_at
  before insert on public.profiles
  for each row execute function public.profiles_force_created_at();

-- ---------- 2. Nombres de usuario únicos ----------

-- Si ya había nombres repetidos, el más antiguo se queda con el suyo y los demás reciben un sufijo.
with ranked as (
  select id, row_number() over (partition by lower(username) order by created_at asc, id asc) as rn
  from public.profiles
)
update public.profiles p
set username = left(p.username, 24) || '-' || substr(p.id::text, 1, 4)
from ranked r
where r.id = p.id and r.rn > 1;

-- Las publicaciones copian el nombre de su autor: se alinean con el perfil.
update public.projects pr
set author_username = p.username
from public.profiles p
where pr.author_id = p.id and pr.author_username is distinct from p.username;

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

-- Solo alfabeto latino (con tildes y ñ): evita nombres que se ven iguales pero usan letras de otros alfabetos.
alter table public.profiles drop constraint if exists profiles_username_latin;
alter table public.profiles add constraint profiles_username_latin check (username ~ '^[a-zA-Z0-9À-ɏ._-]+$') not valid;

-- Si alguien cambia su nombre de usuario, sus publicaciones lo siguen (si no, el enlace /u/nombre de cada una se rompería).
create or replace function public.profiles_sync_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    update public.projects set author_username = new.username where author_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_username_sync on public.profiles;
create trigger profiles_username_sync
  after update of username on public.profiles
  for each row execute function public.profiles_sync_username();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  base text;
  candidate text;
  n integer := 0;
begin
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.email), ''),
    'usuario'
  );
  base := coalesce(
    nullif(left(regexp_replace(split_part(raw_name, '@', 1), '[^a-zA-Z0-9À-ɏ._-]+', '', 'g'), 30), ''),
    'usuario'
  );
  candidate := base;

  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := left(base, 30 - length(n::text) - 1) || '-' || n;
  end loop;

  begin
    insert into public.profiles (id, username, created_at)
    values (new.id, candidate, (extract(epoch from now()) * 1000)::bigint)
    on conflict (id) do nothing;
  exception when unique_violation then
    -- Otra cuenta tomó el nombre justo ahora: se usa uno derivado del id, que no se repite.
    insert into public.profiles (id, username, created_at)
    values (new.id, left(base, 24) || '-' || substr(new.id::text, 1, 5), (extract(epoch from now()) * 1000)::bigint)
    on conflict (id) do nothing;
  end;

  return new;
end;
$$;

-- ---------- 3. Una publicación solo lleva el nombre real de su autor ----------

drop policy if exists "crear como yo" on public.projects;
create policy "crear como yo" on public.projects for insert
  with check (
    author_id = (select auth.uid())
    and (select public.is_owner())
    and likes = 0
    and views = 0
    and author_username = (select username from public.profiles where id = (select auth.uid()))
  );

-- ---------- 4. Solo enlaces http(s) ----------

create or replace function public.all_http(urls text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(u ~* '^https?://'), true) from unnest(urls) as u;
$$;

-- "not valid": las filas antiguas no se revisan, pero todo lo nuevo sí.
alter table public.projects drop constraint if exists projects_links_http;
alter table public.projects add constraint projects_links_http check (public.all_http(links)) not valid;

alter table public.site_profile drop constraint if exists site_profile_logo_http;
alter table public.site_profile add constraint site_profile_logo_http
  check (logo_url is null or logo_url ~* '^https?://') not valid;

-- ---------- 5. Visitas ----------

create table if not exists public.project_views (
  project_id uuid primary key references public.projects(id) on delete cascade,
  views bigint not null default 0 check (views >= 0)
);

alter table public.project_views enable row level security;

drop policy if exists "visitas visibles" on public.project_views;
create policy "visitas visibles" on public.project_views for select using (true);

create or replace function public.bump_view(p_project_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  if not exists (select 1 from public.projects where id = p_project_id and status = 'published') then
    return 0;
  end if;

  insert into public.project_views (project_id, views)
  values (p_project_id, 1)
  on conflict (project_id) do update set views = public.project_views.views + 1
  returning views into total;

  return total;
end;
$$;

grant execute on function public.bump_view(uuid) to anon, authenticated;
