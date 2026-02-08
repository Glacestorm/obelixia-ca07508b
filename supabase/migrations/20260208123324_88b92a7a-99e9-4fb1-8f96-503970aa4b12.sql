-- =====================================================
-- GALIA 2.0 - FASE 1: SISTEMA DE CONOCIMIENTO NORMATIVO
-- =====================================================

-- Tabla de fuentes de conocimiento
CREATE TABLE public.galia_knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('boe', 'bopa', 'doue', 'bdns', 'eurlex', 'manual', 'api')),
  url_base TEXT,
  descripcion TEXT,
  frecuencia_sync TEXT DEFAULT 'daily',
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  estado_sync TEXT DEFAULT 'pending' CHECK (estado_sync IN ('pending', 'syncing', 'completed', 'error')),
  configuracion JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla principal de base de conocimiento
CREATE TABLE public.galia_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.galia_knowledge_sources(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('ue', 'nacional', 'autonomico', 'local', 'institucional')),
  tipo TEXT NOT NULL CHECK (tipo IN ('reglamento', 'ley', 'real_decreto', 'orden', 'convocatoria', 'guia', 'faq', 'procedimiento', 'formulario', 'otro')),
  titulo TEXT NOT NULL,
  resumen TEXT,
  contenido_texto TEXT NOT NULL,
  contenido_html TEXT,
  keywords TEXT[],
  ambito_territorial TEXT[] DEFAULT '{}',
  sectores_aplicables TEXT[] DEFAULT '{}',
  fuente_url TEXT,
  boe_referencia TEXT,
  bopa_referencia TEXT,
  doue_referencia TEXT,
  fecha_publicacion DATE,
  fecha_vigencia_inicio DATE,
  fecha_vigencia_fin DATE,
  version_numero INTEGER DEFAULT 1,
  is_vigente BOOLEAN DEFAULT true,
  relevancia_score NUMERIC(3,2) DEFAULT 1.0,
  consultas_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de log de comunicaciones oficiales
CREATE TABLE public.galia_communications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expediente_id UUID,
  tipo_comunicacion TEXT NOT NULL CHECK (tipo_comunicacion IN ('requerimiento', 'resolucion', 'notificacion', 'recordatorio', 'alerta')),
  canal TEXT NOT NULL CHECK (canal IN ('email', 'notifica', 'sede', 'sms', 'postal')),
  destinatario_nif TEXT NOT NULL,
  destinatario_nombre TEXT,
  destinatario_email TEXT,
  asunto TEXT NOT NULL,
  contenido TEXT NOT NULL,
  contenido_html TEXT,
  documento_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'entregado', 'leido', 'error', 'rechazado')),
  fecha_envio TIMESTAMP WITH TIME ZONE,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  fecha_lectura TIMESTAMP WITH TIME ZONE,
  acuse_recibo_id TEXT,
  error_mensaje TEXT,
  reintentos INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de estado de cumplimiento del proyecto
CREATE TABLE public.galia_compliance_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gal_id UUID,
  fase TEXT NOT NULL,
  actuacion TEXT NOT NULL,
  requisito TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'implementado', 'verificado', 'no_aplica')),
  porcentaje_completado INTEGER DEFAULT 0 CHECK (porcentaje_completado >= 0 AND porcentaje_completado <= 100),
  evidencias TEXT[],
  notas TEXT,
  fecha_implementacion DATE,
  fecha_verificacion DATE,
  verificado_por UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_galia_knowledge_categoria ON public.galia_knowledge_base(categoria);
CREATE INDEX idx_galia_knowledge_tipo ON public.galia_knowledge_base(tipo);
CREATE INDEX idx_galia_knowledge_vigente ON public.galia_knowledge_base(is_vigente);
CREATE INDEX idx_galia_knowledge_keywords ON public.galia_knowledge_base USING GIN(keywords);
CREATE INDEX idx_galia_knowledge_ambito ON public.galia_knowledge_base USING GIN(ambito_territorial);
CREATE INDEX idx_galia_knowledge_sectores ON public.galia_knowledge_base USING GIN(sectores_aplicables);
CREATE INDEX idx_galia_knowledge_fulltext ON public.galia_knowledge_base USING GIN(to_tsvector('spanish', COALESCE(titulo, '') || ' ' || COALESCE(resumen, '') || ' ' || COALESCE(contenido_texto, '')));

CREATE INDEX idx_galia_comm_expediente ON public.galia_communications_log(expediente_id);
CREATE INDEX idx_galia_comm_destinatario ON public.galia_communications_log(destinatario_nif);
CREATE INDEX idx_galia_comm_estado ON public.galia_communications_log(estado);
CREATE INDEX idx_galia_comm_tipo ON public.galia_communications_log(tipo_comunicacion);

