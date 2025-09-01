-- Create ground_truth table to store manually verified correct values
CREATE TABLE IF NOT EXISTS public.ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Manually verified correct values
  brand TEXT,
  product_family TEXT,
  model_number TEXT,
  serial_number TEXT,
  
  -- Verification metadata
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one ground truth per image
  UNIQUE(image_id)
);

-- Enable Row Level Security
ALTER TABLE public.ground_truth ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ground_truth table
CREATE POLICY "ground_truth_select_own" ON public.ground_truth 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ground_truth_insert_own" ON public.ground_truth 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ground_truth_update_own" ON public.ground_truth 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ground_truth_delete_own" ON public.ground_truth 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ground_truth_image_id ON public.ground_truth(image_id);
CREATE INDEX IF NOT EXISTS idx_ground_truth_user_id ON public.ground_truth(user_id);
CREATE INDEX IF NOT EXISTS idx_ground_truth_verified_by ON public.ground_truth(verified_by);
