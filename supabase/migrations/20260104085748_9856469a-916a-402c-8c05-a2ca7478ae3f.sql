-- Add missing impact_level column to news_improvement_insights table
-- This column is referenced by NewsNotificationSystem.tsx but doesn't exist

ALTER TABLE public.news_improvement_insights 
ADD COLUMN IF NOT EXISTS impact_level text DEFAULT 'medium';

-- Add product_connection column if it doesn't exist
ALTER TABLE public.news_improvement_insights 
ADD COLUMN IF NOT EXISTS product_connection text;

-- Update existing rows to set impact_level based on priority for consistency
UPDATE public.news_improvement_insights 
SET impact_level = COALESCE(priority, 'medium')
WHERE impact_level IS NULL OR impact_level = 'medium';

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_news_improvement_insights_status_impact 
ON public.news_improvement_insights(status, impact_level);