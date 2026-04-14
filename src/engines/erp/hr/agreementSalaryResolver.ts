/**
 * Agreement Salary Resolver — Motor de Resolución Salarial por Convenio
 * 
 * Resuelve automáticamente:
 *   - ES_SAL_BASE → Salario base de convenio según grupo profesional
 *   - ES_MEJORA_VOLUNTARIA → Diferencia entre salario pactado y salario de convenio
 *   - ES_COMP_CONVENIO → Plus de convenio de las tablas salariales
 * 
 * Art. 26.5 ET: La mejora voluntaria es absorbible y compensable
 * Art. 26.3 ET: El salario base se fija por unidad de tiempo o de obra
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ──

export interface AgreementSalaryTable {
  id: string;
  company_id: string;
  agreement_code: string;
  agreement_name: string;
  year: number;
  professional_group: string;
  professional_group_description: string | null;
  level: string;
  base_salary_monthly: number;
  base_salary_annual: number | null;
  plus_convenio_monthly: number;
  extra_pay_amount: number | null;
  total_annual_compensation: number | null;
  is_active: boolean;
  effective_date: string;
  expiration_date: string | null;
  source_reference: string | null;
  metadata: Record<string, unknown>;
}

export interface SalaryResolutionResult {
  /** Salario base de convenio (mensual) */
  salarioBaseConvenio: number;
  /** Plus convenio de tablas salariales (mensual) */
  plusConvenioTabla: number;
  /** Mejora voluntaria = salario pactado - (base convenio + plus convenio) */
  mejoraVoluntaria: number;
  /** Si la mejora es positiva (salario pactado > convenio) */
  hasMejoraVoluntaria: boolean;
  /** Datos de la tabla salarial utilizada */
  tableEntry: AgreementSalaryTable | null;
  /** Trazabilidad del cálculo */
  trace: SalaryResolutionTrace;
}

export interface SalaryResolutionTrace {
  agreementCode: string;
  professionalGroup: string;
  year: number;
  salarioPactado: number;
  salarioBaseConvenio: number;
  plusConvenioTabla: number;
  totalMinimoConvenio: number;
  mejoraVoluntaria: number;
  formula: string;
  legalReference: string;
  timestamp: string;
}

// ── Engine ──

/**
 * Fetches the salary table entry for a given agreement, group and year
 */
export async function fetchAgreementSalaryTable(
  companyId: string,
  agreementCode: string,
  professionalGroup: string,
  year: number,
  level?: string,
): Promise<{ entry: AgreementSalaryTable | null; ambiguous: boolean }> {
  // Fix A: Prefer company-specific table, fallback to sectoral (company_id IS NULL)
  // Try company-specific first
  let query = supabase
    .from('erp_hr_agreement_salary_tables')
    .select('*')
    .eq('agreement_code', agreementCode)
    .eq('professional_group', professionalGroup)
    .eq('year', year)
    .eq('is_active', true);

  if (level) {
    query = query.eq('level', level);
  }
  // Fix B: When no level specified, don't filter by level at all

  // Prefer company-specific rows, then sectoral (null)
  query = query.or(`company_id.eq.${companyId},company_id.is.null`)
    .order('company_id', { ascending: false, nullsFirst: false }); // company-specific first

  const { data, error } = await query;

  if (error) {
    console.error('[agreementSalaryResolver] fetchTable error:', error);
    return { entry: null, ambiguous: false };
  }

  if (!data || data.length === 0) {
    return { entry: null, ambiguous: false };
  }

  // If level was specified or only one result, return directly
  if (level || data.length === 1) {
    return { entry: data[0] as AgreementSalaryTable, ambiguous: false };
  }

  // Fix B: Multiple rows without level filter — check if ambiguous
  // If there's a company-specific entry, prefer it
  const companySpecific = data.filter((r: any) => r.company_id === companyId);
  if (companySpecific.length === 1) {
    return { entry: companySpecific[0] as AgreementSalaryTable, ambiguous: false };
  }
  if (companySpecific.length > 1) {
    // Multiple company-specific entries for same group without level — ambiguous
    console.warn('[agreementSalaryResolver] Ambiguous: multiple company-specific entries for group', professionalGroup);
    return { entry: null, ambiguous: true };
  }

  // Only sectoral entries
  const sectoralEntries = data.filter((r: any) => r.company_id === null);
  if (sectoralEntries.length === 1) {
    return { entry: sectoralEntries[0] as AgreementSalaryTable, ambiguous: false };
  }

  // Multiple sectoral entries — ambiguous
  console.warn('[agreementSalaryResolver] Ambiguous: multiple sectoral entries for group', professionalGroup);
  return { entry: null, ambiguous: true };
}

/**
 * Fetches all salary tables for an agreement and year
 */
export async function fetchAllAgreementSalaryTables(
  companyId: string,
  agreementCode: string,
  year: number,
): Promise<AgreementSalaryTable[]> {
  // Fix A: Include sectoral tables (company_id IS NULL)
  const { data, error } = await supabase
    .from('erp_hr_agreement_salary_tables')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .eq('agreement_code', agreementCode)
    .eq('year', year)
    .eq('is_active', true)
    .order('professional_group', { ascending: true });

  if (error) {
    console.error('[agreementSalaryResolver] fetchAll error:', error);
    return [];
  }

  return (data || []) as AgreementSalaryTable[];
}

/**
 * Core resolution: Given a negotiated salary, resolves how it splits between
 * convention base salary and voluntary improvement (mejora voluntaria).
 * 
 * Logic:
 *   1. Look up the agreement salary table for the employee's professional group
 *   2. ES_SAL_BASE = table.base_salary_monthly (minimum by convention)
 *   3. ES_COMP_CONVENIO = table.plus_convenio_monthly (if defined in table)
 *   4. totalMinimoConvenio = ES_SAL_BASE + ES_COMP_CONVENIO
 *   5. ES_MEJORA_VOLUNTARIA = max(0, salarioPactado - totalMinimoConvenio)
 *   6. If salarioPactado < totalMinimoConvenio → use totalMinimoConvenio (legal minimum)
 */
export function resolveSalaryFromAgreement(
  salarioPactado: number,
  tableEntry: AgreementSalaryTable | null,
  agreementCode: string,
  professionalGroup: string,
  year: number,
): SalaryResolutionResult {
  const ts = new Date().toISOString();

  // No table found → use full salary as base, no mejora
  if (!tableEntry) {
    return {
      salarioBaseConvenio: salarioPactado,
      plusConvenioTabla: 0,
      mejoraVoluntaria: 0,
      hasMejoraVoluntaria: false,
      tableEntry: null,
      trace: {
        agreementCode,
        professionalGroup,
        year,
        salarioPactado,
        salarioBaseConvenio: salarioPactado,
        plusConvenioTabla: 0,
        totalMinimoConvenio: salarioPactado,
        mejoraVoluntaria: 0,
        formula: 'Sin tabla salarial → salario pactado íntegro como salario base',
        legalReference: 'ET Art. 26',
        timestamp: ts,
      },
    };
  }

  const salarioBaseConvenio = Number(tableEntry.base_salary_monthly);
  const plusConvenioTabla = Number(tableEntry.plus_convenio_monthly) || 0;
  const totalMinimoConvenio = salarioBaseConvenio + plusConvenioTabla;

  // Ensure employee gets at least the convention minimum
  const effectiveSalario = Math.max(salarioPactado, totalMinimoConvenio);
  const mejoraVoluntaria = Math.max(0, effectiveSalario - totalMinimoConvenio);
  const r = (n: number) => Math.round(n * 100) / 100;

  return {
    salarioBaseConvenio: r(salarioBaseConvenio),
    plusConvenioTabla: r(plusConvenioTabla),
    mejoraVoluntaria: r(mejoraVoluntaria),
    hasMejoraVoluntaria: mejoraVoluntaria > 0,
    tableEntry,
    trace: {
      agreementCode,
      professionalGroup,
      year,
      salarioPactado: r(salarioPactado),
      salarioBaseConvenio: r(salarioBaseConvenio),
      plusConvenioTabla: r(plusConvenioTabla),
      totalMinimoConvenio: r(totalMinimoConvenio),
      mejoraVoluntaria: r(mejoraVoluntaria),
      formula: mejoraVoluntaria > 0
        ? `Mejora Voluntaria = Salario Pactado (${r(salarioPactado)}€) - [Base Convenio (${r(salarioBaseConvenio)}€) + Plus Convenio (${r(plusConvenioTabla)}€)] = ${r(mejoraVoluntaria)}€`
        : `Salario = mínimo convenio (${r(totalMinimoConvenio)}€). Sin mejora voluntaria.`,
      legalReference: 'ET Art. 26.5 — Mejora voluntaria absorbible y compensable',
      timestamp: ts,
    },
  };
}

/**
 * Full async resolution: fetches table + resolves salary
 */
export async function resolveEmployeeSalary(
  companyId: string,
  agreementCode: string,
  professionalGroup: string,
  year: number,
  salarioPactado: number,
  level?: string,
): Promise<SalaryResolutionResult> {
  const { entry: tableEntry, ambiguous } = await fetchAgreementSalaryTable(
    companyId, agreementCode, professionalGroup, year, level
  );

  const result = resolveSalaryFromAgreement(
    salarioPactado, tableEntry, agreementCode, professionalGroup, year
  );

  // Propagate ambiguity flag
  if (ambiguous && !tableEntry) {
    result.trace.formula = 'Resolución ambigua: múltiples tablas salariales para el grupo profesional sin especificar nivel. Degradación a salario manual.';
  }

  return result;
}

// ── Agreement Concept Resolution (Phase 2A) ──

export interface ResolvedConceptForPayroll {
  sourceId: string;
  agreementConceptCode: string;
  agreementConceptName: string;
  erpConceptCode: string | null;
  unmapped: boolean;
  type: 'earning' | 'deduction';
  nature: string;
  amount: number;
  isPercentage: boolean;
  cotizaSS: boolean;
  tributaIRPF: boolean;
  embargable: boolean;
  orderIndex: number;
  isMandatory: boolean;
  source: 'company' | 'global';
}

/**
 * Resolves agreement-specific concepts for a given payroll context.
 * Uses useAgreementConceptMapping logic but as a standalone async function
 * for use in the resolver engine (non-React context).
 * 
 * Returns empty array if no concepts found → caller falls back to classic trio.
 */
export async function resolveAgreementConcepts(
  agreementId: string,
  companyId: string | null,
  professionalGroup: string | null,
  level: string | null,
  payrollDate: Date,
): Promise<ResolvedConceptForPayroll[]> {
  const dateStr = payrollDate.toISOString().slice(0, 10);

  let query = supabase
    .from('erp_hr_agreement_salary_concepts')
    .select('*')
    .eq('agreement_id', agreementId)
    .eq('is_active', true);

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  } else {
    query = query.is('company_id', null);
  }

  query = query.order('order_index', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('[resolveAgreementConcepts] query error:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Filter by date validity
  const validRows = (data as any[]).filter((r: any) => {
    if (r.effective_from && r.effective_from > dateStr) return false;
    if (r.effective_to && r.effective_to < dateStr) return false;
    return true;
  });

  // Filter by group/level applicability
  const applicableRows = validRows.filter((r: any) => {
    if (!r.professional_group) return true;
    if (professionalGroup && r.professional_group.trim().toLowerCase() === professionalGroup.trim().toLowerCase()) {
      if (r.level && level) {
        return r.level.trim().toLowerCase() === level.trim().toLowerCase();
      }
      if (!r.level) return true;
      return true;
    }
    return false;
  });

  // Score & deduplicate by concept_code
  const byCode = new Map<string, { row: any; specificity: number; source: 'company' | 'global' }>();
  for (const r of applicableRows) {
    let specificity = 1;
    if (r.professional_group) {
      specificity = 2;
      if (r.level && level && r.level.trim().toLowerCase() === level.trim().toLowerCase()) {
        specificity = 3;
      }
    }
    const source: 'company' | 'global' = r.company_id ? 'company' : 'global';
    const key = r.concept_code;
    const existing = byCode.get(key);
    if (!existing || compareConceptPriority({ source, specificity, row: r }, existing) > 0) {
      byCode.set(key, { row: r, specificity, source });
    }
  }

  // Build results
  const results: ResolvedConceptForPayroll[] = [];
  for (const { row, specificity, source } of byCode.values()) {
    const isPercentage = row.calculation_type === 'percentage';
    const amount = isPercentage ? (Number(row.percentage) || 0) : (Number(row.base_amount) || 0);

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
    });
  }

  results.sort((a, b) => a.orderIndex - b.orderIndex);
  return results;
}

function compareConceptPriority(
  a: { source: 'company' | 'global'; specificity: number; row: any },
  b: { source: 'company' | 'global'; specificity: number; row: any },
): number {
  if (a.source === 'company' && b.source === 'global') return 1;
  if (a.source === 'global' && b.source === 'company') return -1;
  if (a.specificity !== b.specificity) return a.specificity - b.specificity;
  const aFrom = a.row.effective_from || '0000-01-01';
  const bFrom = b.row.effective_from || '0000-01-01';
  if (aFrom !== bFrom) return aFrom > bFrom ? 1 : -1;
  return (b.row.order_index ?? 0) - (a.row.order_index ?? 0);
}
