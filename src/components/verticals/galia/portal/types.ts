/**
 * GALIA Portal - Tipos compartidos
 */

export interface ExpedientePublico {
  codigo: string;
  titulo: string;
  estado: string;
  fechaUltimaActualizacion: string;
  progreso: number;
  proximoPaso?: string;
  importeSolicitado?: number;
  importeConcedido?: number | null;
}

// Mapeo de estados a porcentaje de progreso
export const estadoProgreso: Record<string, number> = {
  'borrador': 5,
  'incorporacion_solicitud': 8,
  'peticion_informes_cruzados': 10,
  'apertura_expediente': 12,
  'especificacion_controles': 15,
  'decision_subsanacion': 16,
  'requerimiento_subsanacion': 17,
  'presentada': 15,
  'admitida': 25,
  'subsanacion': 20,
  'control_elegibilidad_oodr': 22,
  'control_administrativo_elegibilidad': 25,
  'decision_elegibilidad': 28,
  'propuesta_resolucion_elegibilidad': 30,
  'resolucion_elegibilidad_dg': 33,
  'elegibilidad_hechos': 35,
  'indicadores_expediente': 38,
  'instruccion': 40,
  'peticion_informe_tecnico_economico': 42,
  'control_administrativo_previo': 44,
  'tramite_espera_junta_ct': 47,
  'control_previsto_ayuda_concesion': 50,
  'evaluacion': 55,
  'tramite_espera_resolucion_dg': 58,
  'incorporar_resolucion_dg': 60,
  'notificacion_beneficiario': 63,
  'decision_aceptacion': 65,
  'control_aceptacion_renuncia': 67,
  'renuncia_beneficiario': 100,
  'desistimiento_beneficiario': 100,
  'vencimiento_sin_pronunciamiento': 95,
  'propuesta': 70,
  'resolucion': 85,
  'incorporacion_aceptacion_pago': 70,
  'decision_pago': 72,
  'aceptacion_pago_anticipado': 73,
  'adjuntar_solicitud_pago': 75,
  'peticion_informes_cruzados_pago': 77,
  'especificacion_controles_pago': 78,
  'requerimiento_subsanacion_pago': 79,
  'informe_certificacion': 80,
  'control_justificacion': 81,
  'acta_verificacion_in_situ': 82,
  'decision_certificacion': 83,
  'control_contratacion_publica': 84,
  'revision_tecnica_final': 85,
  'control_certificacion_pago': 86,
  'concedido': 95,
  'justificacion': 90,
  'propuesta_ordenacion_pago': 88,
  'peticion_orden_pago': 90,
  'indicar_fecha_pago': 92,
  'resolucion_revocacion': 90,
  'notificacion_revocacion': 92,
  'terminacion_expediente': 98,
  'cerrado': 100,
  'denegado': 100,
  'renunciado': 100,
  'desistido': 100,
};

// Mapeo de estados a próximo paso
export const estadoProximoPaso: Record<string, string> = {
  'borrador': 'Completar y presentar la solicitud',
  'presentada': 'Pendiente de admisión a trámite',
  'admitida': 'En proceso de instrucción técnica',
  'subsanacion': 'Aportar documentación requerida',
  'instruccion': 'Análisis de elegibilidad en curso',
  'evaluacion': 'Valoración técnica y puntuación',
  'propuesta': 'Pendiente de resolución definitiva',
  'resolucion': 'Notificación de resolución',
  'concedido': 'Iniciar ejecución del proyecto',
  'justificacion': 'Presentar justificación de gastos',
  'cerrado': 'Expediente finalizado',
  'denegado': 'Posibilidad de recurso (20 días)',
  'renunciado': 'Sin acciones pendientes',
  'desistido': 'Sin acciones pendientes',
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};
