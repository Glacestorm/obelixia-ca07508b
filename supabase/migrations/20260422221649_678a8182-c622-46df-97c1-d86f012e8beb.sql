
-- ============================================
-- S9.22 — Acuses de recibo y revisión interna de nóminas
-- ============================================

-- ============================================
-- 1) hr_payroll_acknowledgments
-- ============================================
CREATE TABLE public.hr_payroll_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id uuid NOT NULL REFERENCES public.hr_payroll_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid NOT NULL,
  user_agent text,
  ip_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_payroll_ack_unique UNIQUE (payroll_record_id, employee_id)
);

CREATE INDEX idx_hr_payroll_ack_employee ON public.hr_payroll_acknowledgments(employee_id);
CREATE INDEX idx_hr_payroll_ack_record ON public.hr_payroll_acknowledgments(payroll_record_id);
CREATE INDEX idx_hr_payroll_ack_company ON public.hr_payroll_acknowledgments(company_id);

ALTER TABLE public.hr_payroll_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Empleado: SELECT propio
CREATE POLICY "employees_read_own_ack"
ON public.hr_payroll_acknowledgments
FOR SELECT
TO authenticated
USING (employee_id = public.get_employee_id_for_auth_user());

-- Empleado: INSERT propio (solo su employee_id, acknowledged_by debe ser auth.uid())
CREATE POLICY "employees_insert_own_ack"
ON public.hr_payroll_acknowledgments
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.get_employee_id_for_auth_user()
  AND acknowledged_by = auth.uid()
);

-- RRHH/Admin: SELECT de su empresa
CREATE POLICY "hr_admin_read_company_ack"
ON public.hr_payroll_acknowledgments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
);

-- Admin: UPDATE/DELETE
CREATE POLICY "admin_update_ack"
ON public.hr_payroll_acknowledgments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_delete_ack"
ON public.hr_payroll_acknowledgments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- 2) hr_payroll_objections (Revisión interna)
-- ============================================
CREATE TABLE public.hr_payroll_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id uuid NOT NULL REFERENCES public.hr_payroll_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.erp_hr_employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('concepto_incorrecto','importe_incorrecto','concepto_faltante','datos_personales','otro')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','answered','closed','escalated')),
  reference_number text UNIQUE,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  hr_response text,
  hr_responded_by uuid,
  hr_responded_at timestamptz,
  closed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_payroll_obj_employee ON public.hr_payroll_objections(employee_id);
CREATE INDEX idx_hr_payroll_obj_record ON public.hr_payroll_objections(payroll_record_id);
CREATE INDEX idx_hr_payroll_obj_company_status ON public.hr_payroll_objections(company_id, status);

-- Trigger autogen reference_number REV-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION public.hr_payroll_objection_set_refnum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_seq int;
BEGIN
  IF NEW.reference_number IS NULL THEN
    v_period := to_char(now(), 'YYYYMM');
    SELECT COALESCE(MAX(CAST(split_part(reference_number, '-', 3) AS int)), 0) + 1
      INTO v_seq
      FROM public.hr_payroll_objections
      WHERE reference_number LIKE 'REV-' || v_period || '-%';
    NEW.reference_number := 'REV-' || v_period || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_payroll_obj_refnum
  BEFORE INSERT ON public.hr_payroll_objections
  FOR EACH ROW
  EXECUTE FUNCTION public.hr_payroll_objection_set_refnum();

CREATE TRIGGER trg_hr_payroll_obj_updated
  BEFORE UPDATE ON public.hr_payroll_objections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.hr_payroll_objections ENABLE ROW LEVEL SECURITY;

-- Empleado: SELECT propio
CREATE POLICY "employees_read_own_objections"
ON public.hr_payroll_objections
FOR SELECT
TO authenticated
USING (employee_id = public.get_employee_id_for_auth_user());

-- Empleado: INSERT propio (status forzado open, created_by = auth.uid)
CREATE POLICY "employees_insert_own_objections"
ON public.hr_payroll_objections
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.get_employee_id_for_auth_user()
  AND created_by = auth.uid()
  AND status = 'open'
);

-- Empleado: UPDATE propio limitado (cerrar como resuelta o reabrir si <30d)
CREATE POLICY "employees_update_own_objections"
ON public.hr_payroll_objections
FOR UPDATE
TO authenticated
USING (employee_id = public.get_employee_id_for_auth_user())
WITH CHECK (employee_id = public.get_employee_id_for_auth_user());

-- RRHH/Admin: SELECT/UPDATE
CREATE POLICY "hr_admin_read_objections"
ON public.hr_payroll_objections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
);

CREATE POLICY "hr_admin_update_objections"
ON public.hr_payroll_objections
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'hr_manager'::app_role)
);

CREATE POLICY "admin_delete_objections"
ON public.hr_payroll_objections
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- 3) hr_payroll_objection_events (Timeline)
-- ============================================
CREATE TABLE public.hr_payroll_objection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_id uuid NOT NULL REFERENCES public.hr_payroll_objections(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','status_changed','message','hr_response','attachment_added','reopened','closed','escalated')),
  actor_id uuid NOT NULL,
  actor_role text,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_payroll_obj_evt_objection ON public.hr_payroll_objection_events(objection_id, created_at DESC);

ALTER TABLE public.hr_payroll_objection_events ENABLE ROW LEVEL SECURITY;

-- SELECT: actor de la objeción (empleado dueño) o RRHH/admin
CREATE POLICY "obj_events_read"
ON public.hr_payroll_objection_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hr_payroll_objections o
    WHERE o.id = objection_id
      AND (
        o.employee_id = public.get_employee_id_for_auth_user()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'hr_manager'::app_role)
      )
  )
);

-- INSERT: dueño de la objeción o RRHH/admin
CREATE POLICY "obj_events_insert"
ON public.hr_payroll_objection_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.hr_payroll_objections o
    WHERE o.id = objection_id
      AND (
        o.employee_id = public.get_employee_id_for_auth_user()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'hr_manager'::app_role)
      )
  )
);
