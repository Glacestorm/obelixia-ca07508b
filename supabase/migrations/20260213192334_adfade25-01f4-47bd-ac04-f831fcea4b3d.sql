-- Ampliar estados del circuito de tramitación LEADER
-- Primero verificamos y añadimos nuevos valores al ENUM
DO $$
BEGIN
  -- Fase Solicitud
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'incorporacion_solicitud' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'incorporacion_solicitud';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'peticion_informes_cruzados' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'peticion_informes_cruzados';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'apertura_expediente' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'apertura_expediente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'especificacion_controles' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'especificacion_controles';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'requerimiento_subsanacion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'requerimiento_subsanacion';
  END IF;
  -- Fase Elegibilidad
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_elegibilidad_oodr' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_elegibilidad_oodr';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_administrativo_elegibilidad' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_administrativo_elegibilidad';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'propuesta_resolucion_elegibilidad' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'propuesta_resolucion_elegibilidad';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'resolucion_elegibilidad_dg' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'resolucion_elegibilidad_dg';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'elegibilidad_hechos' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'elegibilidad_hechos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'indicadores_expediente' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'indicadores_expediente';
  END IF;
  -- Fase Evaluación Técnica
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'peticion_informe_tecnico_economico' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'peticion_informe_tecnico_economico';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tramite_espera_junta_ct' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'tramite_espera_junta_ct';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_previsto_ayuda_concesion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_previsto_ayuda_concesion';
  END IF;
  -- Fase Resolución
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tramite_espera_resolucion_dg' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'tramite_espera_resolucion_dg';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'incorporar_resolucion_dg' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'incorporar_resolucion_dg';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'notificacion_beneficiario' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'notificacion_beneficiario';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_aceptacion_renuncia' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_aceptacion_renuncia';
  END IF;
  -- Fase Pago y Justificación
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'aceptacion_pago_anticipado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'aceptacion_pago_anticipado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'solicitud_excepcion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'solicitud_excepcion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'adjuntar_solicitud_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'adjuntar_solicitud_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'peticion_informes_cruzados_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'peticion_informes_cruzados_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'especificacion_controles_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'especificacion_controles_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'requerimiento_subsanacion_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'requerimiento_subsanacion_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'informe_certificacion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'informe_certificacion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_justificacion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_justificacion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'acta_verificacion_in_situ' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'acta_verificacion_in_situ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_contratacion_publica' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_contratacion_publica';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'control_certificacion_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'control_certificacion_pago';
  END IF;
  -- Fase Cierre
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'propuesta_ordenacion_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'propuesta_ordenacion_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'peticion_orden_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'peticion_orden_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'indicar_fecha_pago' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'indicar_fecha_pago';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'resolucion_revocacion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'resolucion_revocacion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'notificacion_revocacion' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'notificacion_revocacion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'terminacion_expediente' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'terminacion_expediente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'desistido' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'galia_expediente_estado')) THEN
    ALTER TYPE galia_expediente_estado ADD VALUE 'desistido';
  END IF;
END$$;

-- Añadir columnas para el circuito de tramitación
ALTER TABLE public.galia_expedientes
  ADD COLUMN IF NOT EXISTS sub_estado text,
  ADD COLUMN IF NOT EXISTS fase_actual text DEFAULT 'solicitud',
  ADD COLUMN IF NOT EXISTS resultado_control jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fecha_notificacion timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion timestamptz,
  ADD COLUMN IF NOT EXISTS tipo_pago text,
  ADD COLUMN IF NOT EXISTS verificacion_in_situ boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS control_contratacion boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS historial_transiciones jsonb DEFAULT '[]';

-- Crear índice para fase_actual
CREATE INDEX IF NOT EXISTS idx_galia_expedientes_fase_actual ON public.galia_expedientes(fase_actual);
CREATE INDEX IF NOT EXISTS idx_galia_expedientes_sub_estado ON public.galia_expedientes(sub_estado);