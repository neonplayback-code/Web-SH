-- Overdrive - Box, PARTE 2: almacenamiento de imágenes y videos.
-- Ejecútalo DESPUÉS de 1-tablas.sql, en otra consulta nueva del SQL Editor.

-- ---------- Almacenamiento: imágenes y videos ----------
-- Bucket público para leer. Cada usuario solo escribe en users/{su-id}/...
-- Límite del bucket: 100 MB (los videos) y solo MIME types de imagen/video seguros.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: leer" on storage.objects;
create policy "media: leer" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media: subir a mi carpeta" on storage.objects;
create policy "media: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (
    (select public.is_owner())
    and bucket_id = 'media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "media: actualizar en mi carpeta" on storage.objects;
create policy "media: actualizar en mi carpeta" on storage.objects for update to authenticated
  using (
    (select public.is_owner())
    and bucket_id = 'media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    (select public.is_owner())
    and bucket_id = 'media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "media: borrar en mi carpeta" on storage.objects;
create policy "media: borrar en mi carpeta" on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
