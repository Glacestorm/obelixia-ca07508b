
-- V2-ES.7 Paso 1 (enriquecimiento): Ampliar conceptos con campos funcionales avanzados
-- Tabla erp_hr_payroll_concepts: añadir campos de clasificación funcional

ALTER TABLE public.erp_hr_payroll_concepts
  ADD COLUMN IF NOT EXISTS is_salary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_ss_contributable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS impacts_cra BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS impacts_irpf BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS impacts_net_payment BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS calculation_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS default_sign TEXT DEFAULT 'positive',
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.erp_hr_payroll_concepts.is_salary IS 'Concepto salarial vs extrasalarial';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.is_taxable IS 'Sujeto a tributación (alias tributa_irpf)';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.is_ss_contributable IS 'Sujeto a cotización SS (alias cotiza_ss)';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.impacts_cra IS 'Afecta al Certificado de Retenciones Anuales';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.impacts_irpf IS 'Afecta al cálculo de base IRPF';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.impacts_net_payment IS 'Afecta al líquido a percibir';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.calculation_type IS 'fixed|percentage|formula|units|days';
COMMENT ON COLUMN public.erp_hr_payroll_concepts.default_sign IS 'positive|negative';

-- Tabla erp_hr_payroll_incidents: añadir campos de trazabilidad y clasificación operativa

ALTER TABLE public.erp_hr_payroll_incidents
  ADD COLUMN IF NOT EXISTS period_year INTEGER,
  ADD COLUMN IF NOT EXISTS period_month INTEGER,
  ADD COLUMN IF NOT EXISTS percent NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS source_task_id UUID,
  ADD COLUMN IF NOT EXISTS source_document_id UUID,
  ADD COLUMN IF NOT EXISTS requires_ss_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_tax_adjustment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_external_filing BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.erp_hr_payroll_incidents.period_year IS 'Año fiscal de referencia (redundante con period_id para consultas rápidas)';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.period_month IS 'Mes de referencia 1-12 (redundante con period_id para consultas rápidas)';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.percent IS 'Porcentaje aplicable si el concepto lo requiere';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.source_task_id IS 'Tarea HR origen de la incidencia';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.source_document_id IS 'Documento del expediente origen';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.requires_ss_action IS 'Requiere acción ante la Seguridad Social';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.requires_tax_adjustment IS 'Requiere ajuste fiscal/IRPF';
COMMENT ON COLUMN public.erp_hr_payroll_incidents.requires_external_filing IS 'Requiere comunicación/presentación externa';

-- Índice para búsqueda rápida por año/mes
CREATE INDEX IF NOT EXISTS idx_payroll_incidents_year_month 
  ON public.erp_hr_payroll_incidents(company_id, period_year, period_month);
