-- Create images table to store uploaded nameplate images
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for images table
CREATE POLICY "images_select_own" ON public.images 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "images_insert_own" ON public.images 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "images_update_own" ON public.images 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "images_delete_own" ON public.images 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at);
