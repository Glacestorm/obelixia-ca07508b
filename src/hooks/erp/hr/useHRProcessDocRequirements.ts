/**
 * useHRProcessDocRequirements — Hook para checklist documental por proceso HR
 * V2-ES.4 Paso 1 (parte 4): Lectura cacheada + cálculo de completitud enriquecido
 *
 * REGLAS:
 * - Query cacheada con staleTime alto (configuración casi estática)
 * - Fallback al mapa estático de documentExpectedTypes.ts si BD no disponible
 * - Cálculo de completitud con distinción obligatorio/opcional
 * - Compatible con V2-ES.3 (misma normalización)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDocType, EXPECTED_DOCS_BY_REQUEST_TYPE } from '@/components/erp/hr/shared/documentExpectedTypes';
import type { AdminRequestType } from '@/hooks/admin/hr/useAdminPortal';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessDocRequirement {
  id: string;
  process_type: string;
  document_type_code: string;
  label: string;
  is_mandatory: boolean;
  sort_order: number;
  notes: string | null;
  is_active: boolean;
}

export interface EnrichedCompleteness {
  /** All expected requirements for this process */
  requirements: ProcessDocRequirement[];
  /** Types present (normalized) */
  present: string[];
  /** Types missing (normalized) */
  missing: string[];
  /** Mandatory types missing */
  mandatoryMissing: string[];
  /** Optional types missing */
  optionalMissing: string[];
  /** Counts */
  total: number;
  totalMandatory: number;
  totalOptional: number;
  completed: number;
  completedMandatory: number;
  completedOptional: number;
  /** Percentage (weighted: mandatory counts fully) */
  percentage: number;
  /** True if all mandatory docs are present */
  mandatoryComplete: boolean;
}

// ─── Mapping request_type → process_type ─────────────────────────────────────

const REQUEST_TO_PROCESS: Record<string, string> = {
  employee_registration: 'employee_registration',
  contract_modification: 'contract_modification',
  salary_change: 'contract_modification',
  sick_leave: 'sick_leave',
  work_accident: 'work_accident',
  birth_leave: 'birth_leave',
  termination: 'termination',
  settlement: 'termination',
  document_submission: 'document_submission',
};

// ─── Computation ─────────────────────────────────────────────────────────────

/**
 * Computes enriched completeness from requirements and existing docs.
 * Pure function — no side effects.
 */
export function computeEnrichedCompleteness(
  requirements: ProcessDocRequirement[],
  existingDocs: Array<{ document_type: string }>,
): EnrichedCompleteness {
  const existingNormalized = new Set(
    existingDocs.map(d => normalizeDocType(d.document_type)),
  );

  const present: string[] = [];
  const missing: string[] = [];
  const mandatoryMissing: string[] = [];
  const optionalMissing: string[] = [];
  let completedMandatory = 0;
  let completedOptional = 0;
  let totalMandatory = 0;
  let totalOptional = 0;

  for (const req of requirements) {
    const norm = normalizeDocType(req.document_type_code);
    const isPresent = existingNormalized.has(norm);

    if (req.is_mandatory) {
      totalMandatory++;
      if (isPresent) {
        completedMandatory++;
        present.push(req.document_type_code);
      } else {
        mandatoryMissing.push(req.document_type_code);
        missing.push(req.document_type_code);
      }
    } else {
      totalOptional++;
      if (isPresent) {
        completedOptional++;
        present.push(req.document_type_code);
      } else {
        optionalMissing.push(req.document_type_code);
        missing.push(req.document_type_code);
      }
    }
  }

  const total = requirements.length;
  const completed = present.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

  return {
    requirements,
    present,
    missing,
    mandatoryMissing,
    optionalMissing,
    total,
    totalMandatory,
    totalOptional,
    completed,
    completedMandatory,
    completedOptional,
    percentage,
    mandatoryComplete: mandatoryMissing.length === 0,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRProcessDocRequirements() {
  const { data: allRequirements = [], isLoading } = useQuery({
    queryKey: ['erp-hr-process-doc-requirements'],
    queryFn: async (): Promise<ProcessDocRequirement[]> => {
      const { data, error } = await supabase
        .from('erp_hr_process_doc_requirements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[useHRProcessDocRequirements] DB query failed, using static fallback:', error.message);
        return [];
      }
      return (data ?? []) as ProcessDocRequirement[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  /**
   * Gets requirements for a request_type (maps to process_type internally).
   * Falls back to static EXPECTED_DOCS_BY_REQUEST_TYPE if no DB data.
   */
  function getRequirementsForRequest(requestType: string | null | undefined): ProcessDocRequirement[] {
    if (!requestType) return [];

    const processType = REQUEST_TO_PROCESS[requestType] ?? requestType;
    const dbReqs = allRequirements.filter(r => r.process_type === processType);

    if (dbReqs.length > 0) return dbReqs;

    // Fallback to static map (V2-ES.3 compat)
    const staticExpected = EXPECTED_DOCS_BY_REQUEST_TYPE[requestType as AdminRequestType];
    if (!staticExpected || staticExpected.length === 0) return [];

    return staticExpected.map((exp, i) => ({
      id: `static-${exp.type}`,
      process_type: processType,
      document_type_code: exp.type,
      label: exp.label,
      is_mandatory: true, // static map treats all as mandatory
      sort_order: i,
      notes: null,
      is_active: true,
    }));
  }

  /**
   * Computes enriched completeness for a request type + existing docs.
   * Returns null if no requirements exist for the request type.
   */
  function getCompleteness(
    requestType: string | null | undefined,
    existingDocs: Array<{ document_type: string }>,
  ): EnrichedCompleteness | null {
    const reqs = getRequirementsForRequest(requestType);
    if (reqs.length === 0) return null;
    return computeEnrichedCompleteness(reqs, existingDocs);
  }

  return {
    allRequirements,
    isLoading,
    getRequirementsForRequest,
    getCompleteness,
  };
}
