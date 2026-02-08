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
  'presentada': 15,
  'admitida': 25,
  'subsanacion': 20,
  'instruccion': 40,
  'evaluacion': 55,
  'propuesta': 70,
  'resolucion': 85,
  'concedido': 95,
  'justificacion': 90,
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
