/**
 * Shared Legal Core — Validation State Machine
 * @shared-legal-core
 *
 * Centraliza la semántica de validación legal dispersa en:
 * - erp_hr_settlements.legal_validation_status
 * - erp_hr_payroll_recalculations.legal_validation_status
 * - erp_hr_terminations.legal_review_status
 *
 * Funciones puras, sin side-effects, sin dependencias externas.
 */

// ============================================================================
// STATES & EVENTS
// ============================================================================

/** Estados canónicos de validación legal */
export type LegalValidationState =
  | 'not_required'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

/** Eventos que disparan transiciones */
export type LegalValidationEvent =
  | 'REQUEST_REVIEW'
  | 'START_REVIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'ESCALATE'
  | 'RESET';

/** Resultado de una transición con metadata */
export interface TransitionResult {
  success: boolean;
  from: LegalValidationState;
  to: LegalValidationState | null;
  event: LegalValidationEvent;
  reason?: string;
}

// ============================================================================
// TRANSITION MAP
// ============================================================================

const TRANSITIONS: Record<
  LegalValidationState,
  Partial<Record<LegalValidationEvent, LegalValidationState>>
> = {
  not_required: {
    REQUEST_REVIEW: 'pending',
  },
  pending: {
    START_REVIEW: 'in_review',
    APPROVE: 'approved',
    REJECT: 'rejected',
    ESCALATE: 'escalated',
  },
  in_review: {
    APPROVE: 'approved',
    REJECT: 'rejected',
    ESCALATE: 'escalated',
  },
  approved: {
    RESET: 'pending',
  },
  rejected: {
    RESET: 'pending',
    ESCALATE: 'escalated',
  },
  escalated: {
    APPROVE: 'approved',
    REJECT: 'rejected',
    RESET: 'pending',
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Intenta transicionar de `current` con `event`.
 * Retorna el nuevo estado o `null` si la transición no es válida.
 */
export function transition(
  current: LegalValidationState,
  event: LegalValidationEvent
): LegalValidationState | null {
  return TRANSITIONS[current]?.[event] ?? null;
}

/**
 * Verifica si una transición es válida sin ejecutarla.
 */
export function canTransition(
  current: LegalValidationState,
  event: LegalValidationEvent
): boolean {
  return transition(current, event) !== null;
}

/**
 * Retorna los eventos disponibles desde un estado dado.
 */
export function getAvailableEvents(
  current: LegalValidationState
): LegalValidationEvent[] {
  const stateTransitions = TRANSITIONS[current];
  if (!stateTransitions) return [];
  return Object.keys(stateTransitions) as LegalValidationEvent[];
}

/**
 * Ejecuta una transición y retorna un resultado descriptivo.
 */
export function tryTransition(
  current: LegalValidationState,
  event: LegalValidationEvent
): TransitionResult {
  const next = transition(current, event);
  if (next !== null) {
    return { success: true, from: current, to: next, event };
  }
  return {
    success: false,
    from: current,
    to: null,
    event,
    reason: `Transition '${event}' not allowed from state '${current}'`,
  };
}

// ============================================================================
// LEGACY MAPPING
// ============================================================================

/**
 * Mapea valores legacy de DB al estado canónico.
 *
 * Valores conocidos en tablas HR:
 * - null / undefined / '' → 'not_required'
 * - 'pending' / 'pending_validation' → 'pending'
 * - 'approved' / 'validated' → 'approved'
 * - 'rejected' → 'rejected'
 * - 'review_required' / 'in_review' → 'in_review'
 * - 'escalated' / 'blocked' → 'escalated'
 */
export function mapLegacyStatus(
  raw: string | null | undefined
): LegalValidationState {
  if (!raw || raw.trim() === '') return 'not_required';

  const normalized = raw.trim().toLowerCase();

  const LEGACY_MAP: Record<string, LegalValidationState> = {
    pending: 'pending',
    pending_validation: 'pending',
    pending_approval: 'pending',
    review_required: 'in_review',
    in_review: 'in_review',
    approved: 'approved',
    auto_approved: 'approved',
    validated: 'approved',
    rejected: 'rejected',
    blocked: 'escalated',
    escalated: 'escalated',
  };

  return LEGACY_MAP[normalized] ?? 'pending';
}

/**
 * Convierte un estado canónico al valor legacy más común para escritura en DB.
 * Retorna `null` para 'not_required' (campo nullable en DB).
 */
export function toLegacyStatus(
  state: LegalValidationState
): string | null {
  const REVERSE_MAP: Record<LegalValidationState, string | null> = {
    not_required: null,
    pending: 'pending',
    in_review: 'review_required',
    approved: 'approved',
    rejected: 'rejected',
    escalated: 'escalated',
  };

  return REVERSE_MAP[state];
}

// ============================================================================
// GUARDS / PREDICATES
// ============================================================================

/** ¿El estado es terminal (approved o rejected)? */
export function isTerminalState(state: LegalValidationState): boolean {
  return state === 'approved' || state === 'rejected';
}

/** ¿El estado requiere acción humana? */
export function requiresAction(state: LegalValidationState): boolean {
  return state === 'pending' || state === 'in_review' || state === 'escalated';
}

/** Lista de todos los estados válidos */
export const ALL_STATES: readonly LegalValidationState[] = [
  'not_required',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'escalated',
] as const;

/** Lista de todos los eventos válidos */
export const ALL_EVENTS: readonly LegalValidationEvent[] = [
  'REQUEST_REVIEW',
  'START_REVIEW',
  'APPROVE',
  'REJECT',
  'ESCALATE',
  'RESET',
] as const;
