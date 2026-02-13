/**
 * GALIA - Hook del Circuito de Tramitación LEADER
 * Mapa completo de transiciones según flujograma PANT/ENT (~49 pasos)
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
  | 'decision_subsanacion' | 'decision_elegibilidad'
  | 'propuesta_resolucion_elegibilidad' | 'resolucion_elegibilidad_dg'
  | 'elegibilidad_hechos' | 'indicadores_expediente'
  // Fase Evaluación Técnica
  | 'peticion_informe_tecnico_economico' | 'tramite_espera_junta_ct'
  | 'control_previsto_ayuda_concesion' | 'control_administrativo_previo'
  // Fase Resolución
  | 'tramite_espera_resolucion_dg' | 'incorporar_resolucion_dg'
  | 'notificacion_beneficiario' | 'control_aceptacion_renuncia'
  | 'decision_aceptacion' | 'renuncia_beneficiario' | 'desistimiento_beneficiario'
  // Fase Pago y Justificación
  | 'aceptacion_pago_anticipado' | 'solicitud_excepcion' | 'adjuntar_solicitud_pago'
  | 'incorporacion_aceptacion_pago' | 'decision_pago'
  | 'peticion_informes_cruzados_pago' | 'especificacion_controles_pago'
  | 'requerimiento_subsanacion_pago' | 'informe_certificacion' | 'control_justificacion'
  | 'acta_verificacion_in_situ' | 'control_contratacion_publica' | 'control_certificacion_pago'
  | 'decision_certificacion' | 'revision_tecnica_final'
  // Fase Cierre
  | 'propuesta_ordenacion_pago' | 'peticion_orden_pago' | 'indicar_fecha_pago'
  | 'resolucion_revocacion' | 'notificacion_revocacion' | 'terminacion_expediente'
  | 'vencimiento_sin_pronunciamiento'
  // Estados terminales
  | 'concedido' | 'denegado' | 'renunciado' | 'desistido' | 'cerrado'
  // Compatibilidad
  | 'instruccion' | 'evaluacion' | 'propuesta' | 'resolucion' | 'justificacion';

export type FaseCircuito = 'solicitud' | 'elegibilidad' | 'evaluacion' | 'resolucion' | 'pago' | 'cierre';
export type ResultadoControl = 'TER_FAV' | 'TER_DES' | 'TER_REV' | 'PENDIENTE';
export type TipoNodo = 'task' | 'decision' | 'start' | 'end' | 'terminal';

// === NODO DEL FLUJOGRAMA ===
export interface NodoFlujograma {
  id: string;
  label: string;
  fase: FaseCircuito;
  tipo: TipoNodo;
  x: number;
  y: number;
}

// === ARISTA DEL FLUJOGRAMA ===
export interface AristaFlujograma {
  from: string;
  to: string;
  label?: string;
  condicion?: string;
}

// === MAPA DE FASES ===
export const FASE_MAP: Record<string, FaseCircuito> = {
  incorporacion_solicitud: 'solicitud', peticion_informes_cruzados: 'solicitud',
  apertura_expediente: 'solicitud', especificacion_controles: 'solicitud',
  requerimiento_subsanacion: 'solicitud',
  control_elegibilidad_oodr: 'elegibilidad', control_administrativo_elegibilidad: 'elegibilidad',
  decision_subsanacion: 'elegibilidad', decision_elegibilidad: 'elegibilidad',
  propuesta_resolucion_elegibilidad: 'elegibilidad', resolucion_elegibilidad_dg: 'elegibilidad',
  elegibilidad_hechos: 'elegibilidad', indicadores_expediente: 'elegibilidad',
  instruccion: 'elegibilidad', evaluacion: 'evaluacion',
  peticion_informe_tecnico_economico: 'evaluacion', tramite_espera_junta_ct: 'evaluacion',
  control_previsto_ayuda_concesion: 'evaluacion', control_administrativo_previo: 'evaluacion',
  propuesta: 'evaluacion',
  tramite_espera_resolucion_dg: 'resolucion', incorporar_resolucion_dg: 'resolucion',
  notificacion_beneficiario: 'resolucion', control_aceptacion_renuncia: 'resolucion',
  decision_aceptacion: 'resolucion', renuncia_beneficiario: 'resolucion',
  desistimiento_beneficiario: 'resolucion', resolucion: 'resolucion',
  aceptacion_pago_anticipado: 'pago', solicitud_excepcion: 'pago',
  adjuntar_solicitud_pago: 'pago', incorporacion_aceptacion_pago: 'pago',
  decision_pago: 'pago',
  peticion_informes_cruzados_pago: 'pago', especificacion_controles_pago: 'pago',
  requerimiento_subsanacion_pago: 'pago',
  informe_certificacion: 'pago', control_justificacion: 'pago',
  acta_verificacion_in_situ: 'pago', control_contratacion_publica: 'pago',
  control_certificacion_pago: 'pago', decision_certificacion: 'pago',
  revision_tecnica_final: 'pago', justificacion: 'pago',
  propuesta_ordenacion_pago: 'cierre', peticion_orden_pago: 'cierre',
  indicar_fecha_pago: 'cierre', resolucion_revocacion: 'cierre',
  notificacion_revocacion: 'cierre', terminacion_expediente: 'cierre',
  vencimiento_sin_pronunciamiento: 'cierre',
  concedido: 'cierre', denegado: 'cierre', renunciado: 'cierre', desistido: 'cierre', cerrado: 'cierre',
};

// === MAPA DE TRANSICIONES VÁLIDAS ===
export const TRANSICIONES_VALIDAS: Record<string, { siguientes: string[]; descripcion: string }> = {
  incorporacion_solicitud: { siguientes: ['peticion_informes_cruzados'], descripcion: 'Incorporación de la solicitud al sistema' },
  peticion_informes_cruzados: { siguientes: ['apertura_expediente'], descripcion: 'Petición de informes cruzados (TER)' },
  apertura_expediente: { siguientes: ['especificacion_controles'], descripcion: 'Apertura formal del expediente' },
  especificacion_controles: { siguientes: ['decision_subsanacion'], descripcion: 'Especificación de controles a realizar' },
  decision_subsanacion: { siguientes: ['requerimiento_subsanacion', 'control_elegibilidad_oodr'], descripcion: '¿Requiere subsanación?' },
  requerimiento_subsanacion: { siguientes: ['especificacion_controles', 'terminacion_expediente'], descripcion: 'Requerimiento de subsanación al beneficiario' },
  control_elegibilidad_oodr: { siguientes: ['control_administrativo_elegibilidad'], descripcion: 'Control de elegibilidad OODR' },
  control_administrativo_elegibilidad: { siguientes: ['decision_elegibilidad'], descripcion: 'Control administrativo de elegibilidad' },
  decision_elegibilidad: { siguientes: ['propuesta_resolucion_elegibilidad', 'denegado'], descripcion: '¿Elegible?' },
  propuesta_resolucion_elegibilidad: { siguientes: ['resolucion_elegibilidad_dg'], descripcion: 'Propuesta de resolución de elegibilidad' },
  resolucion_elegibilidad_dg: { siguientes: ['elegibilidad_hechos'], descripcion: 'Resolución de elegibilidad por DG' },
  elegibilidad_hechos: { siguientes: ['indicadores_expediente'], descripcion: 'Elegibilidad de hechos' },
  indicadores_expediente: { siguientes: ['peticion_informe_tecnico_economico'], descripcion: 'Indicadores del expediente' },
  peticion_informe_tecnico_economico: { siguientes: ['control_administrativo_previo'], descripcion: 'Petición de informe técnico-económico' },
  control_administrativo_previo: { siguientes: ['tramite_espera_junta_ct'], descripcion: 'Control administrativo previo' },
  tramite_espera_junta_ct: { siguientes: ['control_previsto_ayuda_concesion'], descripcion: 'Trámite de espera Junta CT' },
  control_previsto_ayuda_concesion: { siguientes: ['tramite_espera_resolucion_dg'], descripcion: 'Control previsto de ayuda y concesión' },
  tramite_espera_resolucion_dg: { siguientes: ['incorporar_resolucion_dg'], descripcion: 'Trámite de espera resolución DG' },
  incorporar_resolucion_dg: { siguientes: ['notificacion_beneficiario'], descripcion: 'Incorporar resolución DG' },
  notificacion_beneficiario: { siguientes: ['decision_aceptacion'], descripcion: 'Notificación al beneficiario' },
  decision_aceptacion: { siguientes: ['control_aceptacion_renuncia', 'renuncia_beneficiario', 'desistimiento_beneficiario', 'vencimiento_sin_pronunciamiento'], descripcion: '¿Acepta el beneficiario?' },
  renuncia_beneficiario: { siguientes: ['renunciado'], descripcion: 'Renuncia del beneficiario' },
  desistimiento_beneficiario: { siguientes: ['desistido'], descripcion: 'Desistimiento del beneficiario' },
  vencimiento_sin_pronunciamiento: { siguientes: ['terminacion_expediente'], descripcion: 'Vencimiento sin pronunciamiento' },
  control_aceptacion_renuncia: { siguientes: ['incorporacion_aceptacion_pago'], descripcion: 'Control de aceptación/renuncia' },
  incorporacion_aceptacion_pago: { siguientes: ['decision_pago'], descripcion: 'Incorporación aceptación pago' },
  decision_pago: { siguientes: ['aceptacion_pago_anticipado', 'adjuntar_solicitud_pago'], descripcion: '¿Pago anticipado?' },
  aceptacion_pago_anticipado: { siguientes: ['adjuntar_solicitud_pago'], descripcion: 'Aceptación de pago anticipado' },
  solicitud_excepcion: { siguientes: ['adjuntar_solicitud_pago'], descripcion: 'Solicitud de excepción' },
  adjuntar_solicitud_pago: { siguientes: ['peticion_informes_cruzados_pago'], descripcion: 'Adjuntar solicitud de pago' },
  peticion_informes_cruzados_pago: { siguientes: ['especificacion_controles_pago'], descripcion: 'Petición de informes cruzados (pago)' },
  especificacion_controles_pago: { siguientes: ['requerimiento_subsanacion_pago', 'informe_certificacion', 'control_justificacion', 'acta_verificacion_in_situ'], descripcion: 'Especificación de controles de pago' },
  requerimiento_subsanacion_pago: { siguientes: ['especificacion_controles_pago'], descripcion: 'Requerimiento de subsanación (pago)' },
  informe_certificacion: { siguientes: ['decision_certificacion'], descripcion: 'Informe de certificación' },
  control_justificacion: { siguientes: ['decision_certificacion'], descripcion: 'Control de justificación' },
  acta_verificacion_in_situ: { siguientes: ['decision_certificacion'], descripcion: 'Acta de verificación in situ' },
  decision_certificacion: { siguientes: ['control_contratacion_publica', 'revision_tecnica_final'], descripcion: '¿Certificación OK?' },
  control_contratacion_publica: { siguientes: ['control_certificacion_pago'], descripcion: 'Control de contratación pública' },
  revision_tecnica_final: { siguientes: ['control_certificacion_pago'], descripcion: 'Revisión técnica final' },
  control_certificacion_pago: { siguientes: ['propuesta_ordenacion_pago', 'especificacion_controles_pago'], descripcion: 'Control de certificación de pago' },
  propuesta_ordenacion_pago: { siguientes: ['peticion_orden_pago', 'resolucion_revocacion'], descripcion: 'Propuesta de ordenación de pago' },
  peticion_orden_pago: { siguientes: ['indicar_fecha_pago'], descripcion: 'Petición de orden de pago' },
  indicar_fecha_pago: { siguientes: ['terminacion_expediente'], descripcion: 'Indicar fecha de pago' },
  resolucion_revocacion: { siguientes: ['notificacion_revocacion'], descripcion: 'Resolución de revocación' },
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
  requerimiento_subsanacion: 'Req. subsanación',
  decision_subsanacion: '¿Subsanación?',
  control_elegibilidad_oodr: 'Control elegibilidad OODR',
  control_administrativo_elegibilidad: 'Control admvo. elegibilidad',
  decision_elegibilidad: '¿Elegible?',
  propuesta_resolucion_elegibilidad: 'Propuesta res. elegibilidad',
  resolucion_elegibilidad_dg: 'Resolución elegibilidad DG',
  elegibilidad_hechos: 'Elegibilidad de hechos',
  indicadores_expediente: 'Indicadores expediente',
  peticion_informe_tecnico_economico: 'Petición inf. técnico-eco.',
  control_administrativo_previo: 'Control admvo. previo',
  tramite_espera_junta_ct: 'Espera Junta CT',
  control_previsto_ayuda_concesion: 'Control ayuda/concesión',
  tramite_espera_resolucion_dg: 'Espera resolución DG',
  incorporar_resolucion_dg: 'Incorporar resolución DG',
  notificacion_beneficiario: 'Notificación beneficiario',
  decision_aceptacion: '¿Acepta?',
  control_aceptacion_renuncia: 'Control aceptación',
  renuncia_beneficiario: 'Renuncia beneficiario',
  desistimiento_beneficiario: 'Desistimiento',
  vencimiento_sin_pronunciamiento: 'Vencimiento s/pronunciam.',
  incorporacion_aceptacion_pago: 'Incorp. aceptación pago',
  decision_pago: '¿Pago anticipado?',
  aceptacion_pago_anticipado: 'Pago anticipado',
  solicitud_excepcion: 'Solicitud excepción',
  adjuntar_solicitud_pago: 'Adjuntar solicitud pago',
  peticion_informes_cruzados_pago: 'Informes cruzados (pago)',
  especificacion_controles_pago: 'Controles pago',
  requerimiento_subsanacion_pago: 'Req. subsanación (pago)',
  informe_certificacion: 'Informe certificación',
  control_justificacion: 'Control justificación',
  acta_verificacion_in_situ: 'Verificación in situ',
  decision_certificacion: '¿Certificación OK?',
  control_contratacion_publica: 'Control contratación pública',
  revision_tecnica_final: 'Revisión técnica final',
  control_certificacion_pago: 'Control certif. pago',
  propuesta_ordenacion_pago: 'Propuesta orden. pago',
  peticion_orden_pago: 'Petición orden pago',
  indicar_fecha_pago: 'Indicar fecha pago',
  resolucion_revocacion: 'Resolución revocación',
  notificacion_revocacion: 'Notif. revocación',
  terminacion_expediente: 'Terminación expediente',
  concedido: 'Concedido',
  denegado: 'Denegado',
  renunciado: 'Renunciado',
  desistido: 'Desistido',
  cerrado: 'Cerrado',
  instruccion: 'Instrucción',
  evaluacion: 'Evaluación',
  propuesta: 'Propuesta',
  resolucion: 'Resolución',
  justificacion: 'Justificación',
};

// === NODOS DEL FLUJOGRAMA CON POSICIONES ===
// Layout: vertical flow, wider spacing for readability
const COL_W = 300;
const ROW_H = 110;

export const NODOS_FLUJOGRAMA: NodoFlujograma[] = [
  // === SOLICITUD ===
  { id: 'incorporacion_solicitud', label: 'Incorporación solicitud', fase: 'solicitud', tipo: 'start', x: 100, y: 0 },
  { id: 'peticion_informes_cruzados', label: 'Informes cruzados', fase: 'solicitud', tipo: 'task', x: 50, y: ROW_H },
  { id: 'apertura_expediente', label: 'Apertura expediente', fase: 'solicitud', tipo: 'task', x: 50, y: ROW_H * 2 },
  { id: 'especificacion_controles', label: 'Especificación controles', fase: 'solicitud', tipo: 'task', x: 50, y: ROW_H * 3 },
  { id: 'decision_subsanacion', label: '¿Subsanación?', fase: 'solicitud', tipo: 'decision', x: 75, y: ROW_H * 4 },
  { id: 'requerimiento_subsanacion', label: 'Req. subsanación', fase: 'solicitud', tipo: 'task', x: COL_W + 50, y: ROW_H * 3.5 },

  // === ELEGIBILIDAD ===
  { id: 'control_elegibilidad_oodr', label: 'Control elegibilidad OODR', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 5.5 },
  { id: 'control_administrativo_elegibilidad', label: 'Control admvo. elegibilidad', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 6.5 },
  { id: 'decision_elegibilidad', label: '¿Elegible?', fase: 'elegibilidad', tipo: 'decision', x: 75, y: ROW_H * 7.5 },
  { id: 'propuesta_resolucion_elegibilidad', label: 'Propuesta res. elegibilidad', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 8.7 },
  { id: 'resolucion_elegibilidad_dg', label: 'Resolución elegibilidad DG', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 9.7 },
  { id: 'elegibilidad_hechos', label: 'Elegibilidad de hechos', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 10.7 },
  { id: 'indicadores_expediente', label: 'Indicadores expediente', fase: 'elegibilidad', tipo: 'task', x: 50, y: ROW_H * 11.7 },

  // === EVALUACIÓN ===
  { id: 'peticion_informe_tecnico_economico', label: 'Petición inf. técnico-eco.', fase: 'evaluacion', tipo: 'task', x: 50, y: ROW_H * 13.2 },
  { id: 'control_administrativo_previo', label: 'Control admvo. previo', fase: 'evaluacion', tipo: 'task', x: 50, y: ROW_H * 14.2 },
  { id: 'tramite_espera_junta_ct', label: 'Espera Junta CT', fase: 'evaluacion', tipo: 'task', x: 50, y: ROW_H * 15.2 },
  { id: 'control_previsto_ayuda_concesion', label: 'Control ayuda/concesión', fase: 'evaluacion', tipo: 'task', x: 50, y: ROW_H * 16.2 },

  // === RESOLUCIÓN ===
  { id: 'tramite_espera_resolucion_dg', label: 'Espera resolución DG', fase: 'resolucion', tipo: 'task', x: 50, y: ROW_H * 17.7 },
  { id: 'incorporar_resolucion_dg', label: 'Incorporar resolución DG', fase: 'resolucion', tipo: 'task', x: 50, y: ROW_H * 18.7 },
  { id: 'notificacion_beneficiario', label: 'Notificación beneficiario', fase: 'resolucion', tipo: 'task', x: 50, y: ROW_H * 19.7 },
  { id: 'decision_aceptacion', label: '¿Acepta?', fase: 'resolucion', tipo: 'decision', x: 75, y: ROW_H * 20.7 },
  { id: 'renuncia_beneficiario', label: 'Renuncia beneficiario', fase: 'resolucion', tipo: 'task', x: COL_W + 50, y: ROW_H * 19.7 },
  { id: 'desistimiento_beneficiario', label: 'Desistimiento', fase: 'resolucion', tipo: 'task', x: COL_W + 50, y: ROW_H * 20.7 },
  { id: 'vencimiento_sin_pronunciamiento', label: 'Vencimiento s/pronunciam.', fase: 'resolucion', tipo: 'task', x: COL_W + 50, y: ROW_H * 21.7 },
  { id: 'control_aceptacion_renuncia', label: 'Control aceptación', fase: 'resolucion', tipo: 'task', x: 50, y: ROW_H * 22 },

  // === PAGO ===
  { id: 'incorporacion_aceptacion_pago', label: 'Incorp. aceptación pago', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 23.5 },
  { id: 'decision_pago', label: '¿Pago anticipado?', fase: 'pago', tipo: 'decision', x: 75, y: ROW_H * 24.5 },
  { id: 'aceptacion_pago_anticipado', label: 'Pago anticipado', fase: 'pago', tipo: 'task', x: COL_W + 50, y: ROW_H * 24.5 },
  { id: 'adjuntar_solicitud_pago', label: 'Adjuntar solicitud pago', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 25.7 },
  { id: 'peticion_informes_cruzados_pago', label: 'Informes cruzados (pago)', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 26.7 },
  { id: 'especificacion_controles_pago', label: 'Controles pago', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 27.7 },
  { id: 'requerimiento_subsanacion_pago', label: 'Req. subsanación (pago)', fase: 'pago', tipo: 'task', x: COL_W + 50, y: ROW_H * 27.7 },
  { id: 'informe_certificacion', label: 'Informe certificación', fase: 'pago', tipo: 'task', x: -COL_W * 0.5 + 50, y: ROW_H * 29 },
  { id: 'control_justificacion', label: 'Control justificación', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 29 },
  { id: 'acta_verificacion_in_situ', label: 'Verificación in situ', fase: 'pago', tipo: 'task', x: COL_W * 0.5 + 50, y: ROW_H * 29 },
  { id: 'decision_certificacion', label: '¿Certificación OK?', fase: 'pago', tipo: 'decision', x: 75, y: ROW_H * 30.5 },
  { id: 'control_contratacion_publica', label: 'Control contratación púb.', fase: 'pago', tipo: 'task', x: -COL_W * 0.4 + 50, y: ROW_H * 31.7 },
  { id: 'revision_tecnica_final', label: 'Revisión técnica final', fase: 'pago', tipo: 'task', x: COL_W * 0.4 + 50, y: ROW_H * 31.7 },
  { id: 'control_certificacion_pago', label: 'Control certif. pago', fase: 'pago', tipo: 'task', x: 50, y: ROW_H * 32.9 },

  // === CIERRE ===
  { id: 'propuesta_ordenacion_pago', label: 'Propuesta ordenación pago', fase: 'cierre', tipo: 'task', x: 50, y: ROW_H * 34.2 },
  { id: 'peticion_orden_pago', label: 'Petición orden pago', fase: 'cierre', tipo: 'task', x: 50, y: ROW_H * 35.2 },
  { id: 'indicar_fecha_pago', label: 'Indicar fecha pago', fase: 'cierre', tipo: 'task', x: 50, y: ROW_H * 36.2 },
  { id: 'resolucion_revocacion', label: 'Resolución revocación', fase: 'cierre', tipo: 'task', x: COL_W + 50, y: ROW_H * 34.2 },
  { id: 'notificacion_revocacion', label: 'Notificación revocación', fase: 'cierre', tipo: 'task', x: COL_W + 50, y: ROW_H * 35.2 },
  { id: 'terminacion_expediente', label: 'Terminación expediente', fase: 'cierre', tipo: 'task', x: 50, y: ROW_H * 37.2 },

  // === TERMINALES ===
  { id: 'concedido', label: 'Concedido', fase: 'cierre', tipo: 'terminal', x: -COL_W * 0.6, y: ROW_H * 8.7 },
  { id: 'denegado', label: 'Denegado', fase: 'cierre', tipo: 'terminal', x: COL_W + 80, y: ROW_H * 7.5 },
  { id: 'renunciado', label: 'Renunciado', fase: 'cierre', tipo: 'terminal', x: COL_W * 1.7, y: ROW_H * 19.7 },
  { id: 'desistido', label: 'Desistido', fase: 'cierre', tipo: 'terminal', x: COL_W * 1.7, y: ROW_H * 20.7 },
  { id: 'cerrado', label: 'Cerrado', fase: 'cierre', tipo: 'end', x: 100, y: ROW_H * 38.5 },
];

// === ARISTAS DEL FLUJOGRAMA ===
export const ARISTAS_FLUJOGRAMA: AristaFlujograma[] = [
  // Solicitud flow
  { from: 'incorporacion_solicitud', to: 'peticion_informes_cruzados' },
  { from: 'peticion_informes_cruzados', to: 'apertura_expediente' },
  { from: 'apertura_expediente', to: 'especificacion_controles' },
  { from: 'especificacion_controles', to: 'decision_subsanacion' },
  { from: 'decision_subsanacion', to: 'requerimiento_subsanacion', label: 'Sí', condicion: 'subsanacion' },
  { from: 'decision_subsanacion', to: 'control_elegibilidad_oodr', label: 'No' },
  { from: 'requerimiento_subsanacion', to: 'especificacion_controles', label: 'Subsanado' },
  { from: 'requerimiento_subsanacion', to: 'terminacion_expediente', label: 'No subsana' },
  // Elegibilidad
  { from: 'control_elegibilidad_oodr', to: 'control_administrativo_elegibilidad' },
  { from: 'control_administrativo_elegibilidad', to: 'decision_elegibilidad' },
  { from: 'decision_elegibilidad', to: 'propuesta_resolucion_elegibilidad', label: 'TER=FAV' },
  { from: 'decision_elegibilidad', to: 'denegado', label: 'TER=DES' },
  { from: 'propuesta_resolucion_elegibilidad', to: 'resolucion_elegibilidad_dg' },
  { from: 'resolucion_elegibilidad_dg', to: 'elegibilidad_hechos' },
  { from: 'elegibilidad_hechos', to: 'indicadores_expediente' },
  { from: 'indicadores_expediente', to: 'peticion_informe_tecnico_economico' },
  // Evaluación
  { from: 'peticion_informe_tecnico_economico', to: 'control_administrativo_previo' },
  { from: 'control_administrativo_previo', to: 'tramite_espera_junta_ct' },
  { from: 'tramite_espera_junta_ct', to: 'control_previsto_ayuda_concesion' },
  { from: 'control_previsto_ayuda_concesion', to: 'tramite_espera_resolucion_dg' },
  // Resolución
  { from: 'tramite_espera_resolucion_dg', to: 'incorporar_resolucion_dg' },
  { from: 'incorporar_resolucion_dg', to: 'notificacion_beneficiario' },
  { from: 'notificacion_beneficiario', to: 'decision_aceptacion' },
  { from: 'decision_aceptacion', to: 'control_aceptacion_renuncia', label: 'Acepta' },
  { from: 'decision_aceptacion', to: 'renuncia_beneficiario', label: 'Renuncia' },
  { from: 'decision_aceptacion', to: 'desistimiento_beneficiario', label: 'Desiste' },
  { from: 'decision_aceptacion', to: 'vencimiento_sin_pronunciamiento', label: 'Vence' },
  { from: 'renuncia_beneficiario', to: 'renunciado' },
  { from: 'desistimiento_beneficiario', to: 'desistido' },
  { from: 'vencimiento_sin_pronunciamiento', to: 'terminacion_expediente' },
  { from: 'control_aceptacion_renuncia', to: 'incorporacion_aceptacion_pago' },
  // Pago
  { from: 'incorporacion_aceptacion_pago', to: 'decision_pago' },
  { from: 'decision_pago', to: 'aceptacion_pago_anticipado', label: 'Antic.' },
  { from: 'decision_pago', to: 'adjuntar_solicitud_pago', label: 'Normal' },
  { from: 'aceptacion_pago_anticipado', to: 'adjuntar_solicitud_pago' },
  { from: 'adjuntar_solicitud_pago', to: 'peticion_informes_cruzados_pago' },
  { from: 'peticion_informes_cruzados_pago', to: 'especificacion_controles_pago' },
  { from: 'especificacion_controles_pago', to: 'requerimiento_subsanacion_pago', label: 'Req.' },
  { from: 'especificacion_controles_pago', to: 'informe_certificacion' },
  { from: 'especificacion_controles_pago', to: 'control_justificacion' },
  { from: 'especificacion_controles_pago', to: 'acta_verificacion_in_situ' },
  { from: 'requerimiento_subsanacion_pago', to: 'especificacion_controles_pago' },
  { from: 'informe_certificacion', to: 'decision_certificacion' },
  { from: 'control_justificacion', to: 'decision_certificacion' },
  { from: 'acta_verificacion_in_situ', to: 'decision_certificacion' },
  { from: 'decision_certificacion', to: 'control_contratacion_publica' },
  { from: 'decision_certificacion', to: 'revision_tecnica_final' },
  { from: 'control_contratacion_publica', to: 'control_certificacion_pago' },
  { from: 'revision_tecnica_final', to: 'control_certificacion_pago' },
  { from: 'control_certificacion_pago', to: 'propuesta_ordenacion_pago', label: 'TER=FAV' },
  { from: 'control_certificacion_pago', to: 'especificacion_controles_pago', label: 'TER=DES' },
  // Cierre
  { from: 'propuesta_ordenacion_pago', to: 'peticion_orden_pago' },
  { from: 'propuesta_ordenacion_pago', to: 'resolucion_revocacion', label: 'Revocación' },
  { from: 'peticion_orden_pago', to: 'indicar_fecha_pago' },
  { from: 'indicar_fecha_pago', to: 'terminacion_expediente' },
  { from: 'resolucion_revocacion', to: 'notificacion_revocacion' },
  { from: 'notificacion_revocacion', to: 'terminacion_expediente' },
  { from: 'terminacion_expediente', to: 'cerrado' },
];

// === COLORES POR FASE ===
export const FASE_COLORS: Record<FaseCircuito, string> = {
  solicitud: 'text-blue-500 bg-blue-500/10',
  elegibilidad: 'text-purple-500 bg-purple-500/10',
  evaluacion: 'text-amber-500 bg-amber-500/10',
  resolucion: 'text-cyan-500 bg-cyan-500/10',
  pago: 'text-green-500 bg-green-500/10',
  cierre: 'text-gray-500 bg-gray-500/10',
};

export const FASE_SVG_COLORS: Record<FaseCircuito, { fill: string; stroke: string; text: string }> = {
  solicitud: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  elegibilidad: { fill: '#f3e8ff', stroke: '#a855f7', text: '#7e22ce' },
  evaluacion: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  resolucion: { fill: '#cffafe', stroke: '#06b6d4', text: '#155e75' },
  pago: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534' },
  cierre: { fill: '#f3f4f6', stroke: '#6b7280', text: '#374151' },
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

      if (['notificacion_beneficiario', 'notificacion_revocacion'].includes(siguienteEstado)) {
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
