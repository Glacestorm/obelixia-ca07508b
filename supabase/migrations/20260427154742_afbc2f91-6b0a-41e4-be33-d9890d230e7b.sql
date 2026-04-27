-- ============================================================================
-- CASUISTICA-FECHAS-01 — Fase C1: hardening de erp_hr_payroll_incidents
-- ----------------------------------------------------------------------------
-- Reutiliza la tabla existente. NO crea tablas nuevas. NO toca RLS.
-- Añade columnas de soft-delete + versionado + trazabilidad de comunicación.
-- Añade triggers de validación, protección y bloqueo de borrado físico.
-- Añade índices parciales para queries activas.
-- ============================================================================

-- A.1 — Columnas nuevas (idempotentes, defaults seguros, sin UPDATE masivo)
ALTER TABLE public.erp_hr_payroll_incidents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text NULL,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS legal_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_communication_type text NULL;

COMMENT ON COLUMN public.erp_hr_payroll_incidents.deleted_at IS
  'Soft-delete timestamp. NULL = activa. Set por trigger o app, NUNCA borrado físico si applied_at IS NOT NULL.';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.version IS
  'Incrementa al modificar datos económicos/fechas de incidencia ya aplicada (Fase C4 conectará recálculo).';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.official_communication_type IS
  'Tipo de comunicación oficial pendiente: FDI|AFI|DELTA|INSS|TGSS|SEPE. NO dispara envío — solo trazabilidad. Fase D conectará engines.';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.legal_review_required IS
  'Marca para revisión obligatoria por asesoría laboral antes de aplicar a nómina.';

-- A.2 — Función validate_payroll_incident_type
CREATE OR REPLACE FUNCTION public.validate_payroll_incident_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.incident_type NOT IN (
    -- Legacy ya en uso (Fase C0 confirmó valores reales)
    'variable',
    'correction',
    'modification',
    'retribution_in_kind',
    -- Nuevos tipos Fase C (PDF "Procesos entre fechas")
    'pnr',
    'reduccion_jornada_guarda_legal',
    'atrasos_regularizacion',
    'desplazamiento_temporal',
    'suspension_empleo_sueldo',
    'reduction',
    'otra'
  ) THEN
    RAISE EXCEPTION 'incident_type "%" no permitido. IT/AT/EP usan erp_hr_it_processes; nacimiento/cuidado menor usa erp_hr_leave_requests.', NEW.incident_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- A.3 — Función validate_payroll_incident_dates
CREATE OR REPLACE FUNCTION public.validate_payroll_incident_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Coherencia de rango de fechas (sólo si ambas presentes)
  IF NEW.applies_from IS NOT NULL
     AND NEW.applies_to IS NOT NULL
     AND NEW.applies_to < NEW.applies_from THEN
    RAISE EXCEPTION 'applies_to (%) anterior a applies_from (%)',
      NEW.applies_to, NEW.applies_from
      USING ERRCODE = 'check_violation';
  END IF;

  -- Rango válido de porcentaje
  IF NEW.percent IS NOT NULL
     AND (NEW.percent < 0 OR NEW.percent > 100) THEN
    RAISE EXCEPTION 'percent fuera de rango [0,100]: %', NEW.percent
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lista cerrada de canales de comunicación oficial
  IF NEW.official_communication_type IS NOT NULL
     AND NEW.official_communication_type NOT IN
         ('FDI','AFI','DELTA','INSS','TGSS','SEPE') THEN
    RAISE EXCEPTION 'official_communication_type "%" no permitido', NEW.official_communication_type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- A.4 — Función protect_applied_payroll_incidents
CREATE OR REPLACE FUNCTION public.protect_applied_payroll_incidents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Inmutabilidad de claves de tenant/empleado (siempre)
  IF NEW.company_id <> OLD.company_id THEN
    RAISE EXCEPTION 'No se puede cambiar company_id de una incidencia (cross-tenant prohibido)'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.employee_id <> OLD.employee_id THEN
    RAISE EXCEPTION 'No se puede cambiar employee_id de una incidencia'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Si ya está aplicada a nómina, exigir bump de version al modificar datos económicos
  IF OLD.applied_at IS NOT NULL AND OLD.applied_to_record_id IS NOT NULL THEN
    IF (NEW.amount IS DISTINCT FROM OLD.amount
        OR NEW.units IS DISTINCT FROM OLD.units
        OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
        OR NEW.percent IS DISTINCT FROM OLD.percent
        OR NEW.applies_from IS DISTINCT FROM OLD.applies_from
        OR NEW.applies_to IS DISTINCT FROM OLD.applies_to
        OR NEW.incident_type IS DISTINCT FROM OLD.incident_type)
       AND NEW.version <= OLD.version THEN
      RAISE EXCEPTION 'Modificación de incidencia aplicada (applied_at=%) requiere incrementar version (% → debe ser > %)',
        OLD.applied_at, NEW.version, OLD.version
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- A.5 — Función prevent_delete_applied_incidents
CREATE OR REPLACE FUNCTION public.prevent_delete_applied_incidents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.applied_at IS NOT NULL THEN
    RAISE EXCEPTION 'Incidencia aplicada (id=%, applied_at=%) no puede borrarse físicamente. Usar soft-delete (deleted_at).',
      OLD.id, OLD.applied_at
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- A.6 — Triggers (idempotentes)
DROP TRIGGER IF EXISTS trg_validate_payroll_incident_type
  ON public.erp_hr_payroll_incidents;
CREATE TRIGGER trg_validate_payroll_incident_type
  BEFORE INSERT OR UPDATE ON public.erp_hr_payroll_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payroll_incident_type();

DROP TRIGGER IF EXISTS trg_validate_payroll_incident_dates
  ON public.erp_hr_payroll_incidents;
CREATE TRIGGER trg_validate_payroll_incident_dates
  BEFORE INSERT OR UPDATE ON public.erp_hr_payroll_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payroll_incident_dates();

DROP TRIGGER IF EXISTS trg_protect_applied_payroll_incidents
  ON public.erp_hr_payroll_incidents;
CREATE TRIGGER trg_protect_applied_payroll_incidents
  BEFORE UPDATE ON public.erp_hr_payroll_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_applied_payroll_incidents();

DROP TRIGGER IF EXISTS trg_prevent_delete_applied_incidents
  ON public.erp_hr_payroll_incidents;
CREATE TRIGGER trg_prevent_delete_applied_incidents
  BEFORE DELETE ON public.erp_hr_payroll_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_applied_incidents();

-- A.7 — Índices parciales para queries activas
CREATE INDEX IF NOT EXISTS idx_payroll_incidents_employee_dates_active
  ON public.erp_hr_payroll_incidents (employee_id, applies_from, applies_to)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_incidents_official_pending
  ON public.erp_hr_payroll_incidents (company_id, official_communication_type)
  WHERE requires_external_filing = true AND deleted_at IS NULL;