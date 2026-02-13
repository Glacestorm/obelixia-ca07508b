/**
 * GALIA - Hook del Circuito de Tramitación LEADER
 * Mapa completo de transiciones según flujograma PANT/ENT
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS DE ESTADO DEL CIRCUITO ===
export type EstadoCircuito =
  // Fase Solicitud
  | 'incorporacion_solicitud' | 'peticion_informes_cruzados' | 'apertura_expediente'
  | 'especificacion_controles' | 'requerimiento_subsanacion'
  // Fase Elegibilidad
  | 'control_elegibilidad_oodr' | 'control_administrativo_elegibilidad'
  | 'propuesta_resolucion_elegibilidad' | 'resolucion_elegibilidad_dg'
  | 'elegibilidad_hechos' | 'indicadores_expediente'
  // Fase Evaluación Técnica
  | 'peticion_informe_tecnico_economico' | 'tramite_espera_junta_ct'
  | 'control_previsto_ayuda_concesion'
  // Fase Resolución
  | 'tramite_espera_resolucion_dg' | 'incorporar_resolucion_dg'
  | 'notificacion_beneficiario' | 'control_aceptacion_renuncia'
  // Fase Pago y Justificación
  | 'aceptacion_pago_anticipado' | 'solicitud_excepcion' | 'adjuntar_solicitud_pago'
  | 'peticion_informes_cruzados_pago' | 'especificacion_controles_pago'
  | 'requerimiento_subsanacion_pago' | 'informe_certificacion' | 'control_justificacion'
  | 'acta_verificacion_in_situ' | 'control_contratacion_publica' | 'control_certificacion_pago'
  // Fase Cierre
  | 'propuesta_ordenacion_pago' | 'peticion_orden_pago' | 'indicar_fecha_pago'
  | 'resolucion_revocacion' | 'notificacion_revocacion' | 'terminacion_expediente'
  // Estados originales (compatibilidad)
  | 'instruccion' | 'evaluacion' | 'propuesta' | 'resolucion'
  | 'concedido' | 'denegado' | 'renunciado' | 'justificacion' | 'cerrado' | 'desistido';

export type FaseCircuito = 'solicitud' | 'elegibilidad' | 'evaluacion' | 'resolucion' | 'pago' | 'cierre';
export type ResultadoControl = 'TER_FAV' | 'TER_DES' | 'TER_REV' | 'PENDIENTE';

// === MAPA DE FASES ===
export const FASE_MAP: Record<string, FaseCircuito> = {
  incorporacion_solicitud: 'solicitud', peticion_informes_cruzados: 'solicitud',
  apertura_expediente: 'solicitud', especificacion_controles: 'solicitud',
  requerimiento_subsanacion: 'solicitud',
  control_elegibilidad_oodr: 'elegibilidad', control_administrativo_elegibilidad: 'elegibilidad',
  propuesta_resolucion_elegibilidad: 'elegibilidad', resolucion_elegibilidad_dg: 'elegibilidad',
  elegibilidad_hechos: 'elegibilidad', indicadores_expediente: 'elegibilidad',
  instruccion: 'elegibilidad', evaluacion: 'evaluacion',
  peticion_informe_tecnico_economico: 'evaluacion', tramite_espera_junta_ct: 'evaluacion',
  control_previsto_ayuda_concesion: 'evaluacion', propuesta: 'evaluacion',
  tramite_espera_resolucion_dg: 'resolucion', incorporar_resolucion_dg: 'resolucion',
  notificacion_beneficiario: 'resolucion', control_aceptacion_renuncia: 'resolucion',
  resolucion: 'resolucion',
  aceptacion_pago_anticipado: 'pago', solicitud_excepcion: 'pago',
  adjuntar_solicitud_pago: 'pago', peticion_informes_cruzados_pago: 'pago',
  especificacion_controles_pago: 'pago', requerimiento_subsanacion_pago: 'pago',
  informe_certificacion: 'pago', control_justificacion: 'pago',
  acta_verificacion_in_situ: 'pago', control_contratacion_publica: 'pago',
  control_certificacion_pago: 'pago', justificacion: 'pago',
  propuesta_ordenacion_pago: 'cierre', peticion_orden_pago: 'cierre',
  indicar_fecha_pago: 'cierre', resolucion_revocacion: 'cierre',
  notificacion_revocacion: 'cierre', terminacion_expediente: 'cierre',
  concedido: 'cierre', denegado: 'cierre', renunciado: 'cierre', desistido: 'cierre', cerrado: 'cierre',
};

// === MAPA DE TRANSICIONES VÁLIDAS ===
export const TRANSICIONES_VALIDAS: Record<string, { siguientes: string[]; descripcion: string }> = {
  incorporacion_solicitud: { siguientes: ['peticion_informes_cruzados', 'apertura_expediente'], descripcion: 'Incorporación de la solicitud al sistema' },
  peticion_informes_cruzados: { siguientes: ['apertura_expediente'], descripcion: 'Petición de informes cruzados (TER)' },
  apertura_expediente: { siguientes: ['especificacion_controles'], descripcion: 'Apertura formal del expediente' },
  especificacion_controles: { siguientes: ['requerimiento_subsanacion', 'control_elegibilidad_oodr', 'denegado'], descripcion: 'Especificación de controles a realizar' },
  requerimiento_subsanacion: { siguientes: ['especificacion_controles', 'terminacion_expediente'], descripcion: 'Requerimiento de subsanación al beneficiario' },
  control_elegibilidad_oodr: { siguientes: ['control_administrativo_elegibilidad'], descripcion: 'Control de elegibilidad OODR' },
  control_administrativo_elegibilidad: { siguientes: ['propuesta_resolucion_elegibilidad', 'terminacion_expediente'], descripcion: 'Control administrativo de elegibilidad' },
  propuesta_resolucion_elegibilidad: { siguientes: ['resolucion_elegibilidad_dg'], descripcion: 'Propuesta de resolución de elegibilidad' },
  resolucion_elegibilidad_dg: { siguientes: ['elegibilidad_hechos'], descripcion: 'Resolución de elegibilidad por DG' },
  elegibilidad_hechos: { siguientes: ['indicadores_expediente'], descripcion: 'Elegibilidad de hechos' },
  indicadores_expediente: { siguientes: ['peticion_informe_tecnico_economico'], descripcion: 'Indicadores del expediente' },
  peticion_informe_tecnico_economico: { siguientes: ['tramite_espera_junta_ct'], descripcion: 'Petición de informe técnico-económico' },
  tramite_espera_junta_ct: { siguientes: ['control_previsto_ayuda_concesion'], descripcion: 'Trámite de espera Junta CT' },
  control_previsto_ayuda_concesion: { siguientes: ['tramite_espera_resolucion_dg'], descripcion: 'Control previsto de ayuda y concesión' },
  tramite_espera_resolucion_dg: { siguientes: ['incorporar_resolucion_dg'], descripcion: 'Trámite de espera resolución DG' },
  incorporar_resolucion_dg: { siguientes: ['notificacion_beneficiario'], descripcion: 'Incorporar resolución DG' },
  notificacion_beneficiario: { siguientes: ['control_aceptacion_renuncia', 'renunciado'], descripcion: 'Notificación al beneficiario' },
  control_aceptacion_renuncia: { siguientes: ['aceptacion_pago_anticipado', 'solicitud_excepcion', 'adjuntar_solicitud_pago', 'renunciado', 'desistido', 'terminacion_expediente'], descripcion: 'Control de aceptación/renuncia' },
  aceptacion_pago_anticipado: { siguientes: ['adjuntar_solicitud_pago'], descripcion: 'Aceptación de pago anticipado' },
  solicitud_excepcion: { siguientes: ['adjuntar_solicitud_pago'], descripcion: 'Solicitud de excepción' },
  adjuntar_solicitud_pago: { siguientes: ['peticion_informes_cruzados_pago'], descripcion: 'Adjuntar solicitud de pago' },
  peticion_informes_cruzados_pago: { siguientes: ['especificacion_controles_pago'], descripcion: 'Petición de informes cruzados (pago)' },
  especificacion_controles_pago: { siguientes: ['requerimiento_subsanacion_pago', 'informe_certificacion', 'control_justificacion', 'acta_verificacion_in_situ'], descripcion: 'Especificación de controles de pago' },
  requerimiento_subsanacion_pago: { siguientes: ['especificacion_controles_pago'], descripcion: 'Requerimiento de subsanación (pago)' },
  informe_certificacion: { siguientes: ['control_certificacion_pago', 'control_contratacion_publica'], descripcion: 'Informe de certificación' },
  control_justificacion: { siguientes: ['control_certificacion_pago', 'control_contratacion_publica'], descripcion: 'Control de justificación' },
  acta_verificacion_in_situ: { siguientes: ['control_certificacion_pago', 'control_contratacion_publica'], descripcion: 'Acta de verificación in situ' },
  control_contratacion_publica: { siguientes: ['control_certificacion_pago'], descripcion: 'Control de contratación pública' },
  control_certificacion_pago: { siguientes: ['propuesta_ordenacion_pago', 'especificacion_controles_pago'], descripcion: 'Control de certificación de pago' },
  propuesta_ordenacion_pago: { siguientes: ['peticion_orden_pago', 'resolucion_revocacion'], descripcion: 'Propuesta de ordenación de pago' },
  peticion_orden_pago: { siguientes: ['indicar_fecha_pago'], descripcion: 'Petición de orden de pago' },
  indicar_fecha_pago: { siguientes: ['terminacion_expediente'], descripcion: 'Indicar fecha de pago' },
  resolucion_revocacion: { siguientes: ['notificacion_revocacion', 'terminacion_expediente'], descripcion: 'Resolución de revocación' },
  notificacion_revocacion: { siguientes: ['terminacion_expediente'], descripcion: 'Notificación de revocación' },
  terminacion_expediente: { siguientes: ['cerrado'], descripcion: 'Terminación del expediente' },
  // Compatibilidad estados originales
  instruccion: { siguientes: ['evaluacion', 'especificacion_controles'], descripcion: 'Instrucción del expediente' },
  evaluacion: { siguientes: ['propuesta', 'peticion_informe_tecnico_economico'], descripcion: 'Evaluación técnica' },
  propuesta: { siguientes: ['resolucion', 'tramite_espera_resolucion_dg'], descripcion: 'Propuesta de resolución' },
  resolucion: { siguientes: ['concedido', 'denegado', 'notificacion_beneficiario'], descripcion: 'Resolución' },
  justificacion: { siguientes: ['adjuntar_solicitud_pago', 'cerrado'], descripcion: 'Fase de justificación' },
  concedido: { siguientes: ['justificacion'], descripcion: 'Ayuda concedida' },
};

// === ETIQUETAS DE ESTADOS ===
export const ESTADO_LABELS: Record<string, string> = {
  incorporacion_solicitud: 'Incorporación solicitud',
  peticion_informes_cruzados: 'Petición informes cruzados',
  apertura_expediente: 'Apertura expediente',
  especificacion_controles: 'Especificación controles',
  requerimiento_subsanacion: 'Requerimiento subsanación',
  control_elegibilidad_oodr: 'Control elegibilidad OODR',
  control_administrativo_elegibilidad: 'Control admvo. elegibilidad',
  propuesta_resolucion_elegibilidad: 'Propuesta resolución elegibilidad',
  resolucion_elegibilidad_dg: 'Resolución elegibilidad DG',
  elegibilidad_hechos: 'Elegibilidad de hechos',
  indicadores_expediente: 'Indicadores expediente',
  peticion_informe_tecnico_economico: 'Petición informe técnico-económico',
  tramite_espera_junta_ct: 'Trámite espera Junta CT',
  control_previsto_ayuda_concesion: 'Control previsto ayuda/concesión',
  tramite_espera_resolucion_dg: 'Trámite espera resolución DG',
  incorporar_resolucion_dg: 'Incorporar resolución DG',
  notificacion_beneficiario: 'Notificación beneficiario',
  control_aceptacion_renuncia: 'Control aceptación/renuncia',
  aceptacion_pago_anticipado: 'Aceptación pago anticipado',
  solicitud_excepcion: 'Solicitud excepción',
  adjuntar_solicitud_pago: 'Adjuntar solicitud pago',
  peticion_informes_cruzados_pago: 'Petición informes cruzados (pago)',
  especificacion_controles_pago: 'Especificación controles pago',
  requerimiento_subsanacion_pago: 'Requerimiento subsanación (pago)',
  informe_certificacion: 'Informe certificación',
  control_justificacion: 'Control justificación',
  acta_verificacion_in_situ: 'Acta verificación in situ',
  control_contratacion_publica: 'Control contratación pública',
  control_certificacion_pago: 'Control certificación pago',
  propuesta_ordenacion_pago: 'Propuesta ordenación pago',
  peticion_orden_pago: 'Petición orden pago',
  indicar_fecha_pago: 'Indicar fecha pago',
  resolucion_revocacion: 'Resolución revocación',
  notificacion_revocacion: 'Notificación revocación',
  terminacion_expediente: 'Terminación expediente',
  instruccion: 'Instrucción', evaluacion: 'Evaluación', propuesta: 'Propuesta',
  resolucion: 'Resolución', concedido: 'Concedido', denegado: 'Denegado',
  renunciado: 'Renunciado', justificacion: 'Justificación', cerrado: 'Cerrado', desistido: 'Desistido',
};

// === COLORES POR FASE ===
export const FASE_COLORS: Record<FaseCircuito, string> = {
  solicitud: 'text-blue-500 bg-blue-500/10',
  elegibilidad: 'text-purple-500 bg-purple-500/10',
  evaluacion: 'text-amber-500 bg-amber-500/10',
  resolucion: 'text-cyan-500 bg-cyan-500/10',
  pago: 'text-green-500 bg-green-500/10',
  cierre: 'text-gray-500 bg-gray-500/10',
};

export const FASE_LABELS: Record<FaseCircuito, string> = {
  solicitud: 'Solicitud', elegibilidad: 'Elegibilidad', evaluacion: 'Evaluación Técnica',
  resolucion: 'Resolución', pago: 'Pago y Justificación', cierre: 'Cierre',
};

// === HOOK ===
export function useGaliaCircuitoTramitacion() {

  const validarTransicion = useCallback((estadoActual: string, estadoSiguiente: string): boolean => {
    const transicion = TRANSICIONES_VALIDAS[estadoActual];
    if (!transicion) return false;
    return transicion.siguientes.includes(estadoSiguiente);
  }, []);

  const avanzarExpediente = useCallback(async (
    expedienteId: string,
    siguienteEstado: string,
    resultado: ResultadoControl = 'TER_FAV',
    observaciones?: string
  ) => {
    try {
      // Get current state
      const { data: expediente, error: fetchErr } = await supabase
        .from('galia_expedientes')
        .select('estado, historial_transiciones')
        .eq('id', expedienteId)
        .single();

      if (fetchErr || !expediente) throw new Error('Expediente no encontrado');

      const estadoActual = expediente.estado as string;
      if (!validarTransicion(estadoActual, siguienteEstado)) {
        toast.error(`Transición no válida: ${ESTADO_LABELS[estadoActual] || estadoActual} → ${ESTADO_LABELS[siguienteEstado] || siguienteEstado}`);
        return false;
      }

      const fase = FASE_MAP[siguienteEstado] || 'solicitud';
      const historial = Array.isArray(expediente.historial_transiciones) ? expediente.historial_transiciones : [];
      const nuevaTransicion = {
        de: estadoActual, a: siguienteEstado, resultado, observaciones,
        timestamp: new Date().toISOString(), fase,
      };

      const updates: Record<string, unknown> = {
        estado: siguienteEstado,
        fase_actual: fase,
        resultado_control: { ultimo: resultado, observaciones },
        historial_transiciones: [...historial, nuevaTransicion],
      };

      if (siguienteEstado === 'notificacion_beneficiario' || siguienteEstado === 'notificacion_revocacion') {
        updates.fecha_notificacion = new Date().toISOString();
      }
      if (siguienteEstado === 'control_aceptacion_renuncia') {
        updates.fecha_aceptacion = new Date().toISOString();
      }
      if (siguienteEstado === 'acta_verificacion_in_situ') {
        updates.verificacion_in_situ = true;
      }
      if (siguienteEstado === 'control_contratacion_publica') {
        updates.control_contratacion = true;
      }
      if (['concedido', 'denegado'].includes(siguienteEstado)) {
        updates.fecha_resolucion = new Date().toISOString();
      }
      if (['cerrado', 'terminacion_expediente'].includes(siguienteEstado)) {
        updates.fecha_cierre = new Date().toISOString();
      }

      const { error: updateErr } = await supabase
        .from('galia_expedientes')
        .update(updates as any)
        .eq('id', expedienteId);

      if (updateErr) throw updateErr;

      toast.success(`Estado actualizado: ${ESTADO_LABELS[siguienteEstado] || siguienteEstado}`);
      return true;
    } catch (err) {
      console.error('[useGaliaCircuitoTramitacion] avanzarExpediente error:', err);
      toast.error('Error al avanzar expediente');
      return false;
    }
  }, [validarTransicion]);

  const getTransicionesDisponibles = useCallback((estadoActual: string) => {
    const transicion = TRANSICIONES_VALIDAS[estadoActual];
    if (!transicion) return [];
    return transicion.siguientes.map(s => ({
      estado: s,
      label: ESTADO_LABELS[s] || s,
      fase: FASE_MAP[s] || 'solicitud',
    }));
  }, []);

  const getFaseProgreso = useCallback((estado: string): number => {
    const fase = FASE_MAP[estado];
    const faseOrder: FaseCircuito[] = ['solicitud', 'elegibilidad', 'evaluacion', 'resolucion', 'pago', 'cierre'];
    const idx = faseOrder.indexOf(fase || 'solicitud');
    return Math.round(((idx + 1) / faseOrder.length) * 100);
  }, []);

  return {
    validarTransicion,
    avanzarExpediente,
    getTransicionesDisponibles,
    getFaseProgreso,
    TRANSICIONES_VALIDAS,
    ESTADO_LABELS,
    FASE_MAP,
    FASE_COLORS,
    FASE_LABELS,
  };
}

export default useGaliaCircuitoTramitacion;
