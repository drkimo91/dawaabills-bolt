/*
# Storage bucket policies for uploads

1. Creates public storage bucket 'uploads' (if not exists)
2. Adds RLS policies allowing authenticated users to upload and read files
*/

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "uploads_insert" ON storage.objects;
CREATE POLICY "uploads_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Allow anyone to read uploaded files (public bucket)
DROP POLICY IF EXISTS "uploads_select" ON storage.objects;
CREATE POLICY "uploads_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Allow authenticated users to delete their uploads
DROP POLICY IF EXISTS "uploads_delete" ON storage.objects;
CREATE POLICY "uploads_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'uploads');
