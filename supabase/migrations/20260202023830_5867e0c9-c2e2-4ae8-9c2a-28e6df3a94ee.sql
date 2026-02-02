-- Fix search_path for the legal trigger function
CREATE OR REPLACE FUNCTION public.update_legal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;