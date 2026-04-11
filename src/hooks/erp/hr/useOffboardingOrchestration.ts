/**
 * useOffboardingOrchestration.ts — Offboarding orchestration hook
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Source of truth for offboarding lifecycle.
 * AI analysis is assistive only — this hook drives state transitions.
 * 
 * Provides:
 * - initiateOffboarding(): create termination + ledger event
 * - calculateSettlement(): run finiquito engine + persist evidence
 * - generateAFIBaja(): build AFI baja artifact + evidence
 * - generateCertificate(): build Certific@2 artifact + evidence
 * - getOffboardingChecklist(): current readiness
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import { calculateFiniquito, type FiniquitoInput } from '@/lib/hr/laborDocumentEngine';
import { buildCertifica, type CertificaWorkerData, type CertificaEmployerData, type CertificaContractData, type CertificaSalaryData } from '@/engines/erp/hr/certificaArtifactEngine';
import {
  computeOffboardingReadiness,
  mapTerminationTypeToAFIBaja,
  mapTerminationTypeToCausaBajaSEPE,
  mapTerminationTypeToFiniquito,
  validateOffboardingConsistency,
  type InternalTerminationType,
  type OffboardingChecklistInput,
  type OffboardingChecklist,
  type OffboardingConsistencyResult,
} from '@/engines/erp/hr/offboardingOrchestrationEngine';
import {
  buildSettlementSnapshot,
  validateSettlementConsistency,
  type SettlementEmployeeContext,
  type SettlementEvidenceSnapshot,
} from '@/engines/erp/hr/settlementEvidenceEngine';

// ── Types ──

export interface OffboardingInitInput {
  employeeId: string;
  terminationType: InternalTerminationType;
  proposedDate: string;
  reason?: string;
  legalReviewRequired?: boolean;
}

export interface SettlementCalcInput {
  terminationId: string;
  employeeId: string;
  employeeName: string;
  hireDate: string;
  terminationDate: string;
  terminationType: InternalTerminationType;
  annualSalary: number;
  vacationDaysEntitled: number;
  vacationDaysTaken: number;
  extraPayments: number;
  pendingSalaryDays?: number;
  workingDaysInMonth?: number;
  monthlySalarySupplements?: number;
}

// ── Hook ──

export function useOffboardingOrchestration(companyId: string) {
  const { writeLedger, writeLedgerWithEvidence } = useHRLedgerWriter(companyId, 'offboarding');

  /**
   * Initiate an offboarding process with ledger event.
   */
  const initiateOffboarding = useCallback(async (
    input: OffboardingInitInput,
  ): Promise<string | null> => {
    try {
      // Create termination record
      const { data, error } = await (supabase as any)
        .from('erp_hr_termination_analysis')
        .insert({
          company_id: companyId,
          employee_id: input.employeeId,
          termination_type: input.terminationType,
          proposed_termination_date: input.proposedDate,
          termination_reason: input.reason ?? null,
          legal_review_required: input.legalReviewRequired ?? false,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Ledger event
      await writeLedger({
        eventType: 'termination_initiated',
        entityType: 'termination',
        entityId: data.id,
        afterSnapshot: {
          terminationType: input.terminationType,
          proposedDate: input.proposedDate,
          afiBajaSubtype: mapTerminationTypeToAFIBaja(input.terminationType),
          sepeCausa: mapTerminationTypeToCausaBajaSEPE(input.terminationType),
        },
      });

      toast.success('Proceso de offboarding iniciado');
      return data.id;
    } catch (err) {
      console.error('[useOffboardingOrchestration] initiateOffboarding error:', err);
      toast.error('Error al iniciar proceso de offboarding');
      return null;
    }
  }, [companyId, writeLedger]);

  /**
   * Calculate settlement using real finiquito engine + persist evidence.
   */
  const calculateSettlement = useCallback(async (
    input: SettlementCalcInput,
  ): Promise<SettlementEvidenceSnapshot | null> => {
    try {
      const yearsWorked = Math.max(0,
        (new Date(input.terminationDate).getTime() - new Date(input.hireDate).getTime())
        / (365.25 * 24 * 60 * 60 * 1000)
      );

      const finiquitoInput: FiniquitoInput = {
        startDate: new Date(input.hireDate),
        endDate: new Date(input.terminationDate),
        annualSalary: input.annualSalary,
        vacationDaysEntitled: input.vacationDaysEntitled,
        vacationDaysTaken: input.vacationDaysTaken,
        extraPayments: input.extraPayments,
        dismissalType: mapTerminationTypeToFiniquito(input.terminationType),
        yearsWorked: Math.round(yearsWorked * 100) / 100,
        pendingSalaryDays: input.pendingSalaryDays,
        workingDaysInMonth: input.workingDaysInMonth,
        monthlySalarySupplements: input.monthlySalarySupplements,
      };

      // Run real finiquito engine
      const result = calculateFiniquito(finiquitoInput);

      // Build evidence snapshot
      const context: SettlementEmployeeContext = {
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        companyId,
        terminationType: input.terminationType,
        terminationDate: input.terminationDate,
        hireDate: input.hireDate,
        annualSalary: input.annualSalary,
      };

      const snapshot = buildSettlementSnapshot(result, finiquitoInput, context);

      // Validate consistency
      const consistency = validateSettlementConsistency(snapshot, input.terminationType);
      if (!consistency.isConsistent) {
        consistency.warnings.forEach(w => console.warn('[Settlement]', w));
      }

      // Persist via ledger + evidence
      await writeLedgerWithEvidence(
        {
          eventType: 'settlement_calculated',
          entityType: 'termination',
          entityId: input.terminationId,
          afterSnapshot: {
            totalBruto: snapshot.totalBruto,
            finiquitoSubtotal: snapshot.finiquito.subtotal,
            indemnizacionAmount: snapshot.indemnizacion.amount,
            indemnizacionDaysPerYear: snapshot.indemnizacion.daysPerYear,
            legalBasis: snapshot.indemnizacion.legalBasis,
            consistencyWarnings: consistency.warnings,
          },
          financialImpact: {
            totalBruto: snapshot.totalBruto,
            finiquito: snapshot.finiquito.subtotal,
            indemnizacion: snapshot.indemnizacion.amount,
          },
        },
        [{
          evidenceType: 'calculation_result' as const,
          evidenceLabel: 'Cálculo de finiquito e indemnización',
          refEntityType: 'termination',
          refEntityId: input.terminationId,
          evidenceSnapshot: snapshot as unknown as Record<string, unknown>,
        }],
      );

      toast.success(`Finiquito calculado: €${snapshot.totalBruto.toLocaleString('es-ES')}`);
      return snapshot;
    } catch (err) {
      console.error('[useOffboardingOrchestration] calculateSettlement error:', err);
      toast.error('Error al calcular finiquito');
      return null;
    }
  }, [companyId, writeLedgerWithEvidence]);

  /**
   * Get offboarding readiness checklist for a termination.
   */
  const getOffboardingChecklist = useCallback((
    input: OffboardingChecklistInput,
  ): OffboardingChecklist => {
    return computeOffboardingReadiness(input);
  }, []);

  /**
   * Validate consistency between termination type, AFI, and SEPE.
   */
  const checkConsistency = useCallback((
    terminationType: InternalTerminationType,
    afiBajaSubtype: string | null,
    sepeCausa: string | null,
  ): OffboardingConsistencyResult => {
    return validateOffboardingConsistency(
      terminationType,
      afiBajaSubtype as any,
      sepeCausa as any,
    );
  }, []);

  return {
    initiateOffboarding,
    calculateSettlement,
    getOffboardingChecklist,
    checkConsistency,
  };
}
