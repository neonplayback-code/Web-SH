-- Overdrive - Box, PARTE 1: tablas, perfiles, likes, seguridad y tiempo real.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run. Se puede repetir sin romper nada.
-- Después ejecuta la parte 2 (2-almacenamiento.sql).

-- ---------- Tablas ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 30),
  created_at bigint not null
);

create index if not exists profiles_owner_lookup on public.profiles (created_at asc, id asc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('app', 'video', 'anuncio', 'post', 'beta', 'demo', 'avance', 'link', 'short')),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 300),
  body text not null default '' check (char_length(body) <= 20000),
  cover_url text,
  media_urls text[] not null default '{}' check (cardinality(media_urls) <= 6),
  links text[] not null default '{}' check (cardinality(links) <= 12),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_username text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at bigint not null,
  updated_at bigint not null,
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0)
);

create index if not exists projects_feed on public.projects (status, created_at desc);
create index if not exists projects_type_feed on public.projects (status, type, created_at desc);
create index if not exists projects_likes_feed on public.projects (status, likes desc, created_at desc);
create index if not exists projects_author on public.projects (author_username, status, created_at desc);

create table if not exists public.project_likes (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at bigint not null,
  primary key (project_id, user_id)
);

create index if not exists project_likes_user on public.project_likes (user_id);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at bigint not null
);

create index if not exists project_updates_project on public.project_updates (project_id, created_at desc);

-- ---------- Perfil automático al registrarse ----------
-- Usa el nombre de usuario que la web manda al crear la cuenta.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
begin
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.email), ''),
    'usuario'
  );

  insert into public.profiles (id, username, created_at)
  values (
    new.id,
    coalesce(nullif(left(split_part(raw_name, '@', 1), 30), ''), 'usuario'),
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Dueño: solo la primera cuenta registrada publica ----------
-- Quien se registra primero (tú) es el dueño. El resto solo ve y da ♥.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
    and (select auth.uid()) = (select id from public.profiles order by created_at asc, id asc limit 1);
$$;

grant execute on function public.is_owner() to anon, authenticated;

-- ---------- Likes: alterna el like y mueve el contador de forma atómica ----------

create or replace function public.toggle_like(p_project_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  deleted_rows integer;
  inserted_rows integer;
  is_now_liked boolean;
  total integer;
begin
  if uid is null then
    raise exception 'Inicia sesión para dar ♥.';
  end if;

  if not exists (select 1 from public.projects where id = p_project_id and status = 'published') then
    raise exception 'Esta publicación ya no existe.';
  end if;

  delete from public.project_likes
  where project_id = p_project_id and user_id = uid;
  get diagnostics deleted_rows = row_count;

  if deleted_rows > 0 then
    is_now_liked := false;
    update public.projects
    set likes = greatest(likes - 1, 0)
    where id = p_project_id
    returning likes into total;
  else
    insert into public.project_likes (project_id, user_id, created_at)
    values (p_project_id, uid, (extract(epoch from now()) * 1000)::bigint)
    on conflict (project_id, user_id) do nothing;
    get diagnostics inserted_rows = row_count;

    is_now_liked := true;
    if inserted_rows > 0 then
      update public.projects
      set likes = likes + 1
      where id = p_project_id
      returning likes into total;
    else
      select likes into total from public.projects where id = p_project_id;
    end if;
  end if;

  return json_build_object('liked', is_now_liked, 'likes', total);
end;
$$;

grant execute on function public.toggle_like(uuid) to authenticated;

-- ---------- Seguridad de filas (RLS) ----------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_likes enable row level security;
alter table public.project_updates enable row level security;

-- Perfiles: cualquiera los lee; cada uno edita el suyo.
drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select using (true);

-- Respaldo: si una cuenta se creó antes que el trigger, la web crea su perfil al entrar.
drop policy if exists "creo mi perfil" on public.profiles;
create policy "creo mi perfil" on public.profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "edito mi perfil" on public.profiles;
create policy "edito mi perfil" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Publicaciones: lo publicado lo ve todo el mundo; los borradores solo su autor.
drop policy if exists "publicadas o propias" on public.projects;
create policy "publicadas o propias" on public.projects for select
  using (status = 'published' or author_id = (select auth.uid()));

drop policy if exists "crear como yo" on public.projects;
create policy "crear como yo" on public.projects for insert
  with check (author_id = (select auth.uid()) and (select public.is_owner()) and likes = 0 and views = 0);

drop policy if exists "editar las mías" on public.projects;
create policy "editar las mías" on public.projects for update
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists "borrar las mías" on public.projects;
create policy "borrar las mías" on public.projects for delete
  using (author_id = (select auth.uid()));

-- Nadie puede tocar el contador de likes ni las vistas desde la web: solo toggle_like.
revoke update on public.projects from authenticated, anon;
grant update (type, title, summary, body, cover_url, media_urls, links, tags, status, updated_at)
  on public.projects to authenticated;

-- Likes: cada usuario solo consulta los suyos; el conteo global está en projects.likes.
drop policy if exists "likes visibles" on public.project_likes;
create policy "likes visibles" on public.project_likes for select
  using (user_id = (select auth.uid()));

-- Avances: visibles si la publicación es visible; solo el autor los añade, edita o borra.
drop policy if exists "avances visibles" on public.project_updates;
create policy "avances visibles" on public.project_updates for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and (p.status = 'published' or p.author_id = (select auth.uid()))
  ));

drop policy if exists "avance solo del autor" on public.project_updates;
create policy "avance solo del autor" on public.project_updates for insert
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.author_id = (select auth.uid())
  ));

drop policy if exists "editar avance del autor" on public.project_updates;
create policy "editar avance del autor" on public.project_updates for update
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.author_id = (select auth.uid())
  ));

drop policy if exists "borrar avance del autor" on public.project_updates;
create policy "borrar avance del autor" on public.project_updates for delete
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.author_id = (select auth.uid())
  ));

-- ---------- Tiempo real (para que los likes y la portada se actualicen solos) ----------

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'projects') then
    alter publication supabase_realtime add table public.projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'project_updates') then
    alter publication supabase_realtime add table public.project_updates;
  end if;
end;
$$;
