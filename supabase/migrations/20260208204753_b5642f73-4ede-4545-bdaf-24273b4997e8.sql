-- ===========================================
-- SISTEMA DE DATOS DEMO PROFESIONALES
-- ===========================================

-- Tabla de configuración del modo demo
CREATE TABLE IF NOT EXISTS public.demo_mode_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    is_demo_mode_active boolean DEFAULT false,
    demo_dataset text DEFAULT 'all', -- 'galia', 'crm', 'erp', 'banking', 'all'
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de datos demo para GALIA (expedientes de subvenciones)
CREATE TABLE IF NOT EXISTS public.demo_galia_expedientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_expediente text NOT NULL,
    titulo text NOT NULL,
    beneficiario_nombre text NOT NULL,
    beneficiario_cif text,
    beneficiario_tipo text, -- 'empresa', 'ayuntamiento', 'asociacion', 'autonomo'
    municipio text NOT NULL,
    provincia text NOT NULL,
    ccaa text NOT NULL,
    programa text, -- 'LEADER', 'FEDER', 'FEADER', 'PRTR'
    convocatoria text,
    importe_solicitado numeric(12,2),
    importe_aprobado numeric(12,2),
    importe_justificado numeric(12,2),
    porcentaje_ayuda numeric(5,2),
    estado text, -- 'borrador', 'presentado', 'en_estudio', 'aprobado', 'en_ejecucion', 'justificado', 'cerrado', 'denegado'
    fecha_solicitud date,
    fecha_resolucion date,
    fecha_fin_ejecucion date,
    sector_cnae text,
    descripcion_proyecto text,
    empleos_creados integer DEFAULT 0,
    empleos_mantenidos integer DEFAULT 0,
    tecnico_asignado text,
    puntuacion_riesgo integer, -- 0-100
    documentos_pendientes integer DEFAULT 0,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla de datos demo para CRM (clientes y oportunidades)
CREATE TABLE IF NOT EXISTS public.demo_crm_clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial text NOT NULL,
    razon_social text,
    cif text,
    sector text,
    cnae text,
    tipo_cliente text, -- 'empresa', 'autonomo', 'particular', 'entidad_publica'
    segmento text, -- 'pyme', 'gran_cuenta', 'micro', 'startup'
    estado text, -- 'prospecto', 'lead', 'cliente_activo', 'cliente_inactivo', 'churned'
    scoring integer, -- 0-100
    facturacion_anual numeric(14,2),
    empleados integer,
    direccion text,
    municipio text,
    provincia text,
    pais text DEFAULT 'España',
    telefono text,
    email text,
    web text,
    gestor_asignado text,
    fecha_alta date,
    fecha_ultima_interaccion date,
    valor_lifetime numeric(14,2),
    productos_contratados text[],
    tags text[],
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla de oportunidades CRM
CREATE TABLE IF NOT EXISTS public.demo_crm_oportunidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.demo_crm_clientes(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    descripcion text,
    valor numeric(14,2),
    probabilidad integer, -- 0-100
    etapa text, -- 'prospección', 'calificación', 'propuesta', 'negociación', 'cierre', 'ganada', 'perdida'
    producto text,
    fecha_creacion date,
    fecha_cierre_esperado date,
    fecha_cierre_real date,
    motivo_perdida text,
    competidor text,
    gestor text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla de datos demo para ERP (facturas y finanzas)
CREATE TABLE IF NOT EXISTS public.demo_erp_facturas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_factura text NOT NULL,
    cliente_nombre text NOT NULL,
    cliente_cif text,
    tipo text, -- 'emitida', 'recibida'
    concepto text,
    base_imponible numeric(14,2),
    iva_porcentaje numeric(5,2) DEFAULT 21,
    iva_importe numeric(14,2),
    irpf_porcentaje numeric(5,2) DEFAULT 0,
    irpf_importe numeric(14,2) DEFAULT 0,
    total numeric(14,2),
    estado text, -- 'borrador', 'emitida', 'enviada', 'cobrada', 'vencida', 'impagada', 'anulada'
    fecha_emision date,
    fecha_vencimiento date,
    fecha_cobro date,
    forma_pago text,
    cuenta_contable text,
    centro_coste text,
    proyecto text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla de datos demo para sector bancario
CREATE TABLE IF NOT EXISTS public.demo_banking_operaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nombre text NOT NULL,
    cliente_tipo text, -- 'particular', 'empresa', 'institucional'
    producto text, -- 'cuenta_corriente', 'deposito', 'prestamo', 'hipoteca', 'fondos', 'seguros'
    tipo_operacion text, -- 'apertura', 'cancelacion', 'renovacion', 'modificacion', 'riesgo'
    importe numeric(14,2),
    tae numeric(5,2),
    plazo_meses integer,
    oficina text,
    gestor text,
    estado text, -- 'pendiente', 'en_estudio', 'aprobada', 'formalizada', 'activa', 'cancelada', 'vencida'
    riesgo_nivel text, -- 'bajo', 'medio', 'alto', 'muy_alto'
    scoring_crediticio integer, -- 0-1000
    fecha_solicitud date,
    fecha_formalizacion date,
    fecha_vencimiento date,
    garantias text[],
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.demo_mode_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_galia_expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_crm_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_crm_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_erp_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_banking_operaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para demo_mode_config (usuarios autenticados pueden ver/gestionar su config)
CREATE POLICY "Users can manage their demo config" ON public.demo_mode_config
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Políticas para tablas demo (lectura pública para todos los autenticados)
CREATE POLICY "Demo data is readable by authenticated users" ON public.demo_galia_expedientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Demo CRM data is readable" ON public.demo_crm_clientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Demo CRM oportunidades readable" ON public.demo_crm_oportunidades
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Demo ERP facturas readable" ON public.demo_erp_facturas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Demo banking readable" ON public.demo_banking_operaciones
    FOR SELECT TO authenticated USING (true);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_demo_galia_estado ON public.demo_galia_expedientes(estado);
CREATE INDEX IF NOT EXISTS idx_demo_galia_provincia ON public.demo_galia_expedientes(provincia);
CREATE INDEX IF NOT EXISTS idx_demo_crm_sector ON public.demo_crm_clientes(sector);
CREATE INDEX IF NOT EXISTS idx_demo_crm_estado ON public.demo_crm_clientes(estado);
CREATE INDEX IF NOT EXISTS idx_demo_erp_estado ON public.demo_erp_facturas(estado);
CREATE INDEX IF NOT EXISTS idx_demo_banking_producto ON public.demo_banking_operaciones(producto);