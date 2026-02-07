-- =====================================================
-- MÓDULO GALIA: Gestión de Ayudas LEADER con IA
-- Fase 1 - MVP: Esquema base de datos
-- =====================================================

-- Enum para tipos de beneficiario
CREATE TYPE public.galia_beneficiario_tipo AS ENUM ('empresa', 'ayuntamiento', 'asociacion', 'autonomo', 'cooperativa');

-- Enum para estados de convocatoria
CREATE TYPE public.galia_convocatoria_estado AS ENUM ('borrador', 'publicada', 'abierta', 'cerrada', 'resuelta', 'archivada');

-- Enum para estados de solicitud
CREATE TYPE public.galia_solicitud_estado AS ENUM ('borrador', 'presentada', 'en_revision', 'subsanacion', 'admitida', 'no_admitida', 'desistida');

-- Enum para estados de expediente
CREATE TYPE public.galia_expediente_estado AS ENUM ('instruccion', 'evaluacion', 'propuesta', 'resolucion', 'concedido', 'denegado', 'renunciado', 'justificacion', 'cerrado');

-- Enum para roles GALIA
CREATE TYPE public.galia_role AS ENUM ('admin', 'tecnico', 'gestor', 'auditor', 'beneficiario');

-- =====================================================
-- TABLA: galia_gal_config (Configuración de cada GAL)
-- =====================================================
CREATE TABLE public.galia_gal_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    codigo_leader TEXT UNIQUE NOT NULL,
    region TEXT NOT NULL,
    provincia TEXT,
    comarcas TEXT[],
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    web TEXT,
    logo_url TEXT,
    representante_nombre TEXT,
    representante_cargo TEXT,
    presupuesto_total NUMERIC(14, 2) DEFAULT 0,
    presupuesto_disponible NUMERIC(14, 2) DEFAULT 0,
    configuracion JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_user_roles (Roles de usuarios en GAL)
-- =====================================================
CREATE TABLE public.galia_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gal_id UUID NOT NULL REFERENCES public.galia_gal_config(id) ON DELETE CASCADE,
    role galia_role NOT NULL DEFAULT 'beneficiario',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, gal_id, role)
);

-- =====================================================
-- TABLA: galia_convocatorias
-- =====================================================
CREATE TABLE public.galia_convocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gal_id UUID NOT NULL REFERENCES public.galia_gal_config(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    presupuesto_total NUMERIC(14, 2) NOT NULL,
    presupuesto_comprometido NUMERIC(14, 2) DEFAULT 0,
    presupuesto_ejecutado NUMERIC(14, 2) DEFAULT 0,
    fecha_publicacion DATE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_resolucion DATE,
    estado galia_convocatoria_estado DEFAULT 'borrador',
    requisitos JSONB DEFAULT '[]',
    criterios_valoracion JSONB DEFAULT '[]',
    documentacion_requerida JSONB DEFAULT '[]',
    tipos_beneficiario galia_beneficiario_tipo[] DEFAULT ARRAY['empresa', 'autonomo']::galia_beneficiario_tipo[],
    importe_minimo NUMERIC(14, 2),
    importe_maximo NUMERIC(14, 2),
    porcentaje_ayuda_max NUMERIC(5, 2) DEFAULT 50.00,
    bases_url TEXT,
    publicado_boe BOOLEAN DEFAULT false,
    publicado_bopa BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gal_id, codigo)
);

-- =====================================================
-- TABLA: galia_beneficiarios
-- =====================================================
CREATE TABLE public.galia_beneficiarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    gal_id UUID NOT NULL REFERENCES public.galia_gal_config(id) ON DELETE CASCADE,
    tipo galia_beneficiario_tipo NOT NULL,
    nif TEXT NOT NULL,
    nombre TEXT NOT NULL,
    razon_social TEXT,
    representante_nombre TEXT,
    representante_nif TEXT,
    representante_cargo TEXT,
    email TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    codigo_postal TEXT,
    municipio TEXT,
    provincia TEXT,
    sector_cnae TEXT,
    actividad_principal TEXT,
    fecha_constitucion DATE,
    numero_empleados INTEGER,
    facturacion_anual NUMERIC(14, 2),
    cuenta_bancaria TEXT,
    documentos_identidad JSONB DEFAULT '[]',
    verificado BOOLEAN DEFAULT false,
    verificado_at TIMESTAMPTZ,
    verificado_by UUID REFERENCES auth.users(id),
    notas_internas TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gal_id, nif)
);

