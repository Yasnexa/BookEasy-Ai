/*
# Fix business-media storage RLS policies — column reference bug

## Root cause
The INSERT/UPDATE/DELETE policies used `storage.foldername(name)` inside an
EXISTS subquery over `businesses b`. Because `businesses` also has a `name`
column, PostgreSQL resolved the unqualified `name` to `b.name` (the business
name string) instead of the outer `storage.objects.name` (the file path).

So the check `b.id = (storage.foldername(b.name))[1]` compared the business UUID
against the first folder of the business NAME — which never matches, rejecting
every upload with "row-level security policy".

## Fix
Qualify the outer reference as `storage.objects.name` so PostgreSQL reads the
storage object's file path, extracts the business-id folder prefix, and matches
it against `businesses.id`.
*/

DROP POLICY IF EXISTS "business_media_insert_owner" ON storage.objects;
CREATE POLICY "business_media_insert_owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(storage.objects.name))[1])::uuid
  )
);

DROP POLICY IF EXISTS "business_media_update_owner" ON storage.objects;
CREATE POLICY "business_media_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(storage.objects.name))[1])::uuid
  )
)
WITH CHECK (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(storage.objects.name))[1])::uuid
  )
);

DROP POLICY IF EXISTS "business_media_delete_owner" ON storage.objects;
CREATE POLICY "business_media_delete_owner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-media'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id = ((storage.foldername(storage.objects.name))[1])::uuid
  )
);
