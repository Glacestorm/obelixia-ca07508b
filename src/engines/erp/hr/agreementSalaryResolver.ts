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
  const tableEntry = await fetchAgreementSalaryTable(
    companyId, agreementCode, professionalGroup, year, level
  );

  return resolveSalaryFromAgreement(
    salarioPactado, tableEntry, agreementCode, professionalGroup, year
  );
}
