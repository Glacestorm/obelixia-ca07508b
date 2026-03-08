
-- ============================================================
-- P9.3 — Automated Audit Trails
-- Trigger-based immutable audit logging on sensitive HR tables
-- ============================================================

-- STEP 1: Create the generic audit trigger function
CREATE OR REPLACE FUNCTION public.erp_hr_audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_changed TEXT[] := '{}';
  v_company_id UUID := NULL;
  v_record_id TEXT;
  v_category TEXT := 'data_change';
  v_severity TEXT := 'info';
  k TEXT;
BEGIN
  -- Determine action
  v_action := TG_OP;

  -- Extract record_id and company_id
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
    v_old_data := to_jsonb(OLD);
    IF to_jsonb(OLD) ? 'company_id' THEN
      v_company_id := (to_jsonb(OLD)->>'company_id')::UUID;
    END IF;
  ELSE
    v_record_id := NEW.id::TEXT;
    v_new_data := to_jsonb(NEW);
    IF to_jsonb(NEW) ? 'company_id' THEN
      v_company_id := (to_jsonb(NEW)->>'company_id')::UUID;
    END IF;
  END IF;

  -- For UPDATE, compute changed fields and capture old data
  IF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    FOR k IN SELECT jsonb_object_keys(v_new_data)
    LOOP
      IF v_old_data->k IS DISTINCT FROM v_new_data->k THEN
        v_changed := array_append(v_changed, k);
      END IF;
    END LOOP;
    -- Skip if nothing actually changed
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Classify severity based on table
  IF TG_TABLE_NAME IN ('erp_hr_sod_rules', 'erp_hr_sod_violations', 'erp_hr_security_incidents', 'erp_hr_data_classifications', 'erp_hr_masking_rules') THEN
    v_category := 'security';
    v_severity := 'high';
  ELSIF TG_TABLE_NAME IN ('erp_hr_ai_decisions', 'erp_hr_ai_bias_audits', 'erp_hr_ai_governance_policies') THEN
    v_category := 'ai_governance';
    v_severity := 'high';
  ELSIF TG_TABLE_NAME IN ('erp_hr_pay_equity_analyses', 'erp_hr_fairness_metrics', 'erp_hr_justice_cases', 'erp_hr_equity_action_plans') THEN
    v_category := 'fairness';
    v_severity := 'high';
  ELSIF TG_TABLE_NAME IN ('erp_hr_legal_contracts', 'erp_hr_legal_templates', 'erp_hr_legal_compliance_checks') THEN
    v_category := 'legal';
    v_severity := 'medium';
  ELSIF TG_TABLE_NAME IN ('erp_hr_compliance_policies', 'erp_hr_compliance_incidents') THEN
    v_category := 'compliance';
    v_severity := 'medium';
  END IF;

  -- DELETE is always high severity
  IF TG_OP = 'DELETE' THEN
    v_severity := 'critical';
  END IF;

  -- Insert audit record
  INSERT INTO public.erp_hr_audit_log (
    company_id, user_id, action, table_name, record_id,
    old_data, new_data, changed_fields, category, severity, metadata
  ) VALUES (
    v_company_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old_data,
    v_new_data,
    v_changed,
    v_category,
    v_severity,
    jsonb_build_object('trigger', TG_NAME, 'schema', TG_TABLE_SCHEMA, 'timestamp', now())
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- STEP 2: Attach triggers to sensitive tables
-- Security tables (P1)
CREATE TRIGGER audit_data_classifications AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_data_classifications FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_masking_rules AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_masking_rules FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_sod_rules AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_sod_rules FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_sod_violations AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_sod_violations FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_security_incidents AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_security_incidents FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- AI Governance tables (P2)
CREATE TRIGGER audit_ai_model_registry AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_ai_model_registry FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_ai_decisions AFTER INSERT OR UPDATE ON public.erp_hr_ai_decisions FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_ai_bias_audits AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_ai_bias_audits FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_ai_governance_policies AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_ai_governance_policies FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Fairness tables (P4)
CREATE TRIGGER audit_pay_equity AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_pay_equity_analyses FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_fairness_metrics AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_fairness_metrics FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_justice_cases AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_justice_cases FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_equity_action_plans AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_equity_action_plans FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Legal Engine tables (P6)
CREATE TRIGGER audit_legal_templates AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_legal_templates FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_legal_contracts AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_legal_contracts FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_legal_clauses AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_legal_clauses FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_legal_compliance AFTER INSERT OR UPDATE ON public.erp_hr_legal_compliance_checks FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Compliance tables (Phase 5 base)
CREATE TRIGGER audit_compliance_policies AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_compliance_policies FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_compliance_incidents AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_compliance_incidents FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Role Experience (P8) - config changes are auditable
CREATE TRIGGER audit_role_profiles AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_role_experience_profiles FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_role_dashboards AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_role_dashboards FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Digital Twin (P5)
CREATE TRIGGER audit_twin_instances AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_twin_instances FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- Workforce Planning (P3) - scenario changes
CREATE TRIGGER audit_workforce_plans AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_workforce_plans FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
CREATE TRIGGER audit_scenarios AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_scenarios FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();

-- CNAE (P7) - sector profile changes
CREATE TRIGGER audit_cnae_profiles AFTER INSERT OR UPDATE OR DELETE ON public.erp_hr_cnae_sector_profiles FOR EACH ROW EXECUTE FUNCTION public.erp_hr_audit_trigger_fn();
