-- Create predictions table to store AI extraction results
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Extracted fields
  brand TEXT,
  product_family TEXT,
  model_number TEXT,
  serial_number TEXT,
  
  -- Confidence scores (0-1)
  brand_confidence DECIMAL(3,2),
  product_family_confidence DECIMAL(3,2),
  model_number_confidence DECIMAL(3,2),
  serial_number_confidence DECIMAL(3,2),
  
  -- Processing metadata
  processing_method TEXT NOT NULL, -- 'llm', 'ocr', 'rule_based', 'hybrid'
  processing_time_ms INTEGER,
  model_version TEXT,
  
  -- Raw extraction data for debugging
  raw_ocr_text TEXT,
  raw_llm_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for predictions table
CREATE POLICY "predictions_select_own" ON public.predictions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own" ON public.predictions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "predictions_update_own" ON public.predictions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "predictions_delete_own" ON public.predictions 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_predictions_image_id ON public.predictions(image_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at);
