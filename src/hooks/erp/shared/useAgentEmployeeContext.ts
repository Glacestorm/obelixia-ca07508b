/**
 * useAgentEmployeeContext — Hook para inyectar contexto legal del empleado
 * en los agentes IA cross-module (HR, Contabilidad, Fiscal).
 *
 * Los agentes usan este hook para enriquecer sus prompts con datos reales
 * del perfil legal unificado persistido en erp_employee_legal_profiles.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentEmployeeContext {
  employeeId: string;
  aiContext: string;
  profileData: Record<string, unknown>;
  computedAt: string;
}

/**
 * Retrieves the persisted legal profile context for a single employee.
 * Used by any AI agent that needs employee labor data.
 */
export async function getEmployeeLegalContext(employeeId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('erp_employee_legal_profiles' as any)
      .select('ai_context')
      .eq('employee_id', employeeId)
      .maybeSingle();
    return (data as any)?.ai_context || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves legal profile contexts for all employees of a company.
 * Used by supervisor agents that need company-wide visibility.
 */
export async function getCompanyEmployeesLegalContext(companyId: string): Promise<AgentEmployeeContext[]> {
  try {
    const { data } = await supabase
      .from('erp_employee_legal_profiles' as any)
      .select('employee_id, ai_context, profile_data, computed_at')
      .eq('company_id', companyId);
    return (data as any[] || []).map((d: any) => ({
      employeeId: d.employee_id,
      aiContext: d.ai_context,
      profileData: d.profile_data,
      computedAt: d.computed_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Builds a system prompt injection for AI agents with employee context.
 * Agents should prepend this to their system prompt.
 */
export function buildAgentSystemPromptWithEmployee(
  basePrompt: string,
  employeeContext: string | null,
  domain: 'hr' | 'accounting' | 'fiscal' | 'legal',
): string {
  if (!employeeContext) return basePrompt;

  const domainInstructions: Record<string, string> = {
    hr: `Utiliza el perfil legal del empleado para responder consultas sobre contratos, SS, IRPF, permisos, nómina y compliance laboral. Verifica que las respuestas sean coherentes con los datos de contrato, grupo de cotización y situación familiar.`,
    accounting: `Utiliza el perfil legal del empleado para responder consultas sobre asientos de nómina (PGC 640/642/476/471), provisiones de SS (642/476) y periodificación de costes laborales. El coste empresa incluye SS patronal (${domain}).`,
    fiscal: `Utiliza el perfil legal del empleado para responder consultas sobre retenciones IRPF (Modelo 111/190), declaraciones SS (RLC/RNT), y obligaciones fiscales del empleador identificado por NIF y CCC.`,
    legal: `Utiliza el perfil legal del empleado para validar cumplimiento normativo: duración máxima de contratos, conversión a indefinido (ET Art. 15.5), periodos de prueba (ET Art. 14), y requisitos de forma contractual.`,
  };

  return `${basePrompt}

=== CONTEXTO LEGAL DEL EMPLEADO (DATOS REALES) ===
${domainInstructions[domain] || domainInstructions.hr}

${employeeContext}
=== FIN CONTEXTO LEGAL ===`;
}

/**
 * Builds a company-wide summary for supervisor-level agents.
 */
export function buildCompanySummaryForAgent(
  contexts: AgentEmployeeContext[],
): string {
  if (contexts.length === 0) return 'No hay perfiles legales de empleados disponibles.';

  return [
    `=== RESUMEN PLANTILLA: ${contexts.length} empleados con perfil legal ===`,
    ...contexts.map(c => `\n--- ${c.employeeId} ---\n${c.aiContext}`),
    `=== FIN RESUMEN PLANTILLA ===`,
  ].join('\n');
}

/**
 * Hook version for use in React components/hooks.
 */
export function useAgentEmployeeContext(companyId: string) {
  const getForEmployee = useCallback(async (employeeId: string) => {
    return getEmployeeLegalContext(employeeId);
  }, []);

  const getForCompany = useCallback(async () => {
    return getCompanyEmployeesLegalContext(companyId);
  }, [companyId]);

  return {
    getForEmployee,
    getForCompany,
    buildAgentSystemPromptWithEmployee,
    buildCompanySummaryForAgent,
  };
}
