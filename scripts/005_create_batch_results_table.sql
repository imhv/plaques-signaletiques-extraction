-- Create batch_results table to store individual results within evaluation batches
CREATE TABLE IF NOT EXISTS public.batch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.evaluation_batches(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  ground_truth_id UUID REFERENCES public.ground_truth(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Field-level accuracy scores
  brand_match BOOLEAN,
  product_family_match BOOLEAN,
  model_number_match BOOLEAN,
  serial_number_match BOOLEAN,
  overall_match BOOLEAN,
  
  -- Detailed comparison
  comparison_details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique results per batch/image combination
  UNIQUE(batch_id, image_id)
);

-- Enable Row Level Security
ALTER TABLE public.batch_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for batch_results table
CREATE POLICY "batch_results_select_own" ON public.batch_results 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "batch_results_insert_own" ON public.batch_results 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "batch_results_update_own" ON public.batch_results 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "batch_results_delete_own" ON public.batch_results 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_results_batch_id ON public.batch_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_image_id ON public.batch_results(image_id);
CREATE INDEX IF NOT EXISTS idx_batch_results_user_id ON public.batch_results(user_id);
