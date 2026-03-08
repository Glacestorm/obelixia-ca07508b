/**
 * useHROrchestrationBridge — P10.3
 * Provides typed emit helpers for each Premium module to fire orchestration events.
 * Acts as the integration layer between individual modules and the orchestration engine.
 */

import { useCallback, useMemo } from 'react';
import { useHROrchestrationEmitter, type EmitResult } from './useHROrchestrationEmitter';
import type { ModuleKey, TriggerEvent } from './useHROrchestration';

export interface ModuleEmitHelpers {
  /** Security & Governance module emitters */
  security: {
    onIncidentCreated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onMaskingRuleChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onSoDViolation: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onClassificationChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** AI Governance module emitters */
  ai_governance: {
    onBiasDetected: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onModelStatusChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onPolicyViolation: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onDecisionLogged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** Workforce Planning module emitters */
  workforce: {
    onPlanCreated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onScenarioCompleted: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onGapThresholdExceeded: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onBudgetChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** Fairness / Justice Engine module emitters */
  fairness: {
    onCaseCreated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onCaseStatusChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onEquityGapDetected: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onActionPlanUpdated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** Digital Twin module emitters */
  twin: {
    onDivergenceDetected: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onExperimentCompleted: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onHealthScoreChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onAlertTriggered: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** Legal Engine module emitters */
  legal: {
    onContractGenerated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onComplianceCheckFailed: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onClauseRiskDetected: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onContractStatusChanged: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** CNAE Intelligence module emitters */
  cnae: {
    onRiskAssessmentCreated: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onComplianceRuleTriggered: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onBenchmarkDeviation: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
  /** Role Experience module emitters */
  role_experience: {
    onRoleAssigned: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onOnboardingCompleted: (data: Record<string, unknown>) => Promise<EmitResult | null>;
    onKPIThresholdExceeded: (data: Record<string, unknown>) => Promise<EmitResult | null>;
  };
}

/** Map of module → table names for default trigger_table values */
const MODULE_TABLES: Record<ModuleKey, string> = {
  security: 'erp_hr_masking_rules',
  ai_governance: 'erp_hr_ai_model_registry',
  workforce: 'erp_hr_workforce_plans',
  fairness: 'erp_hr_justice_cases',
  twin: 'erp_hr_twin_instances',
  legal: 'erp_hr_legal_contracts',
  cnae: 'erp_hr_cnae_risk_assessments',
  role_experience: 'erp_hr_role_experience_profiles',
};

function createEmitter(
  emit: (m: ModuleKey, e: TriggerEvent, t?: string, d?: Record<string, unknown>) => Promise<EmitResult | null>,
  module: ModuleKey,
  event: TriggerEvent,
  table?: string
) {
  return (data: Record<string, unknown>) => emit(module, event, table || MODULE_TABLES[module], data);
}

export function useHROrchestrationBridge(companyId: string | null) {
  const { emit, isEmitting, lastResult, getChainStatus } = useHROrchestrationEmitter(companyId);

  const e = useCallback(
    (m: ModuleKey, ev: TriggerEvent, t?: string, d?: Record<string, unknown>) => emit(m, ev, t, d),
    [emit]
  );

  const modules: ModuleEmitHelpers = useMemo(() => ({
    security: {
      onIncidentCreated: createEmitter(e, 'security', 'record_created', 'erp_hr_security_incidents'),
      onMaskingRuleChanged: createEmitter(e, 'security', 'record_updated', 'erp_hr_masking_rules'),
      onSoDViolation: createEmitter(e, 'security', 'threshold_exceeded', 'erp_hr_sod_violations'),
      onClassificationChanged: createEmitter(e, 'security', 'status_changed', 'erp_hr_data_classifications'),
    },
    ai_governance: {
      onBiasDetected: createEmitter(e, 'ai_governance', 'threshold_exceeded', 'erp_hr_ai_bias_audits'),
      onModelStatusChanged: createEmitter(e, 'ai_governance', 'status_changed', 'erp_hr_ai_models'),
      onPolicyViolation: createEmitter(e, 'ai_governance', 'threshold_exceeded', 'erp_hr_ai_governance_policies'),
      onDecisionLogged: createEmitter(e, 'ai_governance', 'record_created', 'erp_hr_ai_decisions'),
    },
    workforce: {
      onPlanCreated: createEmitter(e, 'workforce', 'record_created'),
      onScenarioCompleted: createEmitter(e, 'workforce', 'status_changed', 'erp_hr_workforce_scenarios'),
      onGapThresholdExceeded: createEmitter(e, 'workforce', 'threshold_exceeded'),
      onBudgetChanged: createEmitter(e, 'workforce', 'record_updated'),
    },
    fairness: {
      onCaseCreated: createEmitter(e, 'fairness', 'record_created'),
      onCaseStatusChanged: createEmitter(e, 'fairness', 'status_changed'),
      onEquityGapDetected: createEmitter(e, 'fairness', 'threshold_exceeded', 'erp_hr_pay_equity_analyses'),
      onActionPlanUpdated: createEmitter(e, 'fairness', 'record_updated', 'erp_hr_equity_action_plans'),
    },
    twin: {
      onDivergenceDetected: createEmitter(e, 'twin', 'threshold_exceeded'),
      onExperimentCompleted: createEmitter(e, 'twin', 'status_changed', 'erp_hr_twin_experiments'),
      onHealthScoreChanged: createEmitter(e, 'twin', 'record_updated'),
      onAlertTriggered: createEmitter(e, 'twin', 'record_created', 'erp_hr_twin_alerts'),
    },
    legal: {
      onContractGenerated: createEmitter(e, 'legal', 'record_created'),
      onComplianceCheckFailed: createEmitter(e, 'legal', 'threshold_exceeded', 'erp_hr_legal_compliance_checks'),
      onClauseRiskDetected: createEmitter(e, 'legal', 'threshold_exceeded', 'erp_hr_legal_clauses'),
      onContractStatusChanged: createEmitter(e, 'legal', 'status_changed'),
    },
    cnae: {
      onRiskAssessmentCreated: createEmitter(e, 'cnae', 'record_created'),
      onComplianceRuleTriggered: createEmitter(e, 'cnae', 'threshold_exceeded', 'erp_hr_cnae_compliance_rules'),
      onBenchmarkDeviation: createEmitter(e, 'cnae', 'threshold_exceeded', 'erp_hr_cnae_benchmarks'),
    },
    role_experience: {
      onRoleAssigned: createEmitter(e, 'role_experience', 'record_created'),
      onOnboardingCompleted: createEmitter(e, 'role_experience', 'status_changed'),
      onKPIThresholdExceeded: createEmitter(e, 'role_experience', 'threshold_exceeded'),
    },
  }), [e]);

  return {
    modules,
    isEmitting,
    lastResult,
    getChainStatus,
    /** Raw emit for custom events */
    emitRaw: emit,
  };
}

export default useHROrchestrationBridge;
