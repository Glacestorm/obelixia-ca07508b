/**
 * offboardingOrchestrationEngine.ts — Pure offboarding lifecycle orchestration
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Defines:
 * - 9-state lifecycle for employee exit process
 * - Checklist with per-step completion checks
 * - Mapping between 3 classification systems (internal → AFI → SEPE)
 * - Consistency validation across termination type, AFI baja, and SEPE causa
 * 
 * Source of truth for offboarding lifecycle state.
 * AI analysis remains assistive only — it does NOT drive state transitions.
 * 
 * NO Supabase, NO React — pure functions only.
 */

import type { AFIBajaSubtype } from './afiArtifactEngine';
import type { CausaBajaSEPE, CertificaArtifactStatus } from './certificaArtifactEngine';

// ── Lifecycle ──

export type OffboardingLifecycleStatus =
  | 'initiated'
  | 'validated'
  | 'afi_baja_generated'
  | 'settlement_calculated'
  | 'certificate_generated'
  | 'artifacts_sent'
  | 'accepted'
  | 'closed'
  | 'archived';

export const OFFBOARDING_STATUS_ORDER: OffboardingLifecycleStatus[] = [
  'initiated',
  'validated',
  'afi_baja_generated',
  'settlement_calculated',
  'certificate_generated',
  'artifacts_sent',
  'accepted',
  'closed',
  'archived',
];

export const OFFBOARDING_STATUS_META: Record<OffboardingLifecycleStatus, {
  label: string;
  description: string;
  stepIndex: number;
}> = {
  initiated:              { label: 'Iniciado',              description: 'Proceso de baja iniciado, pendiente de validación', stepIndex: 0 },
  validated:              { label: 'Validado',              description: 'Datos validados y clave de baja confirmada', stepIndex: 1 },
  afi_baja_generated:     { label: 'AFI Baja generada',     description: 'Artefacto AFI de baja generado internamente', stepIndex: 2 },
  settlement_calculated:  { label: 'Finiquito calculado',   description: 'Finiquito e indemnización calculados con evidencia', stepIndex: 3 },
  certificate_generated:  { label: 'Certificado generado',  description: 'Certificado de empresa (Certific@2) generado', stepIndex: 4 },
  artifacts_sent:         { label: 'Artefactos enviados',   description: 'Artefactos marcados como enviados (preparatorio)', stepIndex: 5 },
  accepted:               { label: 'Aceptado',              description: 'Respuestas oficiales registradas', stepIndex: 6 },
  closed:                 { label: 'Cerrado',               description: 'Proceso de salida cerrado', stepIndex: 7 },
  archived:               { label: 'Archivado',             description: 'Expediente archivado con toda la documentación', stepIndex: 8 },
};

export const OFFBOARDING_VALID_TRANSITIONS: Record<OffboardingLifecycleStatus, OffboardingLifecycleStatus[]> = {
  initiated:              ['validated'],
  validated:              ['afi_baja_generated'],
  afi_baja_generated:     ['settlement_calculated'],
  settlement_calculated:  ['certificate_generated'],
  certificate_generated:  ['artifacts_sent'],
  artifacts_sent:         ['accepted'],
  accepted:               ['closed'],
  closed:                 ['archived'],
  archived:               [],
};

export function isValidOffboardingTransition(
  current: OffboardingLifecycleStatus,
  target: OffboardingLifecycleStatus,
): boolean {
  return OFFBOARDING_VALID_TRANSITIONS[current]?.includes(target) ?? false;
}

// ── Internal termination type ──

export type InternalTerminationType =
  | 'voluntary'
  | 'objective'
  | 'disciplinary'
  | 'mutual'
  | 'end_contract'
  | 'retirement'
  | 'collective'
  | 'probation'
  | 'death'
  | 'permanent_disability';

// ── Mapping: Internal → AFI Baja subtype ──

export function mapTerminationTypeToAFIBaja(type: InternalTerminationType): AFIBajaSubtype {
  const map: Record<InternalTerminationType, AFIBajaSubtype> = {
    voluntary:             'baja_voluntaria',
    objective:             'baja_despido_objetivo',
    disciplinary:          'baja_despido_disciplinario',
    mutual:                'baja_mutuo_acuerdo',
    end_contract:          'baja_fin_contrato',
    retirement:            'baja_jubilacion',
    collective:            'baja_ere',
    probation:             'baja_voluntaria', // periodo prueba → baja voluntaria in AFI
    death:                 'baja_fallecimiento',
    permanent_disability:  'baja_incapacidad_permanente',
  };
  return map[type];
}

// ── Mapping: Internal → SEPE Causa Baja ──

export function mapTerminationTypeToCausaBajaSEPE(type: InternalTerminationType): CausaBajaSEPE {
  const map: Record<InternalTerminationType, CausaBajaSEPE> = {
    voluntary:             '64',
    objective:             '53',
    disciplinary:          '52',
    mutual:                '55',
    end_contract:          '51',
    retirement:            '61',
    collective:            '56',
    probation:             '64',
    death:                 '63',
    permanent_disability:  '62',
  };
  return map[type];
}

// ── Mapping: Internal → dismissalType for finiquito ──

export type FiniquitoDismissalType = 'procedente' | 'improcedente' | 'temporal_end' | 'null' | 'voluntary';

