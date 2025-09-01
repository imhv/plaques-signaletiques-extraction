-- Create storage bucket for nameplate images
INSERT INTO storage.buckets (id, name, public)
VALUES ('nameplate-images', 'nameplate-images', false);

-- Create storage policies for the nameplate-images bucket
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'nameplate-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'nameplate-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'nameplate-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