-- =====================================================
-- TABLA: galia_solicitudes
-- =====================================================
CREATE TABLE public.galia_solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convocatoria_id UUID NOT NULL REFERENCES public.galia_convocatorias(id) ON DELETE CASCADE,
    beneficiario_id UUID NOT NULL REFERENCES public.galia_beneficiarios(id) ON DELETE CASCADE,
    numero_registro TEXT,
    fecha_presentacion TIMESTAMPTZ,
    estado galia_solicitud_estado DEFAULT 'borrador',
    titulo_proyecto TEXT NOT NULL,
    descripcion_proyecto TEXT,
    objetivos JSONB DEFAULT '[]',
    presupuesto_total NUMERIC(14, 2) NOT NULL,
    importe_solicitado NUMERIC(14, 2) NOT NULL,
    porcentaje_ayuda NUMERIC(5, 2),
    ubicacion_proyecto TEXT,
    municipio_proyecto TEXT,
    empleos_crear INTEGER DEFAULT 0,
    empleos_mantener INTEGER DEFAULT 0,
    plazo_ejecucion_meses INTEGER,
    fecha_inicio_prevista DATE,
    fecha_fin_prevista DATE,
    puntuacion_elegibilidad NUMERIC(5, 2),
    elegibilidad_detalle JSONB,
    puntuacion_valoracion NUMERIC(5, 2),
    valoracion_detalle JSONB,
    documentacion_completa BOOLEAN DEFAULT false,
    requiere_subsanacion BOOLEAN DEFAULT false,
    subsanacion_detalle TEXT,
    subsanacion_fecha_limite DATE,
    asignado_tecnico_id UUID REFERENCES auth.users(id),
    notas_tecnico TEXT,
    motivo_no_admision TEXT,
    analisis_ia JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_expedientes
-- =====================================================
CREATE TABLE public.galia_expedientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL REFERENCES public.galia_solicitudes(id) ON DELETE CASCADE,
    numero_expediente TEXT NOT NULL UNIQUE,
    estado galia_expediente_estado DEFAULT 'instruccion',
    fecha_apertura TIMESTAMPTZ DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ,
    fecha_cierre TIMESTAMPTZ,
    importe_concedido NUMERIC(14, 2),
    importe_justificado NUMERIC(14, 2) DEFAULT 0,
    importe_pagado NUMERIC(14, 2) DEFAULT 0,
    porcentaje_ayuda_final NUMERIC(5, 2),
    resolucion_tipo TEXT,
    resolucion_referencia TEXT,
    resolucion_fecha DATE,
    resolucion_publicacion_url TEXT,
    condiciones_especiales JSONB DEFAULT '[]',
    hitos JSONB DEFAULT '[]',
    alertas JSONB DEFAULT '[]',
    tecnico_instructor_id UUID REFERENCES auth.users(id),
    tecnico_evaluador_id UUID REFERENCES auth.users(id),
    informe_tecnico TEXT,
    informe_tecnico_fecha DATE,
    propuesta_resolucion TEXT,
    propuesta_fecha DATE,
    motivo_denegacion TEXT,
    recurso_presentado BOOLEAN DEFAULT false,
    recurso_detalle JSONB,
    verificacion_terreno BOOLEAN DEFAULT false,
    verificacion_fecha DATE,
    verificacion_resultado JSONB,
    scoring_riesgo NUMERIC(5, 2),
    riesgo_detalle JSONB,
    analisis_ia JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_documentos
-- =====================================================
CREATE TABLE public.galia_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID REFERENCES public.galia_expedientes(id) ON DELETE CASCADE,
    solicitud_id UUID REFERENCES public.galia_solicitudes(id) ON DELETE CASCADE,
    beneficiario_id UUID REFERENCES public.galia_beneficiarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    subtipo TEXT,
    nombre_archivo TEXT NOT NULL,
    nombre_original TEXT,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    tamano_bytes BIGINT,
    hash_sha256 TEXT,
    fecha_documento DATE,
    fecha_subida TIMESTAMPTZ DEFAULT now(),
    subido_por UUID REFERENCES auth.users(id),
    es_obligatorio BOOLEAN DEFAULT false,
    validado BOOLEAN DEFAULT false,
    validado_at TIMESTAMPTZ,
    validado_por UUID REFERENCES auth.users(id),
    motivo_rechazo TEXT,
    requiere_revision BOOLEAN DEFAULT false,
    resultado_ia JSONB,
    datos_extraidos JSONB,
    confianza_extraccion NUMERIC(5, 2),
    version INTEGER DEFAULT 1,
    documento_padre_id UUID REFERENCES public.galia_documentos(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_justificaciones
-- =====================================================
CREATE TABLE public.galia_justificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES public.galia_expedientes(id) ON DELETE CASCADE,
    tipo_gasto TEXT NOT NULL,
    concepto TEXT NOT NULL,
    descripcion TEXT,
    proveedor_nombre TEXT NOT NULL,
    proveedor_nif TEXT,
    numero_factura TEXT,
    fecha_factura DATE NOT NULL,
    importe_factura NUMERIC(14, 2) NOT NULL,
    importe_elegible NUMERIC(14, 2),
    importe_subvencion NUMERIC(14, 2),
    iva_incluido BOOLEAN DEFAULT true,
    importe_iva NUMERIC(14, 2),
    documento_factura_id UUID REFERENCES public.galia_documentos(id),
    documento_pago_id UUID REFERENCES public.galia_documentos(id),
    fecha_pago DATE,
    forma_pago TEXT,
    validado BOOLEAN DEFAULT false,
    validado_at TIMESTAMPTZ,
    validado_por UUID REFERENCES auth.users(id),
    motivo_rechazo TEXT,
    coste_referencia_id UUID,
    desviacion_coste_ref NUMERIC(5, 2),
    alerta_anomalia BOOLEAN DEFAULT false,
    anomalia_tipo TEXT,
    anomalia_detalle TEXT,
    requiere_tres_ofertas BOOLEAN DEFAULT false,
    ofertas_presentadas INTEGER DEFAULT 0,
    justificacion_oferta_elegida TEXT,
    analisis_ia JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_costes_referencia
-- =====================================================
CREATE TABLE public.galia_costes_referencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL,
    subcategoria TEXT,
    descripcion TEXT NOT NULL,
    unidad TEXT NOT NULL,
    precio_minimo NUMERIC(14, 2),
    precio_maximo NUMERIC(14, 2),
    precio_medio NUMERIC(14, 2) NOT NULL,
    fuente TEXT,
    fecha_actualizacion DATE DEFAULT CURRENT_DATE,
    vigente_desde DATE DEFAULT CURRENT_DATE,
    vigente_hasta DATE,
    region TEXT,
    notas TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_interacciones_ia
-- =====================================================
CREATE TABLE public.galia_interacciones_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gal_id UUID REFERENCES public.galia_gal_config(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    expediente_id UUID REFERENCES public.galia_expedientes(id) ON DELETE SET NULL,
    solicitud_id UUID REFERENCES public.galia_solicitudes(id) ON DELETE SET NULL,
    pregunta TEXT NOT NULL,
    respuesta TEXT,
    contexto JSONB,
    intencion_detectada TEXT,
    entidades_extraidas JSONB,
    confianza NUMERIC(5, 2),
    modelo_usado TEXT,
    tokens_entrada INTEGER,
    tokens_salida INTEGER,
    tiempo_respuesta_ms INTEGER,
    derivado_tecnico BOOLEAN DEFAULT false,
    feedback_usuario INTEGER,
    feedback_comentario TEXT,
    es_resolucion BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_base_conocimiento
-- =====================================================
CREATE TABLE public.galia_base_conocimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gal_id UUID REFERENCES public.galia_gal_config(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    subcategoria TEXT,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    fuente TEXT,
    url_fuente TEXT,
    fecha_publicacion DATE,
    vigente BOOLEAN DEFAULT true,
    tags TEXT[],
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLA: galia_alertas
-- =====================================================
CREATE TABLE public.galia_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gal_id UUID NOT NULL REFERENCES public.galia_gal_config(id) ON DELETE CASCADE,
    expediente_id UUID REFERENCES public.galia_expedientes(id) ON DELETE CASCADE,
    solicitud_id UUID REFERENCES public.galia_solicitudes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    nivel TEXT NOT NULL DEFAULT 'info',
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_vencimiento DATE,
    resuelta BOOLEAN DEFAULT false,
    resuelta_at TIMESTAMPTZ,
    resuelta_por UUID REFERENCES auth.users(id),
    asignada_a UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_galia_convocatorias_gal ON public.galia_convocatorias(gal_id);
CREATE INDEX idx_galia_convocatorias_estado ON public.galia_convocatorias(estado);
CREATE INDEX idx_galia_beneficiarios_gal ON public.galia_beneficiarios(gal_id);
CREATE INDEX idx_galia_beneficiarios_nif ON public.galia_beneficiarios(nif);
CREATE INDEX idx_galia_solicitudes_conv ON public.galia_solicitudes(convocatoria_id);
CREATE INDEX idx_galia_solicitudes_benef ON public.galia_solicitudes(beneficiario_id);
CREATE INDEX idx_galia_solicitudes_estado ON public.galia_solicitudes(estado);
CREATE INDEX idx_galia_expedientes_sol ON public.galia_expedientes(solicitud_id);
CREATE INDEX idx_galia_expedientes_estado ON public.galia_expedientes(estado);
CREATE INDEX idx_galia_expedientes_numero ON public.galia_expedientes(numero_expediente);
CREATE INDEX idx_galia_documentos_exp ON public.galia_documentos(expediente_id);
CREATE INDEX idx_galia_documentos_sol ON public.galia_documentos(solicitud_id);
CREATE INDEX idx_galia_justificaciones_exp ON public.galia_justificaciones(expediente_id);
CREATE INDEX idx_galia_interacciones_session ON public.galia_interacciones_ia(session_id);
CREATE INDEX idx_galia_alertas_gal ON public.galia_alertas(gal_id);
CREATE INDEX idx_galia_alertas_pendientes ON public.galia_alertas(gal_id, resuelta) WHERE NOT resuelta;

-- =====================================================
-- FUNCIONES DE SEGURIDAD
-- =====================================================

-- Función para verificar rol en GAL
CREATE OR REPLACE FUNCTION public.galia_has_role(_user_id UUID, _gal_id UUID, _role galia_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.galia_user_roles
        WHERE user_id = _user_id
          AND gal_id = _gal_id
          AND role = _role
          AND is_active = true
    )
$$;

-- Función para verificar acceso a GAL (cualquier rol)
CREATE OR REPLACE FUNCTION public.galia_user_has_gal_access(_user_id UUID, _gal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.galia_user_roles
        WHERE user_id = _user_id
          AND gal_id = _gal_id
          AND is_active = true
    )
$$;

-- Función para verificar si es técnico o superior
CREATE OR REPLACE FUNCTION public.galia_is_tecnico_or_above(_user_id UUID, _gal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.galia_user_roles
        WHERE user_id = _user_id
          AND gal_id = _gal_id
          AND role IN ('admin', 'tecnico', 'gestor', 'auditor')
          AND is_active = true
    )
$$;

-- Función para obtener GAL ID de un beneficiario
CREATE OR REPLACE FUNCTION public.galia_get_beneficiario_gal(_beneficiario_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT gal_id FROM public.galia_beneficiarios WHERE id = _beneficiario_id
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.galia_gal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_justificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_costes_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_interacciones_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_base_conocimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_alertas ENABLE ROW LEVEL SECURITY;

-- Políticas para galia_gal_config
CREATE POLICY "GAL config visible para miembros"
    ON public.galia_gal_config FOR SELECT
    TO authenticated
    USING (public.galia_user_has_gal_access(auth.uid(), id) OR is_active = true);

CREATE POLICY "Solo admin puede editar GAL config"
    ON public.galia_gal_config FOR ALL
    TO authenticated
    USING (public.galia_has_role(auth.uid(), id, 'admin'))
    WITH CHECK (public.galia_has_role(auth.uid(), id, 'admin'));

-- Políticas para galia_user_roles
CREATE POLICY "Usuario ve sus propios roles"
    ON public.galia_user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.galia_has_role(auth.uid(), gal_id, 'admin'));

CREATE POLICY "Admin gestiona roles"
    ON public.galia_user_roles FOR ALL
    TO authenticated
    USING (public.galia_has_role(auth.uid(), gal_id, 'admin'))
    WITH CHECK (public.galia_has_role(auth.uid(), gal_id, 'admin'));

-- Políticas para galia_convocatorias
CREATE POLICY "Convocatorias públicas visibles para todos"
    ON public.galia_convocatorias FOR SELECT
    TO authenticated
    USING (estado IN ('publicada', 'abierta', 'cerrada', 'resuelta') OR public.galia_is_tecnico_or_above(auth.uid(), gal_id));

CREATE POLICY "Técnicos gestionan convocatorias"
    ON public.galia_convocatorias FOR ALL
    TO authenticated
    USING (public.galia_is_tecnico_or_above(auth.uid(), gal_id))
    WITH CHECK (public.galia_is_tecnico_or_above(auth.uid(), gal_id));

-- Políticas para galia_beneficiarios
CREATE POLICY "Beneficiario ve su perfil"
    ON public.galia_beneficiarios FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.galia_is_tecnico_or_above(auth.uid(), gal_id));

CREATE POLICY "Beneficiario crea/edita su perfil"
    ON public.galia_beneficiarios FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Beneficiario actualiza su perfil"
    ON public.galia_beneficiarios FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.galia_is_tecnico_or_above(auth.uid(), gal_id));

-- Políticas para galia_solicitudes
CREATE POLICY "Ver solicitudes propias o como técnico"
    ON public.galia_solicitudes FOR SELECT
    TO authenticated
    USING (
        beneficiario_id IN (SELECT id FROM public.galia_beneficiarios WHERE user_id = auth.uid())
        OR public.galia_is_tecnico_or_above(auth.uid(), (SELECT gal_id FROM public.galia_convocatorias WHERE id = convocatoria_id))
    );

CREATE POLICY "Crear solicitud propia"
    ON public.galia_solicitudes FOR INSERT
    TO authenticated
    WITH CHECK (beneficiario_id IN (SELECT id FROM public.galia_beneficiarios WHERE user_id = auth.uid()));

CREATE POLICY "Actualizar solicitud"
    ON public.galia_solicitudes FOR UPDATE
    TO authenticated
    USING (
        (beneficiario_id IN (SELECT id FROM public.galia_beneficiarios WHERE user_id = auth.uid()) AND estado = 'borrador')
        OR public.galia_is_tecnico_or_above(auth.uid(), (SELECT gal_id FROM public.galia_convocatorias WHERE id = convocatoria_id))
    );

-- Políticas para galia_expedientes
CREATE POLICY "Ver expedientes propios o como técnico"
    ON public.galia_expedientes FOR SELECT
    TO authenticated
    USING (
        solicitud_id IN (
            SELECT s.id FROM public.galia_solicitudes s
            JOIN public.galia_beneficiarios b ON s.beneficiario_id = b.id
            WHERE b.user_id = auth.uid()
        )
        OR public.galia_is_tecnico_or_above(auth.uid(), (
            SELECT c.gal_id FROM public.galia_solicitudes s
            JOIN public.galia_convocatorias c ON s.convocatoria_id = c.id
            WHERE s.id = solicitud_id
        ))
    );

CREATE POLICY "Técnicos gestionan expedientes"
    ON public.galia_expedientes FOR ALL
    TO authenticated
    USING (public.galia_is_tecnico_or_above(auth.uid(), (
        SELECT c.gal_id FROM public.galia_solicitudes s
        JOIN public.galia_convocatorias c ON s.convocatoria_id = c.id
        WHERE s.id = solicitud_id
    )));

-- Políticas para galia_documentos
CREATE POLICY "Ver documentos propios o como técnico"
    ON public.galia_documentos FOR SELECT
    TO authenticated
    USING (
        subido_por = auth.uid()
        OR beneficiario_id IN (SELECT id FROM public.galia_beneficiarios WHERE user_id = auth.uid())
        OR expediente_id IN (SELECT id FROM public.galia_expedientes WHERE public.galia_is_tecnico_or_above(auth.uid(), (
            SELECT c.gal_id FROM public.galia_solicitudes s
            JOIN public.galia_convocatorias c ON s.convocatoria_id = c.id
            WHERE s.id = solicitud_id
        )))
    );

CREATE POLICY "Subir documentos propios"
    ON public.galia_documentos FOR INSERT
    TO authenticated
    WITH CHECK (subido_por = auth.uid());

-- Políticas para galia_justificaciones (similar a expedientes)
CREATE POLICY "Ver justificaciones"
    ON public.galia_justificaciones FOR SELECT
    TO authenticated
    USING (
        expediente_id IN (
            SELECT e.id FROM public.galia_expedientes e
            JOIN public.galia_solicitudes s ON e.solicitud_id = s.id
            JOIN public.galia_beneficiarios b ON s.beneficiario_id = b.id
            WHERE b.user_id = auth.uid()
        )
        OR expediente_id IN (SELECT id FROM public.galia_expedientes WHERE public.galia_is_tecnico_or_above(auth.uid(), (
            SELECT c.gal_id FROM public.galia_solicitudes s
            JOIN public.galia_convocatorias c ON s.convocatoria_id = c.id
            WHERE s.id = solicitud_id
        )))
    );

-- Políticas para galia_costes_referencia (lectura pública)
CREATE POLICY "Costes referencia públicos"
    ON public.galia_costes_referencia FOR SELECT
    TO authenticated
    USING (true);

-- Políticas para galia_interacciones_ia
CREATE POLICY "Ver interacciones propias"
    ON public.galia_interacciones_ia FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR (gal_id IS NOT NULL AND public.galia_is_tecnico_or_above(auth.uid(), gal_id)));

CREATE POLICY "Crear interacciones propias"
    ON public.galia_interacciones_ia FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Políticas para galia_base_conocimiento
CREATE POLICY "Conocimiento visible"
    ON public.galia_base_conocimiento FOR SELECT
    TO authenticated
    USING (vigente = true OR (gal_id IS NOT NULL AND public.galia_is_tecnico_or_above(auth.uid(), gal_id)));

-- Políticas para galia_alertas
CREATE POLICY "Ver alertas del GAL"
    ON public.galia_alertas FOR SELECT
    TO authenticated
    USING (public.galia_is_tecnico_or_above(auth.uid(), gal_id) OR asignada_a = auth.uid());

CREATE POLICY "Gestionar alertas"
    ON public.galia_alertas FOR ALL
    TO authenticated
    USING (public.galia_is_tecnico_or_above(auth.uid(), gal_id));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.galia_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER galia_gal_config_updated_at
    BEFORE UPDATE ON public.galia_gal_config
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_convocatorias_updated_at
    BEFORE UPDATE ON public.galia_convocatorias
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_beneficiarios_updated_at
    BEFORE UPDATE ON public.galia_beneficiarios
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_solicitudes_updated_at
    BEFORE UPDATE ON public.galia_solicitudes
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_expedientes_updated_at
    BEFORE UPDATE ON public.galia_expedientes
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_documentos_updated_at
    BEFORE UPDATE ON public.galia_documentos
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

CREATE TRIGGER galia_justificaciones_updated_at
    BEFORE UPDATE ON public.galia_justificaciones
    FOR EACH ROW EXECUTE FUNCTION public.galia_update_updated_at();

-- Trigger para generar número de expediente
CREATE OR REPLACE FUNCTION public.galia_generate_expediente_numero()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_gal_code TEXT;
    v_seq INTEGER;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT gc.codigo_leader INTO v_gal_code
    FROM public.galia_solicitudes s
    JOIN public.galia_convocatorias c ON s.convocatoria_id = c.id
    JOIN public.galia_gal_config gc ON c.gal_id = gc.id
    WHERE s.id = NEW.solicitud_id;
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(numero_expediente, '-', 3) AS INTEGER)), 0) + 1 INTO v_seq
    FROM public.galia_expedientes
    WHERE numero_expediente LIKE v_gal_code || '-' || v_year || '-%';
    
    NEW.numero_expediente := v_gal_code || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER galia_expediente_numero_auto
    BEFORE INSERT ON public.galia_expedientes
    FOR EACH ROW
    WHEN (NEW.numero_expediente IS NULL OR NEW.numero_expediente = '')
    EXECUTE FUNCTION public.galia_generate_expediente_numero();