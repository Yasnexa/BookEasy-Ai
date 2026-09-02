/*
# Create business-media storage bucket with owner-scoped RLS policies

## Purpose
Business owners need to upload logo and cover images for their business
profile. This creates a public storage bucket with RLS policies that allow
each authenticated business owner to manage only files under their own
business folder.

## Bucket
- Name: `business-media`
- Public: true (logos/covers are public-facing business info)

## RLS Policies
- SELECT: anyone can read
- INSERT/UPDATE/DELETE: the authenticated user must own the business matching
  the folder prefix (first path segment = business id)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- SELECT: public read for business-facing images
DROP POLICY IF EXISTS "business_media_public_read" ON storage.objects;
CREATE POLICY "business_media_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-media');

-- INSERT: owner of the business matching the folder prefix
DROP POLICY IF EXISTS "business_media_insert_owner" ON storage.objects;
CREATE POLICY "business_media_insert_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(name))[1])::uuid
  )
);

-- UPDATE: owner of the business matching the folder prefix
DROP POLICY IF EXISTS "business_media_update_owner" ON storage.objects;
CREATE POLICY "business_media_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(name))[1])::uuid
  )
)
WITH CHECK (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(name))[1])::uuid
  )
);

-- DELETE: owner of the business matching the folder prefix
DROP POLICY IF EXISTS "business_media_delete_owner" ON storage.objects;
CREATE POLICY "business_media_delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(name))[1])::uuid
  )
);