export function mapTerminationTypeToFiniquito(type: InternalTerminationType): FiniquitoDismissalType {
  const map: Record<InternalTerminationType, FiniquitoDismissalType> = {
    voluntary:             'voluntary',
    objective:             'procedente',
    disciplinary:          'procedente', // may be improcedente if contested
    mutual:                'voluntary',
    end_contract:          'temporal_end',
    retirement:            'voluntary',
    collective:            'procedente',
    probation:             'voluntary',
    death:                 'voluntary',
    permanent_disability:  'voluntary',
  };
  return map[type];
}

// ── Checklist ──

export interface OffboardingChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  required: boolean;
  detail?: string;
}

export interface OffboardingChecklist {
  items: OffboardingChecklistItem[];
  completedCount: number;
  requiredCount: number;
  readinessScore: number; // 0-100
}

export interface OffboardingChecklistInput {
  terminationType: InternalTerminationType | null;
  terminationDate: string | null;
  claveBajaSet: boolean;
  employeeDataValid: boolean;
  afiBajaGenerated: boolean;
  afiBajaStatus: string | null;
  finiquitoComputed: boolean;
  finiquitoAmount: number | null;
  indemnizacionComputed: boolean;
  certificaGenerated: boolean;
  certificaStatus: CertificaArtifactStatus | null;
  evidencesCreated: boolean;
  sepeResponseRegistered: boolean;
}

export function computeOffboardingReadiness(input: OffboardingChecklistInput): OffboardingChecklist {
  const items: OffboardingChecklistItem[] = [
    {
      key: 'termination_type',
      label: 'Tipo de extinción definido',
      completed: input.terminationType !== null,
      required: true,
    },
    {
      key: 'termination_date',
      label: 'Fecha efectiva de baja',
      completed: input.terminationDate !== null,
      required: true,
    },
    {
      key: 'clave_baja',
      label: 'Clave de baja configurada',
      completed: input.claveBajaSet,
      required: true,
      detail: input.claveBajaSet ? 'Consistente con tipo de extinción' : undefined,
    },
    {
      key: 'employee_data',
      label: 'Datos del empleado validados',
      completed: input.employeeDataValid,
      required: true,
    },
    {
      key: 'afi_baja',
      label: 'AFI de baja generada',
      completed: input.afiBajaGenerated,
      required: true,
      detail: input.afiBajaStatus ?? undefined,
    },
    {
      key: 'finiquito',
      label: 'Finiquito calculado',
      completed: input.finiquitoComputed,
      required: true,
      detail: input.finiquitoAmount !== null ? `€${input.finiquitoAmount.toLocaleString('es-ES')}` : undefined,
    },
    {
      key: 'indemnizacion',
      label: 'Indemnización calculada',
      completed: input.indemnizacionComputed,
      required: false, // not all terminations have indemnization
      detail: 'Solo aplica según causa de extinción',
    },
    {
      key: 'certifica',
      label: 'Certificado empresa generado',
      completed: input.certificaGenerated,
      required: true,
      detail: input.certificaStatus ?? undefined,
    },
    {
      key: 'evidences',
      label: 'Evidencias documentales creadas',
      completed: input.evidencesCreated,
      required: true,
    },
    {
      key: 'sepe_response',
      label: 'Respuesta SEPE registrada',
      completed: input.sepeResponseRegistered,
      required: false,
      detail: 'Pendiente de conector real SEPE',
    },
  ];

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed).length;
  const completedAll = items.filter(i => i.completed).length;
  const readinessScore = requiredItems.length > 0
    ? Math.round((completedRequired / requiredItems.length) * 100)
    : 0;

  return {
    items,
    completedCount: completedAll,
    requiredCount: requiredItems.length,
    readinessScore,
  };
}

// ── Consistency validation ──

export interface ConsistencyCheck {
  field: string;
  expected: string;
  actual: string;
  consistent: boolean;
}

export interface OffboardingConsistencyResult {
  checks: ConsistencyCheck[];
  allConsistent: boolean;
  inconsistencies: string[];
}

export function validateOffboardingConsistency(
  terminationType: InternalTerminationType,
  afiBajaSubtype: AFIBajaSubtype | null,
  sepeCausa: CausaBajaSEPE | null,
): OffboardingConsistencyResult {
  const checks: ConsistencyCheck[] = [];

  // Check AFI baja consistency
  if (afiBajaSubtype) {
    const expectedAFI = mapTerminationTypeToAFIBaja(terminationType);
    checks.push({
      field: 'AFI Baja subtype',
      expected: expectedAFI,
      actual: afiBajaSubtype,
      consistent: afiBajaSubtype === expectedAFI,
    });
  }

  // Check SEPE causa consistency
  if (sepeCausa) {
    const expectedSEPE = mapTerminationTypeToCausaBajaSEPE(terminationType);
    checks.push({
      field: 'SEPE Causa Baja',
      expected: expectedSEPE,
      actual: sepeCausa,
      consistent: sepeCausa === expectedSEPE,
    });
  }

  const inconsistencies = checks
    .filter(c => !c.consistent)
    .map(c => `${c.field}: esperado '${c.expected}', encontrado '${c.actual}'`);

  return {
    checks,
    allConsistent: inconsistencies.length === 0,
    inconsistencies,
  };
}