CREATE INDEX idx_galia_compliance_fase ON public.galia_compliance_status(fase);
CREATE INDEX idx_galia_compliance_estado ON public.galia_compliance_status(estado);

-- Enable RLS
ALTER TABLE public.galia_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galia_compliance_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (lectura pública para knowledge base)
CREATE POLICY "Knowledge sources visible for authenticated users"
ON public.galia_knowledge_sources FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Knowledge base visible for authenticated users"
ON public.galia_knowledge_base FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Communications visible for authenticated users"
ON public.galia_communications_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Compliance visible for authenticated users"
ON public.galia_compliance_status FOR SELECT
TO authenticated
USING (true);

-- Políticas de escritura para admin/técnico
CREATE POLICY "Knowledge sources manageable by authenticated users"
ON public.galia_knowledge_sources FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Knowledge base manageable by authenticated users"
ON public.galia_knowledge_base FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Communications manageable by authenticated users"
ON public.galia_communications_log FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Compliance manageable by authenticated users"
ON public.galia_compliance_status FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_galia_knowledge_sources_updated_at
BEFORE UPDATE ON public.galia_knowledge_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galia_knowledge_base_updated_at
BEFORE UPDATE ON public.galia_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galia_communications_log_updated_at
BEFORE UPDATE ON public.galia_communications_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galia_compliance_status_updated_at
BEFORE UPDATE ON public.galia_compliance_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar fuentes de conocimiento iniciales
INSERT INTO public.galia_knowledge_sources (nombre, tipo, url_base, descripcion, frecuencia_sync) VALUES
('Boletín Oficial del Estado', 'boe', 'https://www.boe.es', 'Diario oficial del Estado español', 'daily'),
('Boletín Oficial del Principado de Asturias', 'bopa', 'https://www.asturias.es/bopa', 'Diario oficial de Asturias', 'daily'),
('Diario Oficial de la UE', 'doue', 'https://eur-lex.europa.eu', 'Legislación y jurisprudencia de la UE', 'daily'),
('Base de Datos Nacional de Subvenciones', 'bdns', 'https://www.pap.hacienda.gob.es/bdnstrans', 'Registro central de subvenciones', 'hourly'),
('EUR-Lex', 'eurlex', 'https://eur-lex.europa.eu/homepage.html', 'Portal de acceso al Derecho de la UE', 'daily'),
('Manual GALIA', 'manual', NULL, 'Documentación interna del sistema', 'manual');

