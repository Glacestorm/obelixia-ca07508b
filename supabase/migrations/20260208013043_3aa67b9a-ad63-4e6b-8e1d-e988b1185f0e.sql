-- Create FAQ table for GALIA
CREATE TABLE IF NOT EXISTS public.galia_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gal_id UUID REFERENCES public.galia_gal_config(id),
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  veces_consultada INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.galia_faq ENABLE ROW LEVEL SECURITY;

-- RLS policies for FAQ (public read for active items)
CREATE POLICY "FAQ items are publicly readable" 
ON public.galia_faq 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can manage FAQ" 
ON public.galia_faq 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create index for search
CREATE INDEX idx_galia_faq_categoria ON public.galia_faq(categoria);
CREATE INDEX idx_galia_faq_active ON public.galia_faq(is_active) WHERE is_active = true;

-- Insert sample FAQ data
INSERT INTO public.galia_faq (pregunta, respuesta, categoria, tags) VALUES
('¿Qué es el programa LEADER?', 'LEADER es una metodología de desarrollo rural financiada por el Fondo Europeo Agrícola de Desarrollo Rural (FEADER). Permite a las comunidades rurales diseñar e implementar estrategias de desarrollo local a través de los Grupos de Acción Local (GAL). Las ayudas LEADER financian proyectos de inversión productiva, diversificación económica y mejora de servicios básicos en zonas rurales.', 'general', ARRAY['leader', 'feader', 'desarrollo rural']),
('¿Quién puede solicitar ayudas LEADER?', 'Pueden solicitar ayudas LEADER: pequeñas y medianas empresas (PYMEs), autónomos, ayuntamientos, asociaciones sin ánimo de lucro y otras entidades públicas o privadas. El requisito principal es que el proyecto se desarrolle en el territorio LEADER del GAL correspondiente y cumpla con los criterios de elegibilidad de la convocatoria.', 'elegibilidad', ARRAY['beneficiarios', 'requisitos', 'pymes']),
('¿Qué documentación necesito para solicitar una ayuda?', 'La documentación básica incluye: solicitud normalizada, memoria técnica del proyecto, presupuesto detallado con al menos 3 ofertas comparativas (para inversiones >18.000€), declaración responsable, vida laboral o inscripción en actividades económicas, permisos y licencias necesarias, y documentación acreditativa de la personalidad jurídica del solicitante.', 'documentacion', ARRAY['documentos', 'memoria', 'presupuesto']),
('¿Cuál es el porcentaje máximo de subvención?', 'El porcentaje de ayuda varía según la convocatoria y tipo de beneficiario, pero generalmente oscila entre el 40% y el 50% del coste elegible. Algunos programas pueden alcanzar hasta el 80% para determinadas actuaciones o beneficiarios. Consulta la convocatoria específica de tu GAL para conocer los porcentajes exactos.', 'financiacion', ARRAY['porcentaje', 'intensidad', 'subvencion']),
('¿Cuánto tiempo tarda la tramitación?', 'El plazo medio de tramitación de un expediente LEADER es de 3 a 6 meses desde la presentación de la solicitud completa hasta la resolución de concesión. Este plazo puede variar según la complejidad del proyecto y la carga de trabajo del GAL. La justificación y pago posterior puede requerir 2-3 meses adicionales.', 'plazos', ARRAY['tramitacion', 'tiempo', 'resolucion']),
('¿Qué gastos son subvencionables?', 'Son subvencionables las inversiones materiales (obra civil, maquinaria, equipamiento), inversiones inmateriales (software, licencias, patentes), y determinados gastos corrientes vinculados al proyecto. No son subvencionables: IVA recuperable, gastos financieros, gastos de personal propio, inversiones de reposición, y gastos realizados antes de la presentación de la solicitud.', 'justificacion', ARRAY['gastos', 'elegibles', 'inversiones']),
('¿Cómo justifico los gastos realizados?', 'La justificación requiere: facturas originales detalladas, justificantes de pago bancario (transferencia o extracto), documentación gráfica de las inversiones realizadas, y en su caso, declaración de no percepción de otras ayudas. Los gastos deben estar debidamente contabilizados y se verificará la trazabilidad bancaria de todos los pagos.', 'justificacion', ARRAY['justificacion', 'facturas', 'pagos']),
('¿Puedo modificar mi proyecto una vez aprobado?', 'Sí, es posible solicitar modificaciones del proyecto aprobado, siempre que se mantengan los objetivos esenciales y no afecte a la puntuación que motivó la concesión. Las modificaciones sustanciales requieren autorización previa del GAL. Las modificaciones no sustanciales deben comunicarse antes de la justificación final.', 'tramitacion', ARRAY['modificacion', 'cambios', 'proyecto']);

-- Add trigger for updated_at
CREATE TRIGGER update_galia_faq_updated_at
  BEFORE UPDATE ON public.galia_faq
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
