-- Create evaluation_batches table to track batch evaluation runs
CREATE TABLE IF NOT EXISTS public.evaluation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Batch metadata
  name TEXT NOT NULL,
  description TEXT,
  total_images INTEGER NOT NULL DEFAULT 0,
  processed_images INTEGER NOT NULL DEFAULT 0,
  
  -- Evaluation results
  overall_accuracy DECIMAL(5,2), -- percentage
  brand_accuracy DECIMAL(5,2),
  product_family_accuracy DECIMAL(5,2),
  model_number_accuracy DECIMAL(5,2),
  serial_number_accuracy DECIMAL(5,2),
  
  -- Processing info
  processing_method TEXT NOT NULL,
  model_version TEXT,
  total_processing_time_ms INTEGER,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.evaluation_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for evaluation_batches table
CREATE POLICY "evaluation_batches_select_own" ON public.evaluation_batches 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "evaluation_batches_insert_own" ON public.evaluation_batches 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evaluation_batches_update_own" ON public.evaluation_batches 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "evaluation_batches_delete_own" ON public.evaluation_batches 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluation_batches_user_id ON public.evaluation_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_batches_status ON public.evaluation_batches(status);
CREATE INDEX IF NOT EXISTS idx_evaluation_batches_created_at ON public.evaluation_batches(created_at);
