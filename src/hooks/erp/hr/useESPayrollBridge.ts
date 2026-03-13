/**
 * useESPayrollBridge — Motor de nómina España
 * Calcula nóminas ES completas inyectando líneas al motor global
 * Conceptos: devengos, deducciones SS/IRPF, costes empresa, informativos
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useESLocalization, type ESEmployeeLaborData, type ESSSBase, type IRPFCalculationParams, type SSContributionResult, type IRPFResult } from './useESLocalization';

// ── Types ──

export interface ESPayrollConceptDef {
  code: string;
  name: string;
  line_type: 'earning' | 'deduction' | 'employer_cost' | 'informative';
  category: string;
  taxable: boolean;
  contributable: boolean;
  is_percentage: boolean;
  default_percentage?: number;
  percentage_base?: string;
  sort_order: number;
  legal_reference?: string;
}

export interface ESPayrollInput {
  employeeId: string;
  periodId: string;
  salarioBase: number;
  complementos?: Record<string, number>;
  horasExtra?: number;
  horasExtraImporte?: number;
  dietas?: number;
  comisiones?: number;
  bonus?: number;
  anticipos?: number;
  permisoNoRetribuido?: number; // días
  pagaExtra?: number;
  itCCDias?: number;
  itATDias?: number;
  seguroMedico?: number;
  ticketRestaurante?: number;
  chequeGuarderia?: number;
  stockOptions?: number;
  embargo?: number;
  pensionCompensatoria?: number;
  cuotaSindical?: number;
  regularizacion?: number;
}

export interface ESPayrollCalculation {
  lines: ESPayrollLine[];
  summary: ESPayrollSummary;
}

export interface ESCalculationTrace {
  rule: string;
  inputs: Record<string, unknown>;
  formula: string;
  timestamp: string;
}

export interface ESPayrollLine {
  concept_code: string;
  concept_name: string;
  line_type: 'earning' | 'deduction' | 'employer_cost' | 'informative';
  category: string;
  amount: number;
  base_amount?: number;
  percentage?: number;
  is_taxable: boolean;
  is_ss_contributable: boolean;
  is_percentage: boolean;
  percentage_base?: string;
  sort_order: number;
  source: string;
  incident_ref?: string;
  calculation_trace?: ESCalculationTrace;
}

export interface ESPayrollSummary {
  totalDevengos: number;
  totalDeducciones: number;
  liquidoPercibir: number;
  totalCosteEmpresa: number;
  baseCotizacionCC: number;
  baseCotizacionAT: number;
  baseIRPF: number;
  tipoIRPF: number;
  ssContributions: SSContributionResult;
  irpfResult: IRPFResult;
}

export interface ESPreCloseValidation {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ESReportData {
  type: 'tc1' | 'coste_empresa' | 'irpf_summary';
  periodName: string;
  rows: Array<Record<string, unknown>>;
  totals: Record<string, number>;
}

// ── ES Concept Catalog (static definitions) ──

const ES_CONCEPT_CATALOG: ESPayrollConceptDef[] = [
  // Devengos
  { code: 'ES_SAL_BASE', name: 'Salario base', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 10, legal_reference: 'ET Art. 26' },
  { code: 'ES_COMP_CONVENIO', name: 'Plus convenio', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 20 },
  { code: 'ES_COMP_ANTIGUEDAD', name: 'Complemento antigüedad', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 21 },
  { code: 'ES_COMP_PUESTO', name: 'Complemento de puesto', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 22 },
  { code: 'ES_COMP_NOCTURNIDAD', name: 'Plus nocturnidad', line_type: 'earning', category: 'variable', taxable: true, contributable: true, is_percentage: false, sort_order: 23 },
  { code: 'ES_COMP_TURNICIDAD', name: 'Plus turnicidad', line_type: 'earning', category: 'variable', taxable: true, contributable: true, is_percentage: false, sort_order: 24 },
  { code: 'ES_COMP_TOXICIDAD', name: 'Plus peligrosidad/toxicidad', line_type: 'earning', category: 'variable', taxable: true, contributable: true, is_percentage: false, sort_order: 25 },
  { code: 'ES_HORAS_EXTRA', name: 'Horas extraordinarias', line_type: 'earning', category: 'overtime', taxable: true, contributable: true, is_percentage: false, sort_order: 30, legal_reference: 'ET Art. 35' },
  { code: 'ES_HORAS_EXTRA_FEST', name: 'Horas extra festivas', line_type: 'earning', category: 'overtime', taxable: true, contributable: true, is_percentage: false, sort_order: 31 },
  { code: 'ES_HORAS_EXTRA_NOCT', name: 'Horas extra nocturnas', line_type: 'earning', category: 'overtime', taxable: true, contributable: true, is_percentage: false, sort_order: 32 },
  { code: 'ES_BONUS', name: 'Bonus / Gratificación', line_type: 'earning', category: 'bonus', taxable: true, contributable: true, is_percentage: false, sort_order: 40 },
  { code: 'ES_COMISION', name: 'Comisiones', line_type: 'earning', category: 'commission', taxable: true, contributable: true, is_percentage: false, sort_order: 41 },
  { code: 'ES_DIETAS', name: 'Dietas y gastos viaje', line_type: 'earning', category: 'allowance', taxable: false, contributable: false, is_percentage: false, sort_order: 50, legal_reference: 'RIRPF Art. 9' },
  { code: 'ES_PLUS_TRANSPORTE', name: 'Plus transporte', line_type: 'earning', category: 'allowance', taxable: false, contributable: false, is_percentage: false, sort_order: 51 },
  { code: 'ES_PAGA_EXTRA', name: 'Paga extraordinaria', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 60, legal_reference: 'ET Art. 31' },
  { code: 'ES_VACACIONES', name: 'Vacaciones retribuidas', line_type: 'earning', category: 'fixed', taxable: true, contributable: true, is_percentage: false, sort_order: 61 },
  { code: 'ES_RETRIB_FLEX_SEGURO', name: 'Seguro médico empresa', line_type: 'earning', category: 'flexible_remuneration', taxable: false, contributable: false, is_percentage: false, sort_order: 70, legal_reference: 'LIRPF Art. 42.3.c' },
  { code: 'ES_RETRIB_FLEX_GUARDERIA', name: 'Cheque guardería', line_type: 'earning', category: 'flexible_remuneration', taxable: false, contributable: false, is_percentage: false, sort_order: 71 },
  { code: 'ES_RETRIB_FLEX_FORMACION', name: 'Formación', line_type: 'earning', category: 'flexible_remuneration', taxable: false, contributable: false, is_percentage: false, sort_order: 72 },
  { code: 'ES_RETRIB_FLEX_RESTAURANTE', name: 'Ticket restaurante', line_type: 'earning', category: 'flexible_remuneration', taxable: false, contributable: false, is_percentage: false, sort_order: 73, legal_reference: 'RIRPF Art. 45.2' },
  { code: 'ES_STOCK_OPTIONS', name: 'Stock options', line_type: 'earning', category: 'variable', taxable: true, contributable: true, is_percentage: false, sort_order: 80 },
  { code: 'ES_IT_CC_EMPRESA', name: 'Complemento IT cont. común', line_type: 'earning', category: 'variable', taxable: true, contributable: false, is_percentage: false, sort_order: 90, legal_reference: 'ET Art. 45.1.c' },
  { code: 'ES_IT_AT_EMPRESA', name: 'Complemento IT acc. trabajo', line_type: 'earning', category: 'variable', taxable: true, contributable: false, is_percentage: false, sort_order: 91 },
  { code: 'ES_NACIMIENTO', name: 'Prestación nacimiento/cuidado', line_type: 'earning', category: 'variable', taxable: false, contributable: false, is_percentage: false, sort_order: 92, legal_reference: 'LGSS Art. 177-182' },
  { code: 'ES_REGULARIZACION', name: 'Regularización / atrasos', line_type: 'earning', category: 'regularization', taxable: true, contributable: true, is_percentage: false, sort_order: 95 },
  // Deducciones
  { code: 'ES_IRPF', name: 'Retención IRPF', line_type: 'deduction', category: 'withholding', taxable: false, contributable: false, is_percentage: true, percentage_base: 'base_irpf', sort_order: 100, legal_reference: 'LIRPF Art. 99-101' },
  { code: 'ES_SS_CC_TRAB', name: 'Cotización CC trabajador', line_type: 'deduction', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 4.70, percentage_base: 'base_cc', sort_order: 110, legal_reference: 'LGSS Art. 19' },
  { code: 'ES_SS_DESEMPLEO_TRAB', name: 'Cotización desempleo trabajador', line_type: 'deduction', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 1.55, percentage_base: 'base_cc', sort_order: 111 },
  { code: 'ES_SS_FP_TRAB', name: 'Formación profesional trabajador', line_type: 'deduction', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 0.10, percentage_base: 'base_cc', sort_order: 112 },
  { code: 'ES_ANTICIPO', name: 'Anticipo a descontar', line_type: 'deduction', category: 'advance', taxable: false, contributable: false, is_percentage: false, sort_order: 120 },
  { code: 'ES_EMBARGO', name: 'Embargo judicial', line_type: 'deduction', category: 'other', taxable: false, contributable: false, is_percentage: false, sort_order: 130 },
  { code: 'ES_PENSION_COMPENSATORIA', name: 'Pensión compensatoria', line_type: 'deduction', category: 'other', taxable: false, contributable: false, is_percentage: false, sort_order: 131 },
  { code: 'ES_CUOTA_SINDICAL', name: 'Cuota sindical', line_type: 'deduction', category: 'other', taxable: false, contributable: false, is_percentage: false, sort_order: 132 },
  { code: 'ES_PERMISO_NO_RETRIBUIDO', name: 'Desc. permiso no retribuido', line_type: 'deduction', category: 'variable', taxable: false, contributable: false, is_percentage: false, sort_order: 133 },
  // Costes empresa
  { code: 'ES_SS_CC_EMP', name: 'Cotización CC empresa', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 23.60, percentage_base: 'base_cc', sort_order: 200, legal_reference: 'LGSS Art. 19' },
  { code: 'ES_SS_DESEMPLEO_EMP', name: 'Desempleo empresa', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 5.50, percentage_base: 'base_cc', sort_order: 201 },
  { code: 'ES_SS_FOGASA', name: 'FOGASA', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 0.20, percentage_base: 'base_cc', sort_order: 202, legal_reference: 'ET Art. 33' },
  { code: 'ES_SS_FP_EMP', name: 'FP empresa', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 0.60, percentage_base: 'base_cc', sort_order: 203 },
  { code: 'ES_SS_MEI', name: 'MEI', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 0.58, percentage_base: 'base_cc', sort_order: 204, legal_reference: 'Ley 21/2021' },
  { code: 'ES_SS_AT_EP', name: 'AT/EP empresa', line_type: 'employer_cost', category: 'social_contribution', taxable: false, contributable: false, is_percentage: true, default_percentage: 1.50, percentage_base: 'base_at', sort_order: 205 },
  // Informativos
  { code: 'ES_BASE_CC', name: 'Base cotización CC', line_type: 'informative', category: 'informative', taxable: false, contributable: false, is_percentage: false, sort_order: 300 },
  { code: 'ES_BASE_AT', name: 'Base cotización AT/EP', line_type: 'informative', category: 'informative', taxable: false, contributable: false, is_percentage: false, sort_order: 301 },
  { code: 'ES_BASE_IRPF', name: 'Base sujeta a IRPF', line_type: 'informative', category: 'informative', taxable: false, contributable: false, is_percentage: false, sort_order: 302 },
  { code: 'ES_COSTE_EMPRESA_TOTAL', name: 'Coste total empresa', line_type: 'informative', category: 'informative', taxable: false, contributable: false, is_percentage: false, sort_order: 310 },
];

// ── Hook ──

export function useESPayrollBridge(companyId?: string) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<ESPayrollCalculation | null>(null);
  const [validations, setValidations] = useState<ESPreCloseValidation[]>([]);
  const [reportData, setReportData] = useState<ESReportData | null>(null);

  const esLoc = useESLocalization(companyId);

  /** Get the ES concept catalog */
  const getConceptCatalog = useCallback(() => ES_CONCEPT_CATALOG, []);

  /** Seed concept templates into DB for this company */
  const seedConceptTemplates = useCallback(async () => {
    if (!companyId) return;
    try {
      // Check if already seeded
      const { count } = await supabase
        .from('hr_payroll_concept_templates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('country_code', 'ES');
      
      if ((count ?? 0) >= 30) return; // already seeded

      const rows = ES_CONCEPT_CATALOG.map(c => ({
        company_id: companyId,
        code: c.code,
        name: c.name,
        line_type: c.line_type,
        category: c.category,
        taxable: c.taxable,
        contributable: c.contributable,
        is_percentage: c.is_percentage,
        default_percentage: c.default_percentage ?? null,
        percentage_base: c.percentage_base ?? null,
        sort_order: c.sort_order,
        legal_reference: c.legal_reference ?? null,
        country_code: 'ES',
        is_active: true,
        metadata: {},
      }));

      const { error } = await supabase.from('hr_payroll_concept_templates').insert(rows as any);
      if (error) throw error;
      toast.success('Catálogo de conceptos ES creado (44 conceptos)');
    } catch (err) {
      console.error('[useESPayrollBridge] seedConceptTemplates:', err);
      toast.error('Error al crear catálogo de conceptos ES');
    }
  }, [companyId]);

  /** Calculate a full ES payroll for one employee */
  const calculateESPayroll = useCallback(
    (
      input: ESPayrollInput,
      laborData: ESEmployeeLaborData,
      ssBase: ESSSBase,
      irpfTramos: Array<{ tramo_desde: number; tramo_hasta: number | null; tipo_total: number }>,
    ): ESPayrollCalculation => {
      const lines: ESPayrollLine[] = [];
      const r = (n: number) => Math.round(n * 100) / 100;
      const ts = new Date().toISOString();

      // ── 1. Devengos ──
      const addEarning = (code: string, name: string, amount: number, category: string, taxable: boolean, contributable: boolean, sortOrder: number, traceRule?: string, traceInputs?: Record<string, unknown>, traceFormula?: string) => {
        if (amount === 0) return;
        lines.push({
          concept_code: code, concept_name: name, line_type: 'earning', category,
          amount: r(amount), is_taxable: taxable, is_ss_contributable: contributable,
          is_percentage: false, sort_order: sortOrder, source: 'rule_engine',
          calculation_trace: {
            rule: traceRule || code,
            inputs: traceInputs || { amount },
            formula: traceFormula || `${name} = ${r(amount)}`,
            timestamp: ts,
          },
        });
      };

      addEarning('ES_SAL_BASE', 'Salario base', input.salarioBase, 'fixed', true, true, 10);
      
      // Complementos
      if (input.complementos) {
        Object.entries(input.complementos).forEach(([key, val], idx) => {
          const def = ES_CONCEPT_CATALOG.find(c => c.code === key);
          if (def && val > 0) {
            addEarning(key, def.name, val, def.category, def.taxable, def.contributable, def.sort_order);
          } else if (val > 0) {
            addEarning(`ES_COMP_${key}`, key, val, 'variable', true, true, 25 + idx);
          }
        });
      }

      if (input.horasExtraImporte) addEarning('ES_HORAS_EXTRA', 'Horas extraordinarias', input.horasExtraImporte, 'overtime', true, true, 30);
      if (input.bonus) addEarning('ES_BONUS', 'Bonus / Gratificación', input.bonus, 'bonus', true, true, 40);
      if (input.comisiones) addEarning('ES_COMISION', 'Comisiones', input.comisiones, 'commission', true, true, 41);
      if (input.dietas) addEarning('ES_DIETAS', 'Dietas y gastos viaje', input.dietas, 'allowance', false, false, 50);
      if (input.pagaExtra) addEarning('ES_PAGA_EXTRA', 'Paga extraordinaria', input.pagaExtra, 'fixed', true, true, 60);
      if (input.seguroMedico) addEarning('ES_RETRIB_FLEX_SEGURO', 'Seguro médico empresa', input.seguroMedico, 'flexible_remuneration', false, false, 70);
      if (input.ticketRestaurante) addEarning('ES_RETRIB_FLEX_RESTAURANTE', 'Ticket restaurante', input.ticketRestaurante, 'flexible_remuneration', false, false, 73);
      if (input.chequeGuarderia) addEarning('ES_RETRIB_FLEX_GUARDERIA', 'Cheque guardería', input.chequeGuarderia, 'flexible_remuneration', false, false, 71);
      if (input.stockOptions) addEarning('ES_STOCK_OPTIONS', 'Stock options', input.stockOptions, 'variable', true, true, 80);
      if (input.regularizacion) addEarning('ES_REGULARIZACION', 'Regularización / atrasos', input.regularizacion, 'regularization', true, true, 95);
      if (input.itCCDias && input.itCCDias > 0) {
        const complementoIT = r((input.salarioBase / 30) * input.itCCDias * 0.60);
        addEarning('ES_IT_CC_EMPRESA', 'Complemento IT cont. común', complementoIT, 'variable', true, false, 90,
          'IT_CC_complement', { salarioBase: input.salarioBase, dias: input.itCCDias, pct: 0.60 },
          `(${input.salarioBase}/30) × ${input.itCCDias} × 60% = ${complementoIT}`);
      }
      if (input.itATDias && input.itATDias > 0) {
        const complementoAT = r((input.salarioBase / 30) * input.itATDias * 0.75);
        addEarning('ES_IT_AT_EMPRESA', 'Complemento IT acc. trabajo', complementoAT, 'variable', true, false, 91,
          'IT_AT_complement', { salarioBase: input.salarioBase, dias: input.itATDias, pct: 0.75 },
          `(${input.salarioBase}/30) × ${input.itATDias} × 75% = ${complementoAT}`);
      }

      // ── 2. Calcular bases ──
      const totalDevengosContribuibles = lines
        .filter(l => l.line_type === 'earning' && l.is_ss_contributable)
        .reduce((s, l) => s + l.amount, 0);
      const totalDevengosImponibles = lines
        .filter(l => l.line_type === 'earning' && l.is_taxable)
        .reduce((s, l) => s + l.amount, 0);
      const totalDevengos = lines
        .filter(l => l.line_type === 'earning')
        .reduce((s, l) => s + l.amount, 0);

      // SS bases with caps
      const baseCotizacionCC = Math.max(ssBase.base_minima_mensual, Math.min(totalDevengosContribuibles, ssBase.base_maxima_mensual));
      const baseCotizacionAT = baseCotizacionCC + (input.horasExtraImporte || 0); // AT includes overtime on top

      // ── 3. SS contributions ──
      const isTemporary = laborData.tipo_contrato_rd ? ['402', '501', '502', '410'].includes(laborData.tipo_contrato_rd) : false;
      const ssResult = esLoc.calculateSSContributions(totalDevengosContribuibles, ssBase, isTemporary);

      // SS worker deductions (with trace)
      const ssTrace = (concept: string, pct: number, base: number, amount: number): ESCalculationTrace => ({
        rule: 'SS_contribution', inputs: { base, percentage: pct }, formula: `${concept}: ${base} × ${pct}% = ${amount}`, timestamp: ts,
      });
      lines.push({ concept_code: 'ES_SS_CC_TRAB', concept_name: 'Cotización CC trabajador', line_type: 'deduction', category: 'social_contribution', amount: r(ssResult.ccTrabajador), base_amount: baseCotizacionCC, percentage: ssBase.tipo_cc_trabajador, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 110, source: 'rule_engine', calculation_trace: ssTrace('CC_trab', ssBase.tipo_cc_trabajador, baseCotizacionCC, ssResult.ccTrabajador) });
      lines.push({ concept_code: 'ES_SS_DESEMPLEO_TRAB', concept_name: 'Cotización desempleo trabajador', line_type: 'deduction', category: 'social_contribution', amount: r(ssResult.desempleoTrabajador), base_amount: baseCotizacionCC, percentage: isTemporary ? ssBase.tipo_desempleo_trabajador_td : ssBase.tipo_desempleo_trabajador_gi, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 111, source: 'rule_engine', calculation_trace: ssTrace('Desempleo_trab', isTemporary ? ssBase.tipo_desempleo_trabajador_td : ssBase.tipo_desempleo_trabajador_gi, baseCotizacionCC, ssResult.desempleoTrabajador) });
      lines.push({ concept_code: 'ES_SS_FP_TRAB', concept_name: 'FP trabajador', line_type: 'deduction', category: 'social_contribution', amount: r(ssResult.fpTrabajador), base_amount: baseCotizacionCC, percentage: ssBase.tipo_fp_trabajador, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 112, source: 'rule_engine', calculation_trace: ssTrace('FP_trab', ssBase.tipo_fp_trabajador, baseCotizacionCC, ssResult.fpTrabajador) });

      // ── 4. IRPF ──
      const salarioBrutoAnual = totalDevengosImponibles * 12;
      const irpfParams: IRPFCalculationParams = {
        salarioBrutoAnual,
        situacionFamiliar: laborData.situacion_familiar_irpf || 1,
        hijosmenores25: laborData.hijos_menores_25 || 0,
        hijosMenores3: laborData.hijos_menores_3 || 0,
        ascendientesCargo: laborData.ascendientes_cargo || 0,
        discapacidadHijos: laborData.discapacidad_hijos || false,
        pensionCompensatoria: laborData.pension_compensatoria || 0,
        anualidadAlimentos: laborData.anualidad_alimentos || 0,
        reduccionMovilidad: laborData.reduccion_movilidad_geografica || false,
        prolongacionLaboral: laborData.prolongacion_laboral || false,
        contratoInferiorAnual: laborData.contrato_inferior_anual || false,
        ccaaCode: laborData.comunidad_autonoma || undefined,
      };
      const irpfResult = esLoc.calculateIRPFRetention(irpfParams, irpfTramos as any);
      const retencionIRPF = r(irpfResult.retencionMensual);
      const baseIRPF = totalDevengosImponibles - ssResult.totalTrabajador;

      lines.push({ concept_code: 'ES_IRPF', concept_name: 'Retención IRPF', line_type: 'deduction', category: 'withholding', amount: retencionIRPF, base_amount: r(baseIRPF), percentage: irpfResult.tipoEfectivo, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_irpf', sort_order: 100, source: 'rule_engine' });

      // Other deductions
      if (input.anticipos) lines.push({ concept_code: 'ES_ANTICIPO', concept_name: 'Anticipo a descontar', line_type: 'deduction', category: 'advance', amount: r(input.anticipos), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 120, source: 'manual' });
      if (input.embargo) lines.push({ concept_code: 'ES_EMBARGO', concept_name: 'Embargo judicial', line_type: 'deduction', category: 'other', amount: r(input.embargo), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 130, source: 'manual' });
      if (input.pensionCompensatoria) lines.push({ concept_code: 'ES_PENSION_COMPENSATORIA', concept_name: 'Pensión compensatoria', line_type: 'deduction', category: 'other', amount: r(input.pensionCompensatoria), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 131, source: 'manual' });
      if (input.cuotaSindical) lines.push({ concept_code: 'ES_CUOTA_SINDICAL', concept_name: 'Cuota sindical', line_type: 'deduction', category: 'other', amount: r(input.cuotaSindical), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 132, source: 'manual' });
      if (input.permisoNoRetribuido && input.permisoNoRetribuido > 0) {
        const descuento = r((input.salarioBase / 30) * input.permisoNoRetribuido);
        lines.push({ concept_code: 'ES_PERMISO_NO_RETRIBUIDO', concept_name: 'Desc. permiso no retribuido', line_type: 'deduction', category: 'variable', amount: descuento, is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 133, source: 'rule_engine' });
      }

      // ── 5. Employer costs ──
      lines.push({ concept_code: 'ES_SS_CC_EMP', concept_name: 'Cotización CC empresa', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.ccEmpresa), base_amount: baseCotizacionCC, percentage: ssBase.tipo_cc_empresa, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 200, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_SS_DESEMPLEO_EMP', concept_name: 'Desempleo empresa', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.desempleoEmpresa), base_amount: baseCotizacionCC, percentage: isTemporary ? ssBase.tipo_desempleo_empresa_td : ssBase.tipo_desempleo_empresa_gi, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 201, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_SS_FOGASA', concept_name: 'FOGASA', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.fogasa), base_amount: baseCotizacionCC, percentage: ssBase.tipo_fogasa, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 202, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_SS_FP_EMP', concept_name: 'FP empresa', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.fpEmpresa), base_amount: baseCotizacionCC, percentage: ssBase.tipo_fp_empresa, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 203, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_SS_MEI', concept_name: 'MEI', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.mei), base_amount: baseCotizacionCC, percentage: ssBase.tipo_mei, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_cc', sort_order: 204, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_SS_AT_EP', concept_name: 'AT/EP empresa', line_type: 'employer_cost', category: 'social_contribution', amount: r(ssResult.atEmpresa), base_amount: r(baseCotizacionAT), percentage: ssBase.tipo_at_empresa || 1.50, is_taxable: false, is_ss_contributable: false, is_percentage: true, percentage_base: 'base_at', sort_order: 205, source: 'rule_engine' });

      // ── 6. Informative lines ──
      const totalDeducciones = lines.filter(l => l.line_type === 'deduction').reduce((s, l) => s + l.amount, 0);
      const totalCosteEmpresa = lines.filter(l => l.line_type === 'employer_cost').reduce((s, l) => s + l.amount, 0);
      const liquidoPercibir = r(totalDevengos - totalDeducciones);

      lines.push({ concept_code: 'ES_BASE_CC', concept_name: 'Base cotización CC', line_type: 'informative', category: 'informative', amount: r(baseCotizacionCC), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 300, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_BASE_AT', concept_name: 'Base cotización AT/EP', line_type: 'informative', category: 'informative', amount: r(baseCotizacionAT), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 301, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_BASE_IRPF', concept_name: 'Base sujeta a IRPF', line_type: 'informative', category: 'informative', amount: r(baseIRPF), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 302, source: 'rule_engine' });
      lines.push({ concept_code: 'ES_COSTE_EMPRESA_TOTAL', concept_name: 'Coste total empresa', line_type: 'informative', category: 'informative', amount: r(totalDevengos + totalCosteEmpresa), is_taxable: false, is_ss_contributable: false, is_percentage: false, sort_order: 310, source: 'rule_engine' });

      const summary: ESPayrollSummary = {
        totalDevengos: r(totalDevengos),
        totalDeducciones: r(totalDeducciones),
        liquidoPercibir,
        totalCosteEmpresa: r(totalCosteEmpresa),
        baseCotizacionCC: r(baseCotizacionCC),
        baseCotizacionAT: r(baseCotizacionAT),
        baseIRPF: r(baseIRPF),
        tipoIRPF: irpfResult.tipoEfectivo,
        ssContributions: ssResult,
        irpfResult,
      };

      const calculation = { lines, summary };
      setLastCalculation(calculation);
      return calculation;
    },
    [esLoc],
  );

  /** Simulate an ES payroll without persisting */
  const simulateES = useCallback((params: {
    salarioBase: number;
    grupoCotizacion: number;
    situacionFamiliar?: number;
    hijosmenores25?: number;
    hijosMenores3?: number;
    ascendientesCargo?: number;
    complementos?: Record<string, number>;
    horasExtraImporte?: number;
    pagaExtra?: number;
    isTemporary?: boolean;
  }): ESPayrollCalculation | null => {
    if (esLoc.ssBases.length === 0) {
      toast.error('Cargue primero las bases SS del año actual');
      return null;
    }
    const ssBase = esLoc.ssBases.find(b => b.grupo_cotizacion === params.grupoCotizacion) || esLoc.ssBases[0];
    const mockLaborData: ESEmployeeLaborData = {
      id: '', employee_id: '', company_id: '', naf: null, grupo_cotizacion: params.grupoCotizacion,
      cno_code: null, convenio_colectivo_id: null,
      tipo_contrato_rd: params.isTemporary ? '402' : '100',
      comunidad_autonoma: null, provincia: null, regimen_ss: 'general',
      categoria_profesional: null, coeficiente_parcialidad: 1,
      fecha_alta_ss: null, fecha_baja_ss: null, codigo_contrato_red: null, epigrafe_at: null,
      situacion_familiar_irpf: params.situacionFamiliar || 1,
      hijos_menores_25: params.hijosmenores25 || 0,
      hijos_menores_3: params.hijosMenores3 || 0,
      discapacidad_hijos: false, ascendientes_cargo: params.ascendientesCargo || 0,
      reduccion_movilidad_geografica: false, pension_compensatoria: 0, anualidad_alimentos: 0,
      prolongacion_laboral: false, contrato_inferior_anual: false,
      metadata: {}, created_at: '', updated_at: '',
    };
    const input: ESPayrollInput = {
      employeeId: '', periodId: '',
      salarioBase: params.salarioBase,
      complementos: params.complementos,
      horasExtraImporte: params.horasExtraImporte,
      pagaExtra: params.pagaExtra,
    };
    return calculateESPayroll(input, mockLaborData, ssBase, esLoc.irpfTables);
  }, [esLoc.ssBases, esLoc.irpfTables, calculateESPayroll]);

  /** Validate ES-specific pre-close checks */
  const validateESPreClose = useCallback(async (periodId: string): Promise<ESPreCloseValidation[]> => {
    if (!companyId) return [];
    setIsCalculating(true);
    try {
      const checks: ESPreCloseValidation[] = [];
      // Fetch records for the period
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id, gross_salary, net_salary, total_deductions, status')
        .eq('payroll_period_id', periodId);

      const recordCount = records?.length || 0;
      checks.push({
        id: 'records_exist', label: 'Nóminas generadas', passed: recordCount > 0,
        detail: `${recordCount} nóminas en el período`, severity: recordCount > 0 ? 'info' : 'error',
      });

      // Check all records are calculated
      const uncalculated = records?.filter(r => r.status === 'draft') || [];
      checks.push({
        id: 'all_calculated', label: 'Todas las nóminas calculadas', passed: uncalculated.length === 0,
        detail: uncalculated.length > 0 ? `${uncalculated.length} nóminas sin calcular` : 'OK', severity: uncalculated.length > 0 ? 'error' : 'info',
      });

      // Check for zero net salary
      const zeroNet = records?.filter(r => r.net_salary <= 0) || [];
      checks.push({
        id: 'no_zero_net', label: 'Sin líquidos negativos o cero', passed: zeroNet.length === 0,
        detail: zeroNet.length > 0 ? `${zeroNet.length} nóminas con líquido ≤ 0` : 'OK', severity: zeroNet.length > 0 ? 'warning' : 'info',
      });

      // Check labor data exists for all employees
      if (records && records.length > 0) {
        const employeeIds = records.map(r => r.employee_id);
        const { data: laborDataList } = await supabase
          .from('hr_es_employee_labor_data')
          .select('employee_id, grupo_cotizacion, situacion_familiar_irpf')
          .in('employee_id', employeeIds);
        
        const withoutLaborData = employeeIds.filter(id => !laborDataList?.find(ld => ld.employee_id === id));
        checks.push({
          id: 'labor_data_complete', label: 'Datos laborales ES completos', passed: withoutLaborData.length === 0,
          detail: withoutLaborData.length > 0 ? `${withoutLaborData.length} empleados sin datos ES` : 'OK', severity: withoutLaborData.length > 0 ? 'error' : 'info',
        });

        const withoutGrupo = laborDataList?.filter(ld => !ld.grupo_cotizacion) || [];
        checks.push({
          id: 'grupo_cotizacion', label: 'Grupo cotización asignado', passed: withoutGrupo.length === 0,
          detail: withoutGrupo.length > 0 ? `${withoutGrupo.length} sin grupo cotización` : 'OK', severity: withoutGrupo.length > 0 ? 'error' : 'info',
        });
      }

      // Check lines exist for records
      if (records && records.length > 0) {
        const { data: linesSample } = await supabase
          .from('hr_payroll_record_lines')
          .select('payroll_record_id, concept_code')
          .in('payroll_record_id', records.map(r => r.id))
          .eq('concept_code', 'ES_IRPF');
        
        const withoutIRPF = records.filter(r => !linesSample?.find(l => l.payroll_record_id === r.id));
        checks.push({
          id: 'irpf_calculated', label: 'IRPF calculado para todos', passed: withoutIRPF.length === 0,
          detail: withoutIRPF.length > 0 ? `${withoutIRPF.length} sin línea IRPF` : 'OK', severity: withoutIRPF.length > 0 ? 'warning' : 'info',
        });

        const { data: ssLines } = await supabase
          .from('hr_payroll_record_lines')
          .select('payroll_record_id')
          .in('payroll_record_id', records.map(r => r.id))
          .eq('concept_code', 'ES_SS_CC_TRAB');
        
        const withoutSS = records.filter(r => !ssLines?.find(l => l.payroll_record_id === r.id));
        checks.push({
          id: 'ss_calculated', label: 'SS trabajador calculada', passed: withoutSS.length === 0,
          detail: withoutSS.length > 0 ? `${withoutSS.length} sin cotización SS` : 'OK', severity: withoutSS.length > 0 ? 'error' : 'info',
        });
      }

      setValidations(checks);
      return checks;
    } catch (err) {
      console.error('[useESPayrollBridge] validateESPreClose:', err);
      toast.error('Error en validación pre-cierre');
      return [];
    } finally {
      setIsCalculating(false);
    }
  }, [companyId]);

  /** Generate ES reporting data */
  const generateESReport = useCallback(async (periodId: string, type: 'tc1' | 'coste_empresa' | 'irpf_summary'): Promise<ESReportData | null> => {
    if (!companyId) return null;
    try {
      const { data: period } = await supabase
        .from('hr_payroll_periods')
        .select('period_name')
        .eq('id', periodId)
        .single();

      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id, gross_salary, net_salary, total_deductions, employer_cost')
        .eq('payroll_period_id', periodId);

      if (!records || records.length === 0) {
        toast.error('Sin nóminas para generar informe');
        return null;
      }

      const recordIds = records.map(r => r.id);
      const { data: allLines } = await supabase
        .from('hr_payroll_record_lines')
        .select('*')
        .in('payroll_record_id', recordIds);

      const lines = (allLines || []) as Array<{ concept_code: string; amount: number; line_type: string; payroll_record_id: string }>;

      const sumByCode = (code: string) => lines.filter(l => l.concept_code === code).reduce((s, l) => s + l.amount, 0);
      const r2 = (n: number) => Math.round(n * 100) / 100;

      let report: ESReportData;

      if (type === 'tc1') {
        report = {
          type: 'tc1',
          periodName: period?.period_name || '',
          rows: [
            { concepto: 'Contingencias Comunes empresa', importe: r2(sumByCode('ES_SS_CC_EMP')) },
            { concepto: 'Contingencias Comunes trabajador', importe: r2(sumByCode('ES_SS_CC_TRAB')) },
            { concepto: 'Desempleo empresa', importe: r2(sumByCode('ES_SS_DESEMPLEO_EMP')) },
            { concepto: 'Desempleo trabajador', importe: r2(sumByCode('ES_SS_DESEMPLEO_TRAB')) },
            { concepto: 'FOGASA', importe: r2(sumByCode('ES_SS_FOGASA')) },
            { concepto: 'FP empresa', importe: r2(sumByCode('ES_SS_FP_EMP')) },
            { concepto: 'FP trabajador', importe: r2(sumByCode('ES_SS_FP_TRAB')) },
            { concepto: 'MEI', importe: r2(sumByCode('ES_SS_MEI')) },
            { concepto: 'AT/EP empresa', importe: r2(sumByCode('ES_SS_AT_EP')) },
          ],
          totals: {
            totalEmpresa: r2(sumByCode('ES_SS_CC_EMP') + sumByCode('ES_SS_DESEMPLEO_EMP') + sumByCode('ES_SS_FOGASA') + sumByCode('ES_SS_FP_EMP') + sumByCode('ES_SS_MEI') + sumByCode('ES_SS_AT_EP')),
            totalTrabajador: r2(sumByCode('ES_SS_CC_TRAB') + sumByCode('ES_SS_DESEMPLEO_TRAB') + sumByCode('ES_SS_FP_TRAB')),
            totalLiquidacion: r2(sumByCode('ES_SS_CC_EMP') + sumByCode('ES_SS_CC_TRAB') + sumByCode('ES_SS_DESEMPLEO_EMP') + sumByCode('ES_SS_DESEMPLEO_TRAB') + sumByCode('ES_SS_FOGASA') + sumByCode('ES_SS_FP_EMP') + sumByCode('ES_SS_FP_TRAB') + sumByCode('ES_SS_MEI') + sumByCode('ES_SS_AT_EP')),
          },
        };
      } else if (type === 'coste_empresa') {
        const totalBruto = records.reduce((s, r) => s + r.gross_salary, 0);
        const totalSS = r2(sumByCode('ES_SS_CC_EMP') + sumByCode('ES_SS_DESEMPLEO_EMP') + sumByCode('ES_SS_FOGASA') + sumByCode('ES_SS_FP_EMP') + sumByCode('ES_SS_MEI') + sumByCode('ES_SS_AT_EP'));
        report = {
          type: 'coste_empresa',
          periodName: period?.period_name || '',
          rows: [
            { concepto: 'Total salario bruto', importe: r2(totalBruto) },
            { concepto: 'SS empresa', importe: totalSS },
            { concepto: 'Coste total empresa', importe: r2(totalBruto + totalSS) },
          ],
          totals: { totalBruto: r2(totalBruto), totalSS, costeTotal: r2(totalBruto + totalSS), numEmpleados: records.length },
        };
      } else {
        // irpf_summary
        const totalIRPF = r2(sumByCode('ES_IRPF'));
        const totalBaseIRPF = r2(sumByCode('ES_BASE_IRPF'));
        report = {
          type: 'irpf_summary',
          periodName: period?.period_name || '',
          rows: [
            { concepto: 'Total base IRPF', importe: totalBaseIRPF },
            { concepto: 'Total retención IRPF', importe: totalIRPF },
            { concepto: 'Tipo medio retención', importe: totalBaseIRPF > 0 ? r2((totalIRPF / totalBaseIRPF) * 100) : 0 },
          ],
          totals: { totalBaseIRPF, totalIRPF, numEmpleados: records.length },
        };
      }

      setReportData(report);
      return report;
    } catch (err) {
      console.error('[useESPayrollBridge] generateESReport:', err);
      toast.error('Error generando informe');
      return null;
    }
  }, [companyId]);

  // ── V2-ES.1 Paso 2: Cálculo masivo por período ──
  const calculateBatch = useCallback(async (periodId: string): Promise<{ calculated: number; errors: number; details: Array<{ employeeId: string; success: boolean; error?: string }> } | null> => {
    if (!companyId) return null;
    setIsCalculating(true);
    const results: Array<{ employeeId: string; success: boolean; error?: string }> = [];

    try {
      // 1. Get period info
      const { data: period } = await supabase.from('hr_payroll_periods').select('*').eq('id', periodId).single();
      if (!period) throw new Error('Período no encontrado');

      // 2. Get active employees with contracts
      const { data: employees } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (!employees || employees.length === 0) {
        toast.error('No hay empleados activos');
        return null;
      }

      // 2b. Idempotency guard: fetch existing records for this period
      const { data: existingRecords } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id')
        .eq('payroll_period_id', periodId);
      const existingByEmployee = new Map<string, string>();
      (existingRecords || []).forEach((r: any) => existingByEmployee.set(r.employee_id, r.id));

      // 3. Get labor data for all employees
      const employeeIds = employees.map(e => e.id);
      const { data: laborDataList } = await supabase
        .from('hr_es_employee_labor_data')
        .select('*')
        .in('employee_id', employeeIds);

      // 4. Get flexible remuneration plans
      const currentYear = (period as any).fiscal_year || new Date().getFullYear();
      const { data: flexPlans } = await supabase
        .from('hr_es_flexible_remuneration_plans')
        .select('*')
        .eq('company_id', companyId)
        .eq('plan_year', currentYear)
        .eq('status', 'active');

      // 5. Get contracts for salary data
      const { data: contracts } = await (supabase
        .from('erp_hr_contracts')
        .select('*')
        .in('employee_id', employeeIds) as any)
        .eq('status', 'active');

      // 6. Ensure SS bases and IRPF tables are loaded
      if (esLoc.ssBases.length === 0) {
        await esLoc.fetchSSBases(currentYear);
      }
      if (esLoc.irpfTables.length === 0) {
        await esLoc.fetchIRPFTables(currentYear);
      }

      // 7. Calculate for each employee
      for (const emp of employees) {
        try {
          const laborData = (laborDataList || []).find((ld: any) => ld.employee_id === emp.id);
          if (!laborData) {
            results.push({ employeeId: emp.id, success: false, error: 'Sin datos laborales ES' });
            continue;
          }

          const contract = (contracts || []).find((c: any) => c.employee_id === emp.id);
          const grupoCotizacion = (laborData as any).grupo_cotizacion || 1;
          const ssBase = esLoc.ssBases.find(b => b.grupo_cotizacion === grupoCotizacion) || esLoc.ssBases[0];
          if (!ssBase) {
            results.push({ employeeId: emp.id, success: false, error: 'Sin base SS para grupo' });
            continue;
          }

          const salarioBase = contract ? Number((contract as any).base_salary || 0) : 0;
          if (salarioBase <= 0) {
            results.push({ employeeId: emp.id, success: false, error: 'Salario base = 0' });
            continue;
          }

          // Build flex remuneration from plan
          const flexPlan = (flexPlans || []).find((fp: any) => fp.employee_id === emp.id);

          const input: ESPayrollInput = {
            employeeId: emp.id,
            periodId,
            salarioBase,
            seguroMedico: flexPlan ? Number((flexPlan as any).seguro_medico_mensual || 0) : 0,
            ticketRestaurante: flexPlan ? Number((flexPlan as any).ticket_restaurante_mensual || 0) : 0,
            chequeGuarderia: flexPlan ? Number((flexPlan as any).cheque_guarderia_mensual || 0) : 0,
          };

          const calculation = calculateESPayroll(input, laborData as any, ssBase, esLoc.irpfTables);

          // 8. Persist: create record
          const totalDevengos = calculation.summary.totalDevengos;
          const totalDeducciones = calculation.summary.totalDeducciones;
          const netSalary = calculation.summary.liquidoPercibir;
          const employerCost = calculation.summary.totalCosteEmpresa;

          const { data: record, error: recError } = await supabase.from('hr_payroll_records').insert({
            company_id: companyId,
            employee_id: emp.id,
            payroll_period_id: periodId,
            country_code: 'ES',
            contract_id: contract ? (contract as any).id : null,
            gross_salary: totalDevengos,
            net_salary: netSalary,
            total_deductions: totalDeducciones,
            employer_cost: employerCost,
            status: 'calculated',
            review_status: 'pending',
            calculation_details: calculation.summary as any,
          } as any).select().single();

          if (recError) throw recError;

          // 9. Persist: create lines
          const lineRows = calculation.lines.map((line, idx) => ({
            payroll_record_id: (record as any).id,
            concept_code: line.concept_code,
            concept_name: line.concept_name,
            line_type: line.line_type,
            category: line.category,
            amount: line.amount,
            base_amount: line.base_amount || null,
            percentage: line.percentage || null,
            is_taxable: line.is_taxable,
            is_ss_contributable: line.is_ss_contributable,
            is_percentage: line.is_percentage,
            percentage_base: line.percentage_base || null,
            sort_order: line.sort_order || idx,
            source: line.source || 'rule_engine',
            incident_ref: line.incident_ref || null,
            calculation_trace: line.calculation_trace || {},
            metadata: {},
          }));

          const { error: linesError } = await supabase.from('hr_payroll_record_lines').insert(lineRows as any);
          if (linesError) throw linesError;

          results.push({ employeeId: emp.id, success: true });
        } catch (empErr) {
          results.push({ employeeId: emp.id, success: false, error: empErr instanceof Error ? empErr.message : 'Error' });
        }
      }

      const calculated = results.filter(r => r.success).length;
      const errors = results.filter(r => !r.success).length;

      if (calculated > 0) {
        toast.success(`${calculated} nóminas calculadas${errors > 0 ? `, ${errors} errores` : ''}`);
      } else {
        toast.error(`Ninguna nómina calculada. ${errors} errores.`);
      }

      return { calculated, errors, details: results };
    } catch (err) {
      console.error('[useESPayrollBridge] calculateBatch:', err);
      toast.error('Error en cálculo masivo');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [companyId, esLoc, calculateESPayroll]);

  // ── V2-ES.1 Paso 2: Inyectar incidencias al período ──
  const injectIncidentsToPayroll = useCallback(async (periodId: string): Promise<{ injected: number; skipped: number } | null> => {
    if (!companyId) return null;
    setIsCalculating(true);

    try {
      // 1. Get period date range
      const { data: period } = await supabase.from('hr_payroll_periods').select('start_date, end_date').eq('id', periodId).single();
      if (!period) throw new Error('Período no encontrado');

      // 2. Find leave incidents that overlap the period
      const { data: incidents } = await supabase
        .from('hr_leave_incidents')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['approved', 'active'])
        .or(`start_date.lte.${(period as any).end_date},end_date.gte.${(period as any).start_date}`);

      if (!incidents || incidents.length === 0) {
        toast.info('No hay incidencias activas en este período');
        return { injected: 0, skipped: 0 };
      }

      // 3. Get existing records for the period
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id')
        .eq('payroll_period_id', periodId);

      if (!records || records.length === 0) {
        toast.error('No hay nóminas en el período. Calcule primero.');
        return null;
      }

      let injected = 0;
      let skipped = 0;

      for (const incident of incidents) {
        const inc = incident as any;
        const record = records.find((r: any) => r.employee_id === inc.employee_id);
        if (!record) { skipped++; continue; }

        // Calculate days in period
        const incStart = new Date(Math.max(new Date(inc.start_date).getTime(), new Date((period as any).start_date).getTime()));
        const incEnd = new Date(Math.min(
          inc.end_date ? new Date(inc.end_date).getTime() : new Date((period as any).end_date).getTime(),
          new Date((period as any).end_date).getTime()
        ));
        const diasIT = Math.max(1, Math.ceil((incEnd.getTime() - incStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // Check if already injected
        const { data: existing } = await supabase
          .from('hr_payroll_record_lines')
          .select('id')
          .eq('payroll_record_id', (record as any).id)
          .eq('incident_ref', `IT-${inc.id.slice(0, 8)}`);

        if (existing && existing.length > 0) { skipped++; continue; }

        // Determine IT type
        const isAT = inc.incident_type === 'work_accident' || inc.leave_type === 'work_accident';
        const conceptCode = isAT ? 'ES_IT_AT_EMPRESA' : 'ES_IT_CC_EMPRESA';
        const conceptName = isAT ? 'Complemento IT acc. trabajo' : 'Complemento IT cont. común';
        const pct = isAT ? 0.75 : 0.60;

        // Get base salary from record
        const { data: recDetail } = await supabase.from('hr_payroll_records').select('gross_salary').eq('id', (record as any).id).single();
        const salarioBase = recDetail ? Number((recDetail as any).gross_salary || 0) : 0;
        const dailySalary = salarioBase / 30;
        const amount = Math.round(dailySalary * diasIT * pct * 100) / 100;

        const incidentRef = `IT-${inc.id.slice(0, 8)}`;

        await supabase.from('hr_payroll_record_lines').insert({
          payroll_record_id: (record as any).id,
          concept_code: conceptCode,
          concept_name: conceptName,
          line_type: 'earning',
          category: 'variable',
          amount,
          is_taxable: true,
          is_ss_contributable: false,
          is_percentage: false,
          sort_order: isAT ? 91 : 90,
          source: 'incident',
          incident_ref: incidentRef,
          incident_id: inc.id,
          calculation_trace: {
            rule: isAT ? 'IT_AT_incident_injection' : 'IT_CC_incident_injection',
            inputs: { incidentId: inc.id, diasIT, pct, dailySalary },
            formula: `(${salarioBase}/30) × ${diasIT} días × ${pct * 100}% = ${amount}`,
            timestamp: new Date().toISOString(),
          },
          metadata: { incident_type: inc.incident_type, leave_type: inc.leave_type },
        } as any);

        injected++;
      }

      if (injected > 0) {
        toast.success(`${injected} incidencias inyectadas${skipped > 0 ? `, ${skipped} omitidas` : ''}`);
      } else {
        toast.info(`Sin incidencias nuevas para inyectar (${skipped} ya existentes)`);
      }

      return { injected, skipped };
    } catch (err) {
      console.error('[useESPayrollBridge] injectIncidentsToPayroll:', err);
      toast.error('Error inyectando incidencias');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [companyId]);

  return {
    // State
    isCalculating,
    lastCalculation,
    validations,
    reportData,
    // Catalog
    getConceptCatalog,
    seedConceptTemplates,
    // Calculation
    calculateESPayroll,
    simulateES,
    // V2-ES.1: Batch & incidents
    calculateBatch,
    injectIncidentsToPayroll,
    // Validation
    validateESPreClose,
    // Reporting
    generateESReport,
    // Re-export ES localization for convenience
    esLocalization: esLoc,
  };
}