-- Insertar conocimiento base inicial
INSERT INTO public.galia_knowledge_base (source_id, categoria, tipo, titulo, resumen, contenido_texto, keywords, is_vigente) VALUES
((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'nacional', 'ley', 
'Ley 38/2003 General de Subvenciones', 
'Marco legal básico que regula las subvenciones públicas en España',
'La Ley 38/2003, de 17 de noviembre, General de Subvenciones, establece el régimen jurídico general de las subvenciones otorgadas por las Administraciones Públicas. Define los principios de gestión, los procedimientos de concesión, las obligaciones de los beneficiarios, los procedimientos de control y reintegro, así como el régimen sancionador aplicable.',
ARRAY['subvenciones', 'ayudas públicas', 'beneficiarios', 'justificación', 'reintegro', 'control'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'nacional', 'ley',
'Ley 39/2015 del Procedimiento Administrativo Común',
'Regula el procedimiento administrativo común de las Administraciones Públicas',
'La Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas, establece los derechos de los ciudadanos en sus relaciones con las Administraciones, los principios del procedimiento administrativo, los plazos, la notificación, los recursos administrativos y la revisión de actos.',
ARRAY['procedimiento', 'administración', 'plazos', 'recursos', 'notificaciones', 'alegaciones'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'nacional', 'ley',
'Ley 40/2015 de Régimen Jurídico del Sector Público',
'Organización y funcionamiento del sector público español',
'La Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público, regula la organización y funcionamiento de la Administración General del Estado y de los organismos públicos, las relaciones interadministrativas, los convenios, los órganos colegiados y el funcionamiento electrónico.',
ARRAY['sector público', 'organización', 'convenios', 'órganos colegiados', 'administración electrónica'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'ue', 'reglamento',
'Reglamento (UE) 2021/241 - Mecanismo de Recuperación y Resiliencia',
'Establece el Mecanismo de Recuperación y Resiliencia (MRR) de la UE',
'El Reglamento (UE) 2021/241 del Parlamento Europeo y del Consejo establece el Mecanismo de Recuperación y Resiliencia, parte fundamental de NextGenerationEU. Define los objetivos, la gobernanza, los planes nacionales de recuperación, los hitos y objetivos, los desembolsos y el sistema de control y auditoría.',
ARRAY['PRTR', 'NextGenerationEU', 'fondos europeos', 'recuperación', 'resiliencia', 'MRR'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'ue', 'reglamento',
'Reglamento (UE) 1303/2013 - Fondos EIE',
'Disposiciones comunes para los Fondos Estructurales y de Inversión Europeos',
'El Reglamento (UE) 1303/2013 establece las disposiciones comunes relativas al FEDER, FSE, Fondo de Cohesión, FEADER y FEMP. Define los principios de programación, seguimiento, evaluación, gestión financiera y control de estos fondos.',
ARRAY['FEDER', 'FSE', 'FEADER', 'fondos estructurales', 'programación', 'control'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'ue', 'reglamento',
'Reglamento (UE) 2021/1060 - Disposiciones Comunes 2021-2027',
'Nuevo marco para fondos europeos 2021-2027',
'El Reglamento (UE) 2021/1060 establece las disposiciones comunes aplicables al FEDER, FSE+, Fondo de Cohesión, FTJ, FEAMPA y al FAMI, FSI e IGFV para el período 2021-2027. Actualiza los sistemas de gestión, control y simplificación administrativa.',
ARRAY['2021-2027', 'FEDER', 'FSE+', 'simplificación', 'gestión compartida'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'nacional', 'guia',
'Programa LEADER en España',
'Guía sobre el programa LEADER para desarrollo rural',
'El programa LEADER (Liaison Entre Actions de Développement de l''Économie Rurale) es una metodología de desarrollo rural participativo que funciona desde 1991. En España se implementa a través de los Grupos de Acción Local (GAL), que diseñan y ejecutan estrategias de desarrollo local financiadas con fondos FEADER.',
ARRAY['LEADER', 'desarrollo rural', 'GAL', 'FEADER', 'territorio', 'participación'], true),

((SELECT id FROM public.galia_knowledge_sources WHERE tipo = 'manual' LIMIT 1), 'autonomico', 'procedimiento',
'Procedimiento de solicitud de ayudas LEADER en Asturias',
'Guía paso a paso para solicitar ayudas LEADER en el Principado de Asturias',
'El procedimiento de solicitud de ayudas LEADER en Asturias incluye: 1) Consulta de convocatorias vigentes, 2) Verificación de elegibilidad, 3) Preparación de documentación (memoria, presupuesto, permisos), 4) Presentación telemática a través de la sede electrónica del GAL, 5) Subsanación si procede, 6) Evaluación técnica, 7) Resolución y notificación, 8) Ejecución del proyecto, 9) Justificación de gastos.',
ARRAY['Asturias', 'solicitud', 'procedimiento', 'documentación', 'justificación'], true);

-- Insertar estado inicial de cumplimiento del proyecto GALIA V4
INSERT INTO public.galia_compliance_status (fase, actuacion, requisito, descripcion, estado, porcentaje_completado) VALUES
('1', 'ACTUACIÓN 1', 'Análisis experiencias IA en administración', 'Estudio de casos de éxito de IA en gestión pública', 'en_progreso', 50),
('1', 'ACTUACIÓN 2', 'Estudio normativo RGPD/Ley 39-40', 'Análisis de marco legal aplicable', 'en_progreso', 60),
('1', 'ACTUACIÓN 3.1', 'Diseño e implementación asistente virtual', 'Chatbot IA especializado en LEADER', 'implementado', 90),
('1', 'ACTUACIÓN 3.2', 'Base de conocimiento', 'Sistema RAG con normativa y FAQs', 'en_progreso', 30),
('1', 'ACTUACIÓN 3.3', 'Panel de control para técnicos', 'Dashboard de gestión técnica', 'implementado', 85),
('1', 'ACTUACIÓN 3.4', 'Entrenamiento del modelo IA', 'Fine-tuning contextual del asistente', 'en_progreso', 70),
('1', 'ACTUACIÓN 3.5', 'Formación equipos GAL', 'Capacitación de usuarios del sistema', 'pendiente', 0),
('1', 'ACTUACIÓN 3.6', 'Pruebas piloto', 'Testing con usuarios reales', 'pendiente', 0),
('2', 'ACTUACIÓN 4', 'Plan Fase 2', 'Roadmap de evolución del sistema', 'en_progreso', 40),
('2', 'ACTUACIÓN 5', 'Búsqueda socios nacionales', 'Portal de federación de GALs', 'pendiente', 0),
('2', 'ACTUACIÓN 6', 'Coordinación transversal', 'Dashboard de coordinación multi-GAL', 'pendiente', 0);