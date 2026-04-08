/**
 * contractExpiryAlertEngine.ts — Motor de Alertas de Vencimiento Contractual
 * 
 * Calcula alertas escalonadas por proximidad al vencimiento de contratos temporales.
 * Genera payloads de conversión automática a indefinido (ET Art. 15.5, RDL 32/2021).
 * 
 * Legislación:
 * - ET Art. 15: Duración de los contratos temporales
 * - ET Art. 15.5: Conversión automática a indefinido por superación de límites
 * - RDL 32/2021: Reforma laboral — reestructuración de la contratación temporal
 * - ET Art. 49.1.c: Fin de contrato temporal — indemnización 12 días/año
 * - RD 84/1996: Inscripción de empresas y afiliación (TA.2)
 */

import { daysUntil } from './calendarHelpers';

// ── Types ──

export type ExpiryAlertLevel = 'info' | 'notice' | 'warning' | 'urgent' | 'critical' | 'overdue';

export interface ExpiryAlertConfig {
  level: ExpiryAlertLevel;
  label: string;
  description: string;
  color: string;       // Tailwind color token
  bgColor: string;     // Background color token
  minDays: number;     // inclusive
  maxDays: number;     // exclusive (Infinity for open-ended)
}

export interface ContractExpiryAlert {
  level: ExpiryAlertLevel;
  daysRemaining: number;
  endDate: string;
  label: string;
  description: string;
  legalConsequence: string;
  obligations: string[];
  normativa: string[];
  color: string;
  bgColor: string;
  requiresAction: boolean;
  conversionRequired: boolean;
}

export interface ContractExpiryInput {
  contractId: string;
  employeeId: string;
  employeeName: string;
  contractType: string;
  contractTypeCode: string;
  startDate: string;
  endDate: string | null;
  extensionDate?: string | null;
  extensionCount?: number;
  status: string;
  isTemporary: boolean;
}

export interface IndefiniteConversionPayload {
  sourceContractId: string;
  employeeId: string;
  employeeName: string;
  newContractType: '189';
  newContractTypeName: string;
  startDate: string;     // Day after original end date
  endDate: null;         // Indefinido
  ta2MovementCode: 'V03'; // Variación tipo contrato
  legalBasis: string[];
  conversionReason: string;
  originalContractType: string;
  originalStartDate: string;
  originalEndDate: string;
  timestamp: string;
}

// ── Alert configuration ──

export const EXPIRY_ALERT_LEVELS: ExpiryAlertConfig[] = [
  {
    level: 'overdue',
    label: 'Vencido — Conversión a indefinido',
    description: 'El contrato ha vencido sin acción. Se convierte en indefinido de oficio.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    minDays: -Infinity,
    maxDays: 0,
  },
  {
    level: 'critical',
    label: 'Crítico — Actuar inmediatamente',
    description: 'Quedan menos de 7 días. Comunicar decisión y preparar documentación de cierre o prórroga.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    minDays: 0,
    maxDays: 7,
  },
  {
    level: 'urgent',
    label: 'Urgente — Comunicar decisión',
    description: 'Quedan entre 7 y 15 días. Comunicar al empleado la decisión sobre renovación o fin.',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    minDays: 7,
    maxDays: 15,
  },
  {
    level: 'warning',
    label: 'Preparar documentación',
    description: 'Quedan entre 15 y 30 días. Preparar TA.2, Contrat@ y/o certificado empresa.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    minDays: 15,
    maxDays: 30,
  },
  {
    level: 'notice',
    label: 'Planificación',
    description: 'Quedan entre 30 y 60 días. Evaluar opciones: prórroga, conversión o finalización.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    minDays: 30,
    maxDays: 60,
  },
  {
    level: 'info',
    label: 'Informativo',
    description: 'Contrato vigente con más de 60 días de margen.',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    minDays: 60,
    maxDays: Infinity,
  },
];

// ── Core functions ──

/**
 * Compute the expiry alert for a contract based on its end date.
 * Only meaningful for temporary contracts with a defined end date.
 */
export function computeContractExpiryAlert(
  input: ContractExpiryInput,
  today: Date = new Date(),
): ContractExpiryAlert | null {
  // No alert for indefinite contracts or contracts without end date
  if (!input.isTemporary || !input.endDate) return null;
  // No alert for already terminated contracts
  if (input.status === 'terminated' || input.status === 'cancelled') return null;

  const endDate = new Date(input.endDate);
  const days = daysUntil(endDate, today);

  // Find the matching alert level
  const config = EXPIRY_ALERT_LEVELS.find(
    cfg => days >= cfg.minDays && days < cfg.maxDays,
  ) || EXPIRY_ALERT_LEVELS[EXPIRY_ALERT_LEVELS.length - 1];

  const isOverdue = days <= 0;
  const isCritical = days > 0 && days < 7;

  // Build obligations based on urgency
  const obligations: string[] = [];
  if (isOverdue) {
    obligations.push('Generar conversión a contrato indefinido (tipo 189)');
    obligations.push('Comunicar TA.2 variación (V03) a TGSS en plazo de 3 días');
    obligations.push('Actualizar Contrat@ en SEPE');
  } else if (isCritical) {
    obligations.push('Preparar TA.2 baja si no se renueva');
    obligations.push('Calcular indemnización fin de contrato (12 días/año — ET Art. 49.1.c)');
    obligations.push('Comunicar decisión al empleado');
  } else if (days < 15) {
    obligations.push('Decidir: prórroga, conversión a indefinido o finalización');
    obligations.push('Si finaliza: preparar documentación de baja');
  } else if (days < 30) {
    obligations.push('Revisar opciones contractuales');
    obligations.push('Preparar documentación preventiva');
  }

  const normativa = [
    'ET Art. 15 (contratos temporales)',
    'RDL 32/2021 (reforma laboral)',
  ];
  if (isOverdue) {
    normativa.push('ET Art. 15.5 (conversión automática a indefinido)');
  }
  if (days < 15) {
    normativa.push('ET Art. 49.1.c (extinción por fin de contrato)');
    normativa.push('RD 84/1996 Art. 32 (comunicación TA.2)');
  }

  return {
    level: config.level,
    daysRemaining: days,
    endDate: input.endDate,
    label: config.label,
    description: config.description,
    legalConsequence: isOverdue
      ? 'Superado el límite temporal, el contrato se convierte en indefinido de oficio (ET Art. 15.5).'
      : days < 7
        ? 'Si no se actúa antes del vencimiento, el contrato se convertirá en indefinido.'
        : 'Contrato temporal vigente dentro de plazo legal.',
    obligations,
    normativa,
    color: config.color,
    bgColor: config.bgColor,
    requiresAction: days < 30,
    conversionRequired: isOverdue,
  };
}

/**
 * Compute alerts for multiple contracts (batch).
 * Sorted by urgency (most urgent first).
 */
export function computeBatchExpiryAlerts(
  contracts: ContractExpiryInput[],
  today: Date = new Date(),
): Array<ContractExpiryAlert & { contractId: string; employeeId: string; employeeName: string }> {
  const alerts: Array<ContractExpiryAlert & { contractId: string; employeeId: string; employeeName: string }> = [];

  for (const contract of contracts) {
    const alert = computeContractExpiryAlert(contract, today);
    if (alert) {
      alerts.push({
        ...alert,
        contractId: contract.contractId,
        employeeId: contract.employeeId,
        employeeName: contract.employeeName,
      });
    }
  }

  // Sort by days remaining ascending (most urgent first)
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Build the payload for converting an expired temporary contract to indefinite (tipo 189).
 * Per ET Art. 15.5 and RDL 32/2021.
 */
export function buildIndefiniteConversionPayload(
  input: ContractExpiryInput,
): IndefiniteConversionPayload {
  const endDate = new Date(input.endDate || new Date().toISOString());
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() + 1);

  return {
    sourceContractId: input.contractId,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    newContractType: '189',
    newContractTypeName: 'Indefinido fijo-discontinuo (conversión)',
    startDate: startDate.toISOString().split('T')[0],
    endDate: null,
    ta2MovementCode: 'V03',
    legalBasis: [
      'ET Art. 15.5: Los trabajadores que en un periodo de 24 meses hubieran estado contratados durante un plazo superior a 18 meses, con o sin solución de continuidad, adquirirán la condición de trabajadores fijos.',
      'RDL 32/2021 Art. 1: Reforma de la contratación temporal.',
      'ET Art. 15.1: Límites de duración de los contratos temporales.',
    ],
    conversionReason: `Conversión automática a indefinido por vencimiento del contrato temporal (${input.contractTypeCode} - ${input.contractType}) sin acción de renovación o finalización.`,
    originalContractType: input.contractTypeCode,
    originalStartDate: input.startDate,
    originalEndDate: input.endDate || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get summary statistics from a batch of alerts.
 */
export function getAlertSummary(
  alerts: Array<{ level: ExpiryAlertLevel }>,
): Record<ExpiryAlertLevel, number> {
  const summary: Record<ExpiryAlertLevel, number> = {
    overdue: 0, critical: 0, urgent: 0, warning: 0, notice: 0, info: 0,
  };
  for (const alert of alerts) {
    summary[alert.level]++;
  }
  return summary;
}

/**
 * Determine if a contract type code corresponds to a temporary contract.
 */
export function isTemporaryContract(contractTypeCode: string): boolean {
  const code = parseInt(contractTypeCode, 10);
  if (isNaN(code)) return false;
  // Indefinidos: 100-299
  if (code >= 100 && code < 300) return false;
  // Relevo: 300 — temporal
  if (code === 300) return true;
  // Temporales: 400-599
  if (code >= 400 && code < 600) return true;
  return false;
}
