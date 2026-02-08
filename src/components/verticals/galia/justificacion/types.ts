/**
 * GALIA - Tipos para Plantillas de Justificación
 */

export const PARTIDAS_PRESUPUESTARIAS = [
  { id: 'obra_civil', nombre: 'Obra civil y construcción', elegible: true },
  { id: 'instalaciones', nombre: 'Instalaciones técnicas', elegible: true },
  { id: 'maquinaria', nombre: 'Maquinaria y equipamiento', elegible: true },
  { id: 'mobiliario', nombre: 'Mobiliario', elegible: true },
  { id: 'vehiculos', nombre: 'Vehículos (solo uso profesional)', elegible: true },
  { id: 'intangibles', nombre: 'Activos intangibles (software, patentes)', elegible: true },
  { id: 'honorarios', nombre: 'Honorarios profesionales', elegible: true },
  { id: 'publicidad', nombre: 'Publicidad y difusión', elegible: true },
  { id: 'formacion', nombre: 'Formación', elegible: true },
  { id: 'otros', nombre: 'Otros gastos elegibles', elegible: true },
  { id: 'iva', nombre: 'IVA (si no recuperable)', elegible: true },
  { id: 'no_elegible', nombre: 'Gastos no elegibles', elegible: false },
] as const;

export interface GastoJustificacion {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  proveedor: string;
  nifProveedor: string;
  concepto: string;
  partida: string;
  baseImponible: number;
  iva: number;
  total: number;
  fechaPago: string;
  medioPago: 'transferencia' | 'domiciliacion' | 'tarjeta' | 'efectivo';
  observaciones?: string;
}

export interface ResumenPartida {
  partida: string;
  nombre: string;
  presupuestado: number;
  justificado: number;
  diferencia: number;
  porcentaje: number;
  elegible: boolean;
}

export interface JustificacionTotales {
  totalJustificado: number;
  baseTotal: number;
  ivaTotal: number;
  elegibleTotal: number;
  ayudaCalculada: number;
  diferencia: number;
  porcentajeEjecucion: number;
}

export interface JustificacionValidaciones {
  errores: string[];
  avisos: string[];
}
