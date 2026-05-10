-- Kaswise v1.0 Storage Buckets
-- Phase 0.2: Storage setup for receipts and voice inputs

-- Create receipts bucket (private per-user)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Create voice-inputs bucket (private per-user, auto-delete by Edge Function)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-inputs',
  'voice-inputs',
  false,
  5242880, -- 5MB
  array['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

-- RLS policies for receipts bucket
create policy "receipts_select_own"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "receipts_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "receipts_update_own"
on storage.objects for update
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "receipts_delete_own"
on storage.objects for delete
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for voice-inputs bucket
create policy "voice_inputs_select_own"
on storage.objects for select
using (
  bucket_id = 'voice-inputs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "voice_inputs_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'voice-inputs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "voice_inputs_update_own"
on storage.objects for update
using (
  bucket_id = 'voice-inputs'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'voice-inputs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "voice_inputs_delete_own"
on storage.objects for delete
using (
  bucket_id = 'voice-inputs'
  and auth.uid()::text = (storage.foldername(name))[1]
);