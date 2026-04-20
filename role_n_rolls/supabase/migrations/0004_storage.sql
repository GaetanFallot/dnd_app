-- Role'n'Rolls — Storage buckets for user-uploaded images.
--
-- Creates a single public bucket `lore-images` used for:
--   * Lore entity portraits / icons
--   * Map background images
--   * Campaign / character thumbnails (future)
--
-- Images are organised as `{user_id}/{uuid}.{ext}` so RLS can gate writes
-- to the uploader while keeping reads public (the app already uses
-- rendered URLs in lore_entities.image_url / maps.image_url, which can
-- be visited anonymously through public share tokens).

insert into storage.buckets (id, name, public)
  values ('lore-images', 'lore-images', true)
  on conflict (id) do update set public = excluded.public;

-- Object policies ------------------------------------------------------------
-- Scope the policies to this bucket by name so they don't interfere with
-- any other bucket you may add later.

drop policy if exists "lore_images_read"    on storage.objects;
drop policy if exists "lore_images_insert"  on storage.objects;
drop policy if exists "lore_images_update"  on storage.objects;
drop policy if exists "lore_images_delete"  on storage.objects;

-- Anyone (including anonymous readers of public share pages) can read.
create policy "lore_images_read"
  on storage.objects for select
  using (bucket_id = 'lore-images');

-- Authenticated users upload into their own folder. The first path segment
-- must equal their auth uid.
create policy "lore_images_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lore-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lore_images_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lore-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lore_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lore-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
