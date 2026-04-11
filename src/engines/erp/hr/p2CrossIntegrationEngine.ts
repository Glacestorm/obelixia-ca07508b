/**
 * p2CrossIntegrationEngine.ts — P2.4
 * Cross-module integration signals for P2.1 (Offboarding), P2.2 (IT), P2.3 (SEPA CT).
 * Pure functions — no side-effects, no Supabase.
 *
 * Provides consolidated cross-validation between:
 * - Offboarding → Payroll (final period closure)
 * - IT → Payroll (IT deduction, FDI impact)
 * - SEPA CT → Payment Tracking (reconciliation readiness)
 * - Offboarding → SEPA CT (settlement payment via batch)
 */

import type { OffboardingPipelineState } from './offboardingPipelineEngine';
import type { ITPipelineState } from './itWorkflowPipelineEngine';
import type { SEPACTBatchStatus } from './sepaCtEngine';

// ─── Cross-Module Signal Types ─────────────────────────────────

export interface P2CrossSignal {
  id: string;
  domain: string;
  affectedDomain: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction?: string;
  resolved: boolean;
}

export interface P2IntegrationStatus {
  signals: P2CrossSignal[];
  criticalCount: number;
  warningCount: number;
  allResolved: boolean;
  readinessScore: number; // 0-100
}

// ─── Offboarding → Payroll ─────────────────────────────────────

export function deriveOffboardingPayrollSignals(params: {
  offboardingState: OffboardingPipelineState;
  hasSettlement: boolean;
  periodStatus: string;
  periodHasTerminationAdjustment: boolean;
}): P2CrossSignal[] {
  const signals: P2CrossSignal[] = [];

  if (['settlement_generated', 'certificate_prepared', 'pending_payment', 'closed'].includes(params.offboardingState)) {
    if (!params.periodHasTerminationAdjustment) {
      signals.push({
        id: 'off_payroll_no_adjustment',
        domain: 'offboarding',
        affectedDomain: 'payroll',
        severity: 'warning',
        message: 'Finiquito generado pero la nómina del período no refleja ajuste por baja',
        suggestedAction: 'Incluir incidencia de baja en el período de nómina correspondiente',
        resolved: false,
      });
    }
  }

  if (params.offboardingState === 'pending_payment' && !['closed', 'locked'].includes(params.periodStatus)) {
    signals.push({
      id: 'off_payroll_period_open',
      domain: 'offboarding',
      affectedDomain: 'payroll',
      severity: 'info',
      message: 'Pago de finiquito pendiente — período de nómina aún abierto',
      suggestedAction: 'Coordinar cierre de período con pago de finiquito',
      resolved: false,
    });
  }

  if (params.offboardingState === 'closed') {
    signals.push({
      id: 'off_payroll_closed',
      domain: 'offboarding',
      affectedDomain: 'payroll',
      severity: 'info',
      message: 'Baja cerrada — verificar que la nómina final está procesada',
      resolved: params.periodHasTerminationAdjustment,
    });
  }

  return signals;
}

// ─── IT → Payroll ──────────────────────────────────────────────

export function deriveITPayrollSignals(params: {
  itState: ITPipelineState;
  affectedDays: number;
  fdiGenerated: boolean;
  payrollReflectsIT: boolean;
}): P2CrossSignal[] {
  const signals: P2CrossSignal[] = [];

  if (['active', 'review_pending'].includes(params.itState) && params.affectedDays > 0) {
    if (!params.payrollReflectsIT) {
      signals.push({
        id: 'it_payroll_no_deduction',
        domain: 'it_workflow',
        affectedDomain: 'payroll',
        severity: 'warning',
        message: `IT activa con ${params.affectedDays} día(s) afectados sin reflejo en nómina`,
        suggestedAction: 'Crear incidencia de IT en el período de nómina correspondiente',
        resolved: false,
      });
    }

    if (!params.fdiGenerated) {
      signals.push({
        id: 'it_payroll_no_fdi',
        domain: 'it_workflow',
        affectedDomain: 'payroll',
        severity: 'info',
        message: 'FDI no generado — necesario para cálculo correcto de base reguladora',
        suggestedAction: 'Generar FDI desde el workspace de IT',
        resolved: false,
      });
    }
  }

  if (params.itState === 'medical_discharge') {
    signals.push({
      id: 'it_payroll_discharge',
      domain: 'it_workflow',
      affectedDomain: 'payroll',
      severity: 'info',
      message: 'Alta médica recibida — ajustar nómina para reincorporación',
      resolved: params.payrollReflectsIT,
    });
  }

  return signals;
}

