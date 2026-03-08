/**
 * useHRCrossModuleIntegration — P9.4 Cross-Module Integration Bridge
 * Connects Premium HR modules with base ERP modules for enterprise-grade workflows.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CrossModuleEvent {
  source_module: string;
  target_module: string;
  event_type: string;
  payload: Record<string, unknown>;
  company_id: string;
}

export interface IntegrationResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Bridge hook providing typed cross-module integration functions.
 * Each function connects a source Premium module action to a target module reaction.
 */
export function useHRCrossModuleIntegration(companyId: string) {

  // ─── Compliance → Workflows ───
  // When a compliance incident is created, auto-start an approval workflow
  const triggerComplianceWorkflow = useCallback(async (
    incidentId: string,
    severity: string,
    description: string
  ): Promise<IntegrationResult> => {
    try {
      // Find the "Expediente Disciplinario" or compliance workflow definition
      const { data: definitions } = await supabase
        .from('erp_hr_workflow_definitions')
        .select('id')
        .eq('company_id', companyId)
        .ilike('name', '%compliance%')
        .limit(1);

      if (!definitions?.length) {
        return { success: false, message: 'No hay workflow de compliance configurado' };
      }

      // Start workflow instance
      const { error } = await supabase.functions.invoke('erp-hr-workflow-engine', {
        body: {
          action: 'start_workflow',
          company_id: companyId,
          definition_id: definitions[0].id,
          triggered_by_entity: 'compliance_incident',
          triggered_by_id: incidentId,
          context: { severity, description, source: 'compliance_integration' }
        }
      });

      if (error) throw error;

      // Log the cross-module event
      await logIntegrationEvent('compliance', 'workflows', 'incident_workflow_triggered', {
        incident_id: incidentId, severity, workflow_definition_id: definitions[0].id
      });

      toast.success('Workflow de compliance iniciado automáticamente');
      return { success: true, message: 'Workflow iniciado' };
    } catch (err) {
      console.error('[CrossModule] triggerComplianceWorkflow error:', err);
      return { success: false, message: 'Error al iniciar workflow' };
    }
  }, [companyId]);

  // ─── AI Governance → Audit Log ───
  // When an AI decision is made, log it in both governance and general audit
  const logAIDecisionWithGovernance = useCallback(async (
    modelId: string,
    decisionType: string,
    inputData: Record<string, unknown>,
    outputData: Record<string, unknown>,
    confidenceScore: number
  ): Promise<IntegrationResult> => {
    try {
      // Insert into AI decisions table
      const { data: decision, error } = await supabase
        .from('erp_hr_ai_decisions' as any)
        .insert([{
          company_id: companyId,
          model_id: modelId,
          decision_type: decisionType,
          input_data: inputData,
          output_data: outputData,
          confidence_score: confidenceScore,
          status: confidenceScore >= 0.8 ? 'approved' : 'pending_review',
          requires_human_review: confidenceScore < 0.8
        }])
        .select()
        .single();

      if (error) throw error;

      await logIntegrationEvent('ai_governance', 'audit', 'ai_decision_logged', {
        decision_id: (decision as any)?.id,
        model_id: modelId,
        confidence: confidenceScore,
        requires_review: confidenceScore < 0.8
      });

      if (confidenceScore < 0.8) {
        toast.info('Decisión IA requiere revisión humana (confianza < 80%)');
      }

      return { success: true, message: 'Decisión IA registrada con gobernanza', data: decision as any };
    } catch (err) {
      console.error('[CrossModule] logAIDecisionWithGovernance error:', err);
      return { success: false, message: 'Error al registrar decisión IA' };
    }
  }, [companyId]);

  // ─── Fairness → Compensation ───
  // When pay equity analysis finds a gap, create an equity action plan
  const createEquityActionFromAnalysis = useCallback(async (
    analysisId: string,
    gap: { department: string; gap_percentage: number; affected_count: number }
  ): Promise<IntegrationResult> => {
    try {
      const { error } = await supabase
        .from('erp_hr_equity_action_plans' as any)
        .insert([{
          company_id: companyId,
          analysis_id: analysisId,
          title: `Plan corrección brecha salarial — ${gap.department}`,
          department: gap.department,
          gap_percentage: gap.gap_percentage,
          affected_employees: gap.affected_count,
          status: 'pending',
          priority: gap.gap_percentage > 15 ? 'critical' : gap.gap_percentage > 8 ? 'high' : 'medium',
          recommended_actions: JSON.stringify([
            'Revisión salarial individual',
            'Ajuste en próximo ciclo de mérito',
            'Auditoría de criterios de promoción'
          ])
        }]);

      if (error) throw error;

      await logIntegrationEvent('fairness', 'compensation', 'equity_action_created', {
        analysis_id: analysisId,
        department: gap.department,
        gap_percentage: gap.gap_percentage
      });

      toast.success(`Plan de acción de equidad creado para ${gap.department}`);
      return { success: true, message: 'Plan de acción creado' };
    } catch (err) {
      console.error('[CrossModule] createEquityActionFromAnalysis error:', err);
      return { success: false, message: 'Error al crear plan de acción' };
    }
  }, [companyId]);

  // ─── CNAE → Compliance ───
  // When CNAE sector profile detects a new regulation, create a compliance policy
  const syncCNAEToCompliance = useCallback(async (
    cnaeCode: string,
    ruleName: string,
    ruleDescription: string,
    jurisdiction: string
  ): Promise<IntegrationResult> => {
    try {
      // Check if policy already exists
      const { data: existing } = await supabase
        .from('erp_hr_compliance_policies' as any)
        .select('id')
        .eq('company_id', companyId)
        .ilike('name', `%${ruleName}%`)
        .limit(1);

      if (existing?.length) {
        return { success: true, message: 'Política ya existente' };
      }

      const { error } = await supabase
        .from('erp_hr_compliance_policies' as any)
        .insert([{
          company_id: companyId,
          name: `[CNAE ${cnaeCode}] ${ruleName}`,
          description: ruleDescription,
          category: 'sectorial',
          jurisdiction,
          status: 'draft',
          source: 'cnae_intelligence',
          metadata: { cnae_code: cnaeCode, auto_generated: true }
        }]);

      if (error) throw error;

      await logIntegrationEvent('cnae', 'compliance', 'sectorial_policy_synced', {
        cnae_code: cnaeCode, rule_name: ruleName, jurisdiction
      });

      toast.success('Política sectorial sincronizada desde CNAE');
      return { success: true, message: 'Política creada desde CNAE' };
    } catch (err) {
      console.error('[CrossModule] syncCNAEToCompliance error:', err);
      return { success: false, message: 'Error al sincronizar política' };
    }
  }, [companyId]);

  // ─── Digital Twin → Workforce Planning ───
  // When a twin experiment completes, create a workforce planning scenario
  const createScenarioFromTwinExperiment = useCallback(async (
    experimentName: string,
    experimentResults: Record<string, unknown>
  ): Promise<IntegrationResult> => {
    try {
      const { error } = await supabase
        .from('erp_hr_scenarios' as any)
        .insert([{
          company_id: companyId,
          name: `[Twin] ${experimentName}`,
          description: `Escenario generado desde experimento Digital Twin: ${experimentName}`,
          scenario_type: 'what_if',
          status: 'draft',
          parameters: experimentResults,
          source: 'digital_twin',
          metadata: { auto_generated: true }
        }]);

      if (error) throw error;

      await logIntegrationEvent('digital_twin', 'workforce_planning', 'scenario_from_experiment', {
        experiment_name: experimentName
      });

      toast.success('Escenario creado desde experimento del Digital Twin');
      return { success: true, message: 'Escenario creado' };
    } catch (err) {
      console.error('[CrossModule] createScenarioFromTwinExperiment error:', err);
      return { success: false, message: 'Error al crear escenario' };
    }
  }, [companyId]);

  // ─── Security → Compliance ───
  // When a security incident is detected, auto-create compliance incident
  const escalateSecurityToCompliance = useCallback(async (
    incidentType: string,
    severity: string,
    details: string
  ): Promise<IntegrationResult> => {
    try {
      const { error } = await supabase
        .from('erp_hr_compliance_incidents' as any)
        .insert([{
          company_id: companyId,
          title: `[Seguridad] ${incidentType}`,
          description: details,
          severity,
          category: 'security_breach',
          status: 'open',
          source: 'security_module',
          metadata: { auto_escalated: true, original_type: incidentType }
        }]);

      if (error) throw error;

      await logIntegrationEvent('security', 'compliance', 'security_incident_escalated', {
        incident_type: incidentType, severity
      });

      toast.warning('Incidente de seguridad escalado a compliance');
      return { success: true, message: 'Incidente escalado' };
    } catch (err) {
      console.error('[CrossModule] escalateSecurityToCompliance error:', err);
      return { success: false, message: 'Error al escalar incidente' };
    }
  }, [companyId]);

  // ─── Integration Event Logger ───
  const logIntegrationEvent = useCallback(async (
    sourceModule: string,
    targetModule: string,
    eventType: string,
    payload: Record<string, unknown>
  ) => {
    try {
      await supabase.from('erp_hr_audit_log').insert([{
        company_id: companyId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'CROSS_MODULE_INTEGRATION',
        table_name: `${sourceModule}→${targetModule}`,
        record_id: eventType,
        new_data: payload as any,
        category: 'integration',
        severity: 'info',
        metadata: { source_module: sourceModule, target_module: targetModule, event_type: eventType } as any
      }]);
    } catch (err) {
      console.error('[CrossModule] logIntegrationEvent error:', err);
    }
  }, [companyId]);

  return {
    // Compliance ↔ Workflows
    triggerComplianceWorkflow,
    // AI Governance ↔ Audit
    logAIDecisionWithGovernance,
    // Fairness ↔ Compensation
    createEquityActionFromAnalysis,
    // CNAE ↔ Compliance
    syncCNAEToCompliance,
    // Digital Twin ↔ Workforce Planning
    createScenarioFromTwinExperiment,
    // Security ↔ Compliance
    escalateSecurityToCompliance,
    // Direct logging
    logIntegrationEvent,
  };
}

export default useHRCrossModuleIntegration;
