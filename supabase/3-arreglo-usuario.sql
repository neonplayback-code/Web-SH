-- Quita el correo del nombre de usuario público.
-- Cambia 'alchemystudios' por el nombre que quieras mostrar (sin espacios ni @) y pulsa Run.

update public.profiles set username = 'alchemystudios' where username like '%@%';
update public.projects set author_username = 'alchemystudios' where author_username like '%@%';

-- Para las cuentas nuevas: si alguien escribe un correo como nombre, solo se guarda lo anterior a la @.
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
