/**
 * settlementEvidenceEngine.ts — Settlement evidence builder for ledger persistence
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Pure engine that:
 * - Takes FiniquitoResult + employee context and produces evidence snapshot
 * - Separates finiquito (pending salary + vacation + extra pay) from indemnización
 * - Produces structured SettlementEvidenceSnapshot for ledger persistence
 * - Validates consistency between settlement amounts and termination type
 * 
 * NO Supabase, NO React — pure functions only.
 */

import type { FiniquitoResult, FiniquitoInput } from '@/lib/hr/laborDocumentEngine';
import type { InternalTerminationType } from './offboardingOrchestrationEngine';

// ── Types ──

export interface SettlementEmployeeContext {
  employeeId: string;
  employeeName: string;
  companyId: string;
  terminationType: InternalTerminationType;
  terminationDate: string;
  hireDate: string;
  annualSalary: number;
}

export interface SettlementEvidenceSnapshot {
  /** Unique snapshot ID */
  snapshotId: string;
  /** When the snapshot was created */
  capturedAt: string;
  
  // Employee context
  employee: {
    id: string;
    name: string;
    hireDate: string;
    terminationDate: string;
    yearsWorked: number;
  };

  // Finiquito breakdown (non-indemnización)
  finiquito: {
    pendingSalary: number;
    vacationCompensation: number;
    vacationDaysPending: number;
    extraPayProration: number;
    subtotal: number;
  };

  // Indemnización (separate from finiquito)
  indemnizacion: {
    applicable: boolean;
    daysPerYear: number;
    yearsApplied: number;
    amount: number;
    legalBasis: string;
  };

  // Totals
  totalBruto: number;
  
  // Lines for document generation
  lines: Array<{ concept: string; amount: number; type: 'earning' | 'deduction' }>;
  
  // Input parameters used (for audit reproducibility)
  inputParams: {
    annualSalary: number;
    dismissalType: string;
    vacationDaysEntitled: number;
    vacationDaysTaken: number;
    extraPayments: number;
  };
}

export interface SettlementConsistencyResult {
  isConsistent: boolean;
  warnings: string[];
}

// ── Build functions ──

/**
 * Build a settlement evidence snapshot from FiniquitoResult + context.
 */
export function buildSettlementSnapshot(
  result: FiniquitoResult,
  input: FiniquitoInput,
  context: SettlementEmployeeContext,
): SettlementEvidenceSnapshot {
  const yearsWorked = Math.max(0, 
    (new Date(context.terminationDate).getTime() - new Date(context.hireDate).getTime()) 
    / (365.25 * 24 * 60 * 60 * 1000)
  );

  return {
    snapshotId: `settlement_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: new Date().toISOString(),
    employee: {
      id: context.employeeId,
      name: context.employeeName,
      hireDate: context.hireDate,
      terminationDate: context.terminationDate,
      yearsWorked: Math.round(yearsWorked * 100) / 100,
    },
    finiquito: {
      pendingSalary: result.pendingSalary,
      vacationCompensation: result.vacationAmount,
      vacationDaysPending: result.vacationPending,
      extraPayProration: result.extraProportional,
      subtotal: Math.round((result.pendingSalary + result.vacationAmount + result.extraProportional) * 100) / 100,
    },
    indemnizacion: {
      applicable: result.severance > 0,
      daysPerYear: result.indemnizationDays,
      yearsApplied: input.yearsWorked,
      amount: result.severance,
      legalBasis: result.legalNote,
    },
    totalBruto: result.totalBruto,
    lines: result.lines,
    inputParams: {
      annualSalary: input.annualSalary,
      dismissalType: input.dismissalType,
      vacationDaysEntitled: input.vacationDaysEntitled,
      vacationDaysTaken: input.vacationDaysTaken,
      extraPayments: input.extraPayments,
    },
  };
}

/**
 * Validate consistency between settlement and termination type.
 */
export function validateSettlementConsistency(
  snapshot: SettlementEvidenceSnapshot,
  terminationType: InternalTerminationType,
): SettlementConsistencyResult {
  const warnings: string[] = [];

  // Voluntary termination should not have indemnización
  if (['voluntary', 'probation'].includes(terminationType) && snapshot.indemnizacion.amount > 0) {
    warnings.push(`Indemnización (€${snapshot.indemnizacion.amount}) presente en baja voluntaria/periodo de prueba`);
  }

  // Objective/disciplinary should normally have indemnización
  if (['objective', 'collective'].includes(terminationType) && snapshot.indemnizacion.amount === 0) {
    warnings.push(`Sin indemnización para despido objetivo/colectivo — verificar si es correcto`);
  }

  // End of contract should have 12 days/year
  if (terminationType === 'end_contract' && snapshot.indemnizacion.daysPerYear !== 12 && snapshot.indemnizacion.applicable) {
    warnings.push(`Fin de contrato temporal: esperados 12 días/año, encontrados ${snapshot.indemnizacion.daysPerYear}`);
  }

  // Zero total is suspicious
  if (snapshot.totalBruto <= 0) {
    warnings.push('Total bruto del finiquito es 0 o negativo — verificar datos de entrada');
  }

  return {
    isConsistent: warnings.length === 0,
    warnings,
  };
}
