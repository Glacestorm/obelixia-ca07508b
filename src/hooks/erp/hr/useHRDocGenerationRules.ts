/**
 * useHRDocGenerationRules — Hook de lectura de reglas de generación documental
 * V2-ES.4 Paso 5.1: Lectura cacheada de reglas por proceso con fallback estático
 *
 * REGLAS:
 * - Solo lectura (sin CRUD en esta fase)
 * - Cache largo (configuración casi estática)
 * - Fallback a EXPECTED_DOCS_BY_REQUEST_TYPE si BD vacía
 * - Preparado para futuro CRUD por empresa/admin
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EXPECTED_DOCS_BY_REQUEST_TYPE } from '@/components/erp/hr/shared/documentExpectedTypes';
import type { AdminRequestType } from '@/hooks/admin/hr/useAdminPortal';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocGenerationRule {
  id: string;
  process_type: string;
  document_type_code: string;
  label: string;
  default_document_name: string;
  default_category: string;
  default_subcategory: string | null;
  is_confidential_default: boolean;
  notes_template: string | null;
  metadata_defaults: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

// ─── REQUEST_TYPE → PROCESS_TYPE mapping ─────────────────────────────────────

const REQUEST_TO_PROCESS: Record<string, string> = {
  employee_registration: 'employee_registration',
  contract_modification: 'contract_modification',
  salary_change: 'salary_change',
  sick_leave: 'sick_leave',
  work_accident: 'work_accident',
  birth_leave: 'birth_leave',
  termination: 'termination',
  settlement: 'settlement',
  document_submission: 'document_submission',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRDocGenerationRules() {
  const { data: allRules = [], isLoading } = useQuery({
    queryKey: ['erp-hr-doc-generation-rules'],
    queryFn: async (): Promise<DocGenerationRule[]> => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_doc_generation_rules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[useHRDocGenerationRules] DB query failed, using static fallback:', error.message);
        return [];
      }
      return (data ?? []) as DocGenerationRule[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  /**
   * Obtiene las reglas de generación para un request_type.
   * Falls back to static EXPECTED_DOCS if no DB data.
   */
  function getRulesForRequest(requestType: string | null | undefined): DocGenerationRule[] {
    if (!requestType) return [];

    const processType = REQUEST_TO_PROCESS[requestType] ?? requestType;
    const dbRules = allRules.filter(r => r.process_type === processType);

    if (dbRules.length > 0) return dbRules;

    // Fallback estático
    const staticExpected = EXPECTED_DOCS_BY_REQUEST_TYPE[requestType as AdminRequestType];
    if (!staticExpected || staticExpected.length === 0) return [];

    return staticExpected.map((exp, i) => ({
      id: `static-${exp.type}`,
      process_type: processType,
      document_type_code: exp.type,
      label: exp.label,
      default_document_name: `${exp.label} - {employee}`,
      default_category: 'laboral',
      default_subcategory: null,
      is_confidential_default: false,
      notes_template: null,
      metadata_defaults: {},
      is_active: true,
      sort_order: i,
    }));
  }

  return {
    allRules,
    isLoading,
    getRulesForRequest,
  };
}
