-- Fix audit_trigger_func to cast record_id correctly
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name, 
    record_id, 
    action, 
    old_data, 
    new_data, 
    user_id,
    created_at
  )
  VALUES (
    TG_TABLE_NAME, 
    COALESCE(NEW.id, OLD.id)::uuid, 
    TG_OP, 
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;