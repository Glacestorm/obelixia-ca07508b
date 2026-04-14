/**
 * useAgreementConceptMapping — Hook for resolving agreement-specific concepts
 * 
 * Phase 2A: Resolves concepts from erp_hr_agreement_salary_concepts,
 * translates them via erp_concept_code to ES_CONCEPT_CATALOG entries,
 * and returns PayrollConcept[] ready for injection into the payroll engine.
 * 
 * Priority resolution:
 *   1. company_id match > company_id IS NULL (global)
 *   2. Greater specificity (professional_group + level > group only > all)
 *   3. Most recent applicable validity (effective_from desc)
 *   4. order_index ascending
 * 
 * Unmapped concepts (no erp_concept_code) are returned with unmapped: true.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──

export interface AgreementConceptRow {
  id: string;
  agreement_id: string;
  concept_code: string;
  concept_name: string;
  concept_type: string; // earning | deduction
  calculation_type: string;
  base_amount: number | null;
  percentage: number | null;
  formula: string | null;
  cotiza_ss: boolean;
  tributa_irpf: boolean;
  frequency: string;
  is_mandatory: boolean;
  is_active: boolean;
  order_index: number;
  erp_concept_code: string | null;
  nature: string;
  professional_group: string | null;
  level: string | null;
  effective_from: string | null;
  effective_to: string | null;
  company_id: string | null;
  embargable: boolean;
  applies_to_categories: string[] | null;
  conditions: Record<string, unknown> | null;
  mapping_version: number;
}

export interface ResolvedAgreementConcept {
  /** Original row id */
  sourceId: string;
  /** Agreement concept code (origin) */
  agreementConceptCode: string;
  /** Agreement concept name (origin) */
  agreementConceptName: string;
  /** Mapped ERP code (e.g. ES_COMP_NOCTURNIDAD) — null if unmapped */
  erpConceptCode: string | null;
  /** Whether this concept has a valid ERP mapping */
  unmapped: boolean;
  /** earning or deduction */
  type: 'earning' | 'deduction';
  /** salarial or extrasalarial */
  nature: string;
  /** Resolved amount (from base_amount or percentage logic) */
  amount: number;
  /** Whether amount is a percentage */
  isPercentage: boolean;
  /** SS computability */
  cotizaSS: boolean;
  /** IRPF computability */
  tributaIRPF: boolean;
  /** Embargable */
  embargable: boolean;
  /** Display order */
  orderIndex: number;
  /** Is mandatory per agreement */
  isMandatory: boolean;
  /** Source specificity for dedup: 'company' | 'global' */
  source: 'company' | 'global';
  /** Group specificity level: 3 = group+level, 2 = group, 1 = all */
  specificity: number;
}

// ── Classic trio codes (for fusion policy) ──
const CLASSIC_TRIO_ERP_CODES = new Set([
  'ES_SAL_BASE',
  'ES_COMP_CONVENIO',
  'ES_MEJORA_VOLUNTARIA',
]);

// ── Hook ──

export function useAgreementConceptMapping() {
  /**
   * Resolve concepts for an agreement given the payroll context.
   * Returns concepts ordered by priority, with company overrides applied.
   */
  const resolveConceptsForAgreement = useCallback(async (
    agreementId: string,
    companyId: string | null,
    professionalGroup: string | null,
    level: string | null,
    payrollDate: Date,
  ): Promise<ResolvedAgreementConcept[]> => {
    // Format date for comparison
    const dateStr = payrollDate.toISOString().slice(0, 10);

    // Fetch all active concepts for this agreement
    // We filter validity in code to handle NULL semantics correctly
    let query = supabase
      .from('erp_hr_agreement_salary_concepts')
      .select('*')
      .eq('agreement_id', agreementId)
      .eq('is_active', true);

    // Include both company-specific and global rows
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    } else {
      query = query.is('company_id', null);
    }

    query = query.order('order_index', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[useAgreementConceptMapping] query error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const rows = data as unknown as AgreementConceptRow[];

    // ── Filter by validity ──
    // effective_from IS NULL = valid since always
    // effective_to IS NULL = open-ended
    const validRows = rows.filter(r => {
      if (r.effective_from && r.effective_from > dateStr) return false;
      if (r.effective_to && r.effective_to < dateStr) return false;
      return true;
    });

    // ── Filter by group/level applicability ──
    // Include rows that: match exact group+level, match group only, or apply to all (null)
    const applicableRows = validRows.filter(r => {
      // No group filter = applies to all
      if (!r.professional_group) return true;
      // Group match required
      if (professionalGroup && r.professional_group.trim().toLowerCase() === professionalGroup.trim().toLowerCase()) {
        // Level match if specified
        if (r.level && level) {
          return r.level.trim().toLowerCase() === level.trim().toLowerCase();
        }
        // Row has no level constraint, or we have no level — matches
        if (!r.level) return true;
        // Row requires level but we don't have one — still include but lower specificity
        return true;
      }
      return false;
    });

    // ── Score specificity ──
    const scored = applicableRows.map(r => {
      let specificity = 1; // all
      if (r.professional_group) {
        specificity = 2; // group
        if (r.level && level && r.level.trim().toLowerCase() === level.trim().toLowerCase()) {
          specificity = 3; // group + level
        }
      }
      const source: 'company' | 'global' = r.company_id ? 'company' : 'global';
      return { row: r, specificity, source };
    });

    // ── Deduplicate: for each concept_code, keep highest priority ──
    // Priority: company > global, then specificity desc, then effective_from desc, then order_index asc
    const byConceptCode = new Map<string, typeof scored[0]>();
    for (const entry of scored) {
      const key = entry.row.concept_code;
      const existing = byConceptCode.get(key);
      if (!existing || comparePriority(entry, existing) > 0) {
        byConceptCode.set(key, entry);
      }
    }

    // ── Build result ──
    const results: ResolvedAgreementConcept[] = [];
    for (const { row, specificity, source } of byConceptCode.values()) {
      const isPercentage = row.calculation_type === 'percentage';
      const amount = isPercentage
        ? (Number(row.percentage) || 0)
        : (Number(row.base_amount) || 0);

      results.push({
        sourceId: row.id,
        agreementConceptCode: row.concept_code,
        agreementConceptName: row.concept_name,
        erpConceptCode: row.erp_concept_code?.trim() || null,
        unmapped: !row.erp_concept_code?.trim(),
        type: row.concept_type === 'deduction' ? 'deduction' : 'earning',
        nature: row.nature || 'salarial',
        amount,
        isPercentage,
        cotizaSS: row.cotiza_ss ?? true,
        tributaIRPF: row.tributa_irpf ?? true,
        embargable: row.embargable ?? true,
        orderIndex: row.order_index ?? 0,
        isMandatory: row.is_mandatory ?? false,
        source,
        specificity,
      });
    }

    // Sort by order_index
    results.sort((a, b) => a.orderIndex - b.orderIndex);

    return results;
  }, []);

  /**
   * Check if resolved concepts overlap with the classic trio.
   * Returns concepts that should NOT be added because they duplicate BASE/PLUS_CONV/MEJORA_VOL.
   */
  const filterClassicTrioOverlaps = useCallback((
    concepts: ResolvedAgreementConcept[],
  ): { mapped: ResolvedAgreementConcept[]; unmapped: ResolvedAgreementConcept[]; classicOverlaps: ResolvedAgreementConcept[] } => {
    const mapped: ResolvedAgreementConcept[] = [];
    const unmapped: ResolvedAgreementConcept[] = [];
    const classicOverlaps: ResolvedAgreementConcept[] = [];

    for (const c of concepts) {
      if (c.unmapped) {
        unmapped.push(c);
      } else if (c.erpConceptCode && CLASSIC_TRIO_ERP_CODES.has(c.erpConceptCode)) {
        // This concept maps to one of the classic trio — don't duplicate
        classicOverlaps.push(c);
      } else {
        mapped.push(c);
      }
    }

    return { mapped, unmapped, classicOverlaps };
  }, []);

  return {
    resolveConceptsForAgreement,
    filterClassicTrioOverlaps,
  };
}

// ── Helpers ──

function comparePriority(
  a: { source: 'company' | 'global'; specificity: number; row: AgreementConceptRow },
  b: { source: 'company' | 'global'; specificity: number; row: AgreementConceptRow },
): number {
  // 1. Company > global
  if (a.source === 'company' && b.source === 'global') return 1;
  if (a.source === 'global' && b.source === 'company') return -1;

  // 2. Higher specificity wins
  if (a.specificity !== b.specificity) return a.specificity - b.specificity;

  // 3. More recent effective_from wins
  const aFrom = a.row.effective_from || '0000-01-01';
  const bFrom = b.row.effective_from || '0000-01-01';
  if (aFrom !== bFrom) return aFrom > bFrom ? 1 : -1;

  // 4. Lower order_index wins (invert because lower is better)
  return (b.row.order_index ?? 0) - (a.row.order_index ?? 0);
}

export default useAgreementConceptMapping;
