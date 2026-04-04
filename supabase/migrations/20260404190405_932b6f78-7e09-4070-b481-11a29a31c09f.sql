
-- =============================================
-- FASE F: Motor de Nómina — Tablas de soporte
-- =============================================

-- Conceptos retributivos personalizados por empleado
CREATE TABLE public.erp_hr_employee_custom_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  employee_id UUID NOT NULL,
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  nature TEXT NOT NULL DEFAULT 'salarial',
  concept_type TEXT NOT NULL DEFAULT 'earning',
  calculation_type TEXT NOT NULL DEFAULT 'fixed',
  value NUMERIC(12,2) DEFAULT 0,
  formula TEXT,
  algorithm JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 100,
  ss_computable BOOLEAN DEFAULT true,
  irpf_computable BOOLEAN DEFAULT true,
  embargable BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_employee_custom_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage custom concepts"
  ON public.erp_hr_employee_custom_concepts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_custom_concepts_employee ON public.erp_hr_employee_custom_concepts(employee_id);
CREATE INDEX idx_custom_concepts_active ON public.erp_hr_employee_custom_concepts(is_active);

CREATE TRIGGER update_erp_hr_employee_custom_concepts_updated_at
  BEFORE UPDATE ON public.erp_hr_employee_custom_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Textos de recibo de salario (OM 27/12/1994)
CREATE TABLE public.erp_hr_payslip_texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  text_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'footer',
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_hr_payslip_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage payslip texts"
  ON public.erp_hr_payslip_texts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_payslip_texts_company ON public.erp_hr_payslip_texts(company_id);

CREATE TRIGGER update_erp_hr_payslip_texts_updated_at
  BEFORE UPDATE ON public.erp_hr_payslip_texts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
