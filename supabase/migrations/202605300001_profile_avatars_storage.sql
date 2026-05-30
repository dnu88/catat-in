-- Kaswise profile avatar storage
-- Public bucket with per-user write policies for Settings profile photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_select_public'
  ) then
    create policy "avatars_select_public"
    on storage.objects for select
    using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_insert_own'
  ) then
    create policy "avatars_insert_own"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_update_own'
  ) then
    create policy "avatars_update_own"
    on storage.objects for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_delete_own'
  ) then
    create policy "avatars_delete_own"
    on storage.objects for delete
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;