// ─── SEPA CT → Payment Tracking ────────────────────────────────

export function deriveSEPAPaymentSignals(params: {
  batchStatus: SEPACTBatchStatus | 'none';
  batchTotalAmount: number;
  paymentPhase: string;
  periodTotalNet: number;
}): P2CrossSignal[] {
  const signals: P2CrossSignal[] = [];

  if (params.batchStatus === 'exported' && params.paymentPhase !== 'paid') {
    signals.push({
      id: 'sepa_payment_exported_unpaid',
      domain: 'sepa_ct',
      affectedDomain: 'payment',
      severity: 'warning',
      message: 'Lote SEPA exportado pero pago no confirmado en el sistema',
      suggestedAction: 'Confirmar pago en portal bancario y marcar como pagado',
      resolved: false,
    });
  }

  if (params.batchStatus === 'paid' && params.paymentPhase !== 'paid') {
    signals.push({
      id: 'sepa_payment_batch_paid',
      domain: 'sepa_ct',
      affectedDomain: 'payment',
      severity: 'info',
      message: 'Lote SEPA confirmado como pagado — actualizar estado de pago del período',
      suggestedAction: 'Marcar período como pagado en el tracking de pagos',
      resolved: false,
    });
  }

  if (params.batchStatus !== 'none' && params.batchTotalAmount > 0 && params.periodTotalNet > 0) {
    const diff = Math.abs(params.batchTotalAmount - params.periodTotalNet);
    if (diff > 0.01) {
      signals.push({
        id: 'sepa_payment_amount_mismatch',
        domain: 'sepa_ct',
        affectedDomain: 'payment',
        severity: diff > params.periodTotalNet * 0.01 ? 'warning' : 'info',
        message: `Diferencia de ${diff.toFixed(2)} € entre lote SEPA (${params.batchTotalAmount.toFixed(2)} €) y neto total del período (${params.periodTotalNet.toFixed(2)} €)`,
        suggestedAction: 'Verificar líneas excluidas o pagos parciales en el lote',
        resolved: false,
      });
    }
  }

  return signals;
}

// ─── Offboarding → SEPA CT ─────────────────────────────────────

export function deriveOffboardingSEPASignals(params: {
  offboardingState: OffboardingPipelineState;
  settlementAmount: number;
  sepaIncludesSettlement: boolean;
}): P2CrossSignal[] {
  const signals: P2CrossSignal[] = [];

  if (params.offboardingState === 'pending_payment' && params.settlementAmount > 0) {
    if (!params.sepaIncludesSettlement) {
      signals.push({
        id: 'off_sepa_no_settlement',
        domain: 'offboarding',
        affectedDomain: 'sepa_ct',
        severity: 'warning',
        message: `Finiquito de ${params.settlementAmount.toFixed(2)} € pendiente de pago — no incluido en lote SEPA`,
        suggestedAction: 'Incluir línea de finiquito en el lote SEPA CT',
        resolved: false,
      });
    }
  }

  return signals;
}

// ─── Consolidated Status ───────────────────────────────────────

export function buildP2IntegrationStatus(allSignals: P2CrossSignal[]): P2IntegrationStatus {
  const criticals = allSignals.filter(s => s.severity === 'critical' && !s.resolved);
  const warnings = allSignals.filter(s => s.severity === 'warning' && !s.resolved);
  const total = allSignals.length;
  const resolved = allSignals.filter(s => s.resolved).length;
  const readiness = total > 0 ? Math.round((resolved / total) * 100) : 100;

  return {
    signals: allSignals,
    criticalCount: criticals.length,
    warningCount: warnings.length,
    allResolved: criticals.length === 0 && warnings.length === 0,
    readinessScore: readiness,
  };
}
