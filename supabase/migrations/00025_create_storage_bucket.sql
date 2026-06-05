-- ============================================================================
-- PickHub – Create storage bucket for Pick'em assets
-- Migration: 00025_create_storage_bucket
-- ============================================================================
-- Creates the pickem-assets bucket for event logos and other media.
-- Bucket is public for reading; authenticated users may upload/update/delete.
-- Actual ownership validation is handled server-side in the action layer.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pickem-assets',
  'pickem-assets',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload to pickem-assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'pickem-assets');

-- Allow authenticated users to update (e.g. upsert)
create policy "Authenticated users can update pickem-assets"
on storage.objects for update
to authenticated
using (bucket_id = 'pickem-assets');

-- Allow authenticated users to delete
create policy "Authenticated users can delete from pickem-assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'pickem-assets');

-- Allow public read (default for public buckets, but explicit for safety)
create policy "Public can read from pickem-assets"
on storage.objects for select
to public
using (bucket_id = 'pickem-assets');
