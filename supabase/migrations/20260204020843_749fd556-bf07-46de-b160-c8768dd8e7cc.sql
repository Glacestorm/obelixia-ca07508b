-- Añadir columna CNO (Clasificación Nacional de Ocupaciones) a empleados y contratos
-- Obligatorio desde 15/02/2022 por Real Decreto 504/2022

-- 1. Añadir campo CNO a empleados
ALTER TABLE public.erp_hr_employees 
ADD COLUMN IF NOT EXISTS cno_code TEXT,
ADD COLUMN IF NOT EXISTS cno_description TEXT;

-- 2. Añadir campo CNO a contratos
ALTER TABLE public.erp_hr_contracts 
ADD COLUMN IF NOT EXISTS cno_code TEXT,
ADD COLUMN IF NOT EXISTS cno_description TEXT;

-- 3. Crear tabla de catálogo CNO para referencia
CREATE TABLE IF NOT EXISTS public.erp_hr_cno_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  group_level INTEGER NOT NULL DEFAULT 4, -- 1=Gran Grupo, 2=Subgrupo, 3=Grupo, 4=Ocupación
  parent_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_cno_catalog_code ON public.erp_hr_cno_catalog(code);
CREATE INDEX IF NOT EXISTS idx_cno_catalog_description ON public.erp_hr_cno_catalog USING gin(to_tsvector('spanish', description));
CREATE INDEX IF NOT EXISTS idx_employees_cno ON public.erp_hr_employees(cno_code);
CREATE INDEX IF NOT EXISTS idx_contracts_cno ON public.erp_hr_contracts(cno_code);

-- 5. Habilitar RLS
ALTER TABLE public.erp_hr_cno_catalog ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de acceso (catálogo público de lectura para usuarios autenticados)
CREATE POLICY "CNO catalog is readable by all authenticated users"
  ON public.erp_hr_cno_catalog FOR SELECT
  TO authenticated
  USING (true);

-- 7. Comentarios para documentación
COMMENT ON COLUMN public.erp_hr_employees.cno_code IS 'Código CNO (Clasificación Nacional de Ocupaciones) - Obligatorio para Sistema RED desde 15/02/2022';
COMMENT ON COLUMN public.erp_hr_contracts.cno_code IS 'Código CNO del contrato - Obligatorio para Contrat@ y TGSS';
COMMENT ON TABLE public.erp_hr_cno_catalog IS 'Catálogo oficial de Códigos Nacionales de Ocupación (Tabla T-90 Sistema RED)';