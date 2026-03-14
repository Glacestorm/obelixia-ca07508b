/**
 * usePayrollEngine — Motor global de nómina desacoplado
 * CRUD: períodos, líneas, conceptos, simulaciones, auditoría
 * Realtime en períodos y líneas
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  validatePreClose as validatePreCloseEngine,
  buildClosureSnapshot,
  canTransitionPeriod,
  isPeriodWritable,
  type PreCloseInput,
  type PeriodClosureSnapshot,
  type PayrollRunValidationSummary,
} from '@/engines/erp/hr/payrollRunEngine';

// ============ TYPES ============

export type PeriodStatus = 'draft' | 'open' | 'calculating' | 'calculated' | 'reviewing' | 'closing' | 'closed' | 'locked';
export type PeriodType = 'monthly' | 'biweekly' | 'weekly' | 'extra' | 'settlement';
export type PayrollLineType = 'earning' | 'deduction' | 'employer_cost' | 'informative';
export type PayrollLineCategory = 'fixed' | 'variable' | 'overtime' | 'bonus' | 'commission' | 'allowance' | 'flexible_remuneration' | 'advance' | 'regularization' | 'withholding' | 'social_contribution' | 'informative' | 'other';
export type PayrollLineSource = 'manual' | 'calculated' | 'imported' | 'rule_engine' | 'incident';
export type PayrollRecordStatus = 'draft' | 'calculated' | 'reviewing' | 'approved' | 'rejected' | 'paid' | 'cancelled';
export type SimulationType = 'what_if' | 'salary_change' | 'new_hire' | 'promotion';

export interface PayrollPeriod {
  id: string;
  company_id: string;
  legal_entity_id?: string | null;
  country_code: string;
  period_type: PeriodType;
  period_name: string;
  fiscal_year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  payment_date?: string | null;
  status: PeriodStatus;
  opened_at?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  locked_at?: string | null;
  employee_count: number;
  total_gross: number;
  total_net: number;
  total_employer_cost: number;
  validation_results: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  legal_entity_name?: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  company_id: string;
  payroll_period_id: string;
  country_code: string;
  contract_id?: string | null;
  gross_salary: number;
  net_salary: number;
  total_deductions: number;
  employer_cost: number;
  currency: string;
  calculation_details?: Record<string, unknown> | null;
  status: PayrollRecordStatus;
  validated_at?: string | null;
  validated_by?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  is_retroactive: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined
  employee_first_name?: string;
  employee_last_name?: string;
  department_name?: string;
}

export interface PayrollLine {
  id: string;
  payroll_record_id: string;
  concept_id?: string | null;
  concept_code: string;
  concept_name: string;
  line_type: PayrollLineType;
  category: PayrollLineCategory;
  base_amount?: number | null;
  percentage?: number | null;
  amount: number;
  units?: number | null;
  unit_price?: number | null;
  is_taxable: boolean;
  is_ss_contributable: boolean;
  is_percentage: boolean;
  percentage_base?: string | null;
  source: PayrollLineSource;
  incident_id?: string | null;
  sort_order: number;
  calculation_formula?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface PayrollConceptTemplate {
  id: string;
  company_id: string;
  code: string;
  name: string;
  line_type: PayrollLineType;
  category: PayrollLineCategory;
  default_amount?: number | null;
  is_percentage: boolean;
  default_percentage?: number | null;
  percentage_base?: string | null;
  taxable: boolean;
  contributable: boolean;
  country_code?: string | null;
  is_active: boolean;
  sort_order: number;
  legal_reference?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PayrollSimulation {
  id: string;
  company_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  simulation_type: SimulationType;
  input_params: Record<string, unknown>;
  result_lines: unknown[];
  result_summary: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  // Joined
  employee_name?: string;
}

export interface PayrollAuditEntry {
  id: string;
  company_id: string;
  payroll_id?: string | null;
  period_id?: string | null;
  action: string;
  actor_id?: string | null;
  actor_name: string;
  entity_type: string;
  entity_id?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PreCloseValidation {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface PayrollEngineFilters {
  status?: PeriodStatus | PayrollRecordStatus;
  search?: string;
  year?: number;
  legalEntityId?: string;
}

// ============ HOOK ============

export function usePayrollEngine(companyId?: string) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [concepts, setConcepts] = useState<PayrollConceptTemplate[]>([]);
  const [simulations, setSimulations] = useState<PayrollSimulation[]>([]);
  const [auditLog, setAuditLog] = useState<PayrollAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ---- PERIODS ----

  const fetchPeriods = useCallback(async (year?: number, legalEntityId?: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let q = supabase.from('hr_payroll_periods').select('*').eq('company_id', companyId).order('fiscal_year', { ascending: false }).order('period_number', { ascending: false });
      if (year) q = q.eq('fiscal_year', year);
      if (legalEntityId) q = q.eq('legal_entity_id', legalEntityId);
      const { data, error } = await q;
      if (error) throw error;
      setPeriods((data || []) as unknown as PayrollPeriod[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchPeriods:', e);
      toast.error('Error cargando períodos');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const openPeriod = useCallback(async (year: number, month: number, periodType: PeriodType = 'monthly', legalEntityId?: string) => {
    if (!companyId) return null;
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const { data, error } = await supabase.from('hr_payroll_periods').insert({
        company_id: companyId,
        legal_entity_id: legalEntityId || null,
        country_code: 'ES',
        period_type: periodType,
        period_name: `${String(month).padStart(2, '0')}/${year}`,
        fiscal_year: year,
        period_number: month,
        start_date: startDate,
        end_date: endDate,
        status: 'open',
        opened_at: new Date().toISOString(),
      } as any).select().single();
      if (error) throw error;
      await logAudit('created', 'period', data.id, null, data);
      toast.success(`Período ${month}/${year} abierto`);
      await fetchPeriods(year);
      return data as unknown as PayrollPeriod;
    } catch (e: any) {
      console.error('[usePayrollEngine] openPeriod:', e);
      toast.error(`Error abriendo período: ${e.message}`);
      return null;
    }
  }, [companyId]);

  const updatePeriodStatus = useCallback(async (periodId: string, newStatus: PeriodStatus) => {
    try {
      const old = periods.find(p => p.id === periodId);
      // Enforce state machine
      if (old && !canTransitionPeriod(old.status, newStatus)) {
        toast.error(`Transición no permitida: ${old.status} → ${newStatus}`);
        return;
      }
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'closed') { updates.closed_at = new Date().toISOString(); }
      if (newStatus === 'locked') { updates.locked_at = new Date().toISOString(); }
      if (newStatus === 'open') { updates.opened_at = new Date().toISOString(); }
      const { error } = await supabase.from('hr_payroll_periods').update(updates).eq('id', periodId);
      if (error) throw error;
      await logAudit('status_changed', 'period', periodId, { status: old?.status }, { status: newStatus });
      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, ...updates } : p));
      toast.success(`Período actualizado a ${newStatus}`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  }, [periods]);

  // ---- PAYROLL RECORDS ----

  const fetchRecords = useCallback(async (periodId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_payroll_records')
        .select(`*, erp_hr_employees!hr_payroll_records_employee_id_fkey(first_name, last_name, department_id, erp_hr_departments!erp_hr_employees_department_id_fkey(name))`)
        .eq('payroll_period_id', periodId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((r: any) => ({
        ...r,
        employee_first_name: r.erp_hr_employees?.first_name,
        employee_last_name: r.erp_hr_employees?.last_name,
        department_name: r.erp_hr_employees?.erp_hr_departments?.name,
      }));
      setRecords(mapped as PayrollRecord[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchRecords:', e);
      toast.error('Error cargando nóminas');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const updateRecordStatus = useCallback(async (recordId: string, newStatus: PayrollRecordStatus) => {
    try {
      const old = records.find(r => r.id === recordId);
      // Guard: check period is writable
      if (old) {
        const period = periods.find(p => p.id === old.payroll_period_id);
        if (period && !isPeriodWritable(period.status)) {
          toast.error(`El período está ${period.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se permiten cambios en nóminas`);
          return;
        }
      }
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'approved' || newStatus === 'reviewing') {
        const { data: { user } } = await supabase.auth.getUser();
        if (newStatus === 'approved') { updates.validated_at = new Date().toISOString(); updates.validated_by = user?.id; }
      }
      if (newStatus === 'paid') { updates.paid_at = new Date().toISOString(); }
      const { error } = await supabase.from('hr_payroll_records').update(updates).eq('id', recordId);
      if (error) throw error;
      await logAudit('status_changed', 'payroll', recordId, { status: old?.status }, { status: newStatus });
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
      toast.success(`Nómina actualizada a ${newStatus}`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  }, [records, periods]);

  // ---- LINES ----

  const fetchLines = useCallback(async (payrollRecordId: string) => {
    try {
      const { data, error } = await supabase
        .from('hr_payroll_record_lines')
        .select('*')
        .eq('payroll_record_id', payrollRecordId)
        .order('sort_order');
      if (error) throw error;
      setLines((data || []) as unknown as PayrollLine[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchLines:', e);
    }
  }, []);

  const addLine = useCallback(async (payrollRecordId: string, line: Partial<PayrollLine>) => {
    try {
      // Guard: check associated period is writable
      const record = records.find(r => r.id === payrollRecordId);
      if (record) {
        const period = periods.find(p => p.id === record.payroll_period_id);
        if (period && !isPeriodWritable(period.status)) {
          toast.error(`Período ${period.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden añadir líneas`);
          return null;
        }
      }
      const { data, error } = await supabase.from('hr_payroll_record_lines').insert({
        payroll_record_id: payrollRecordId,
        concept_code: line.concept_code || 'CUSTOM',
        concept_name: line.concept_name || 'Concepto',
        line_type: line.line_type || 'earning',
        amount: line.amount || 0,
        units: line.units || 1,
        is_taxable: line.is_taxable ?? true,
        is_ss_contributable: line.is_ss_contributable ?? true,
        sort_order: line.sort_order || 99,
        source: line.source || 'manual',
        category: line.category || 'fixed',
        metadata: line.metadata || {},
      } as any).select().single();
      if (error) throw error;
      await logAudit('line_added', 'line', data.id, null, data);
      setLines(prev => [...prev, data as unknown as PayrollLine]);
      toast.success('Línea añadida');
      return data;
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
      return null;
    }
  }, []);

  const updateLine = useCallback(async (lineId: string, updates: Partial<PayrollLine>) => {
    try {
      // Guard: find the record → period to check writability
      const old = lines.find(l => l.id === lineId);
      if (old) {
        const record = records.find(r => r.id === (old as any).payroll_record_id);
        if (record) {
          const period = periods.find(p => p.id === record.payroll_period_id);
          if (period && !isPeriodWritable(period.status)) {
            toast.error(`Período ${period.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden modificar líneas`);
            return;
          }
        }
      }
      const { error } = await supabase.from('hr_payroll_record_lines').update(updates as any).eq('id', lineId);
      if (error) throw error;
      await logAudit('line_modified', 'line', lineId, old, updates);
      setLines(prev => prev.map(l => l.id === lineId ? { ...l, ...updates } : l));
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  }, [lines, records, periods]);

  const deleteLine = useCallback(async (lineId: string) => {
    try {
      // Guard: find the record → period to check writability
      const line = lines.find(l => l.id === lineId);
      if (line) {
        const record = records.find(r => r.id === (line as any).payroll_record_id);
        if (record) {
          const period = periods.find(p => p.id === record.payroll_period_id);
          if (period && !isPeriodWritable(period.status)) {
            toast.error(`Período ${period.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden eliminar líneas`);
            return;
          }
        }
      }
      const { error } = await supabase.from('hr_payroll_record_lines').delete().eq('id', lineId);
      if (error) throw error;
      setLines(prev => prev.filter(l => l.id !== lineId));
      toast.success('Línea eliminada');
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  }, [lines, records, periods]);

  // ---- CONCEPT TEMPLATES ----

  const fetchConcepts = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('hr_payroll_concept_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');
      if (error) throw error;
      setConcepts((data || []) as unknown as PayrollConceptTemplate[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchConcepts:', e);
    }
  }, [companyId]);

  const upsertConcept = useCallback(async (concept: Partial<PayrollConceptTemplate>) => {
    if (!companyId) return null;
    try {
      const payload = { ...concept, company_id: companyId, updated_at: new Date().toISOString() };
      const { data, error } = concept.id
        ? await supabase.from('hr_payroll_concept_templates').update(payload as any).eq('id', concept.id).select().single()
        : await supabase.from('hr_payroll_concept_templates').insert(payload as any).select().single();
      if (error) throw error;
      toast.success(concept.id ? 'Concepto actualizado' : 'Concepto creado');
      await fetchConcepts();
      return data as unknown as PayrollConceptTemplate;
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
      return null;
    }
  }, [companyId, fetchConcepts]);

  // ---- SIMULATIONS ----

  const fetchSimulations = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('hr_payroll_simulations')
        .select('*, erp_hr_employees!hr_payroll_simulations_employee_id_fkey(first_name, last_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const mapped = (data || []).map((s: any) => ({
        ...s,
        employee_name: s.erp_hr_employees ? `${s.erp_hr_employees.first_name} ${s.erp_hr_employees.last_name}` : '',
      }));
      setSimulations(mapped as PayrollSimulation[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchSimulations:', e);
    }
  }, [companyId]);

  const createSimulation = useCallback(async (sim: Partial<PayrollSimulation>) => {
    if (!companyId) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('hr_payroll_simulations').insert({
        company_id: companyId,
        employee_id: sim.employee_id,
        period_year: sim.period_year || new Date().getFullYear(),
        period_month: sim.period_month || new Date().getMonth() + 1,
        simulation_type: sim.simulation_type || 'what_if',
        input_params: sim.input_params || {},
        result_lines: sim.result_lines || [],
        result_summary: sim.result_summary || {},
        created_by: user?.id,
      } as any).select().single();
      if (error) throw error;
      await logAudit('simulated', 'simulation', data.id, null, { type: sim.simulation_type });
      toast.success('Simulación creada');
      await fetchSimulations();
      return data as unknown as PayrollSimulation;
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
      return null;
    }
  }, [companyId, fetchSimulations]);

  // ---- AUDIT LOG ----

  const fetchAuditLog = useCallback(async (filters?: { periodId?: string; action?: string }) => {
    if (!companyId) return;
    try {
      let q = supabase.from('hr_payroll_audit_log').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
      if (filters?.periodId) q = q.eq('period_id', filters.periodId);
      if (filters?.action) q = q.eq('action', filters.action);
      const { data, error } = await q;
      if (error) throw error;
      setAuditLog((data || []) as unknown as PayrollAuditEntry[]);
    } catch (e: any) {
      console.error('[usePayrollEngine] fetchAuditLog:', e);
    }
  }, [companyId]);

  const logAudit = useCallback(async (action: string, entityType: string, entityId: string, oldValue?: unknown, newValue?: unknown) => {
    if (!companyId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('hr_payroll_audit_log').insert({
        company_id: companyId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: user?.id,
        actor_name: user?.email || '',
        old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        period_id: entityType === 'period' ? entityId : null,
        payroll_id: entityType === 'payroll' ? entityId : null,
      } as any);
    } catch (e) {
      console.error('[usePayrollEngine] logAudit:', e);
    }
  }, [companyId]);

  // ---- PRE-CLOSE VALIDATION (exhaustive, V2-ES.7 Paso 3) ----

  const validatePreClose = useCallback(async (periodId: string): Promise<PreCloseValidation[]> => {
    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) return [{ id: 'period_not_found', label: 'Período no encontrado', passed: false }];

      // Fetch runs for this period
      const { data: runsData } = await supabase
        .from('erp_hr_payroll_runs')
        .select('id, run_number, status, run_type, total_gross, total_net, total_employer_cost, total_employees, employees_errored, warnings_count, snapshot_hash, completed_at')
        .eq('period_id', periodId)
        .eq('company_id', companyId!);

      // Fetch records
      const { data: recsData } = await supabase
        .from('hr_payroll_records')
        .select('id, status, gross_salary, net_salary, employer_cost')
        .eq('payroll_period_id', periodId);

      // Fetch incidents
      const { data: incData } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .select('id, status')
        .eq('company_id', companyId!)
        .eq('period_id', periodId);

      const input: PreCloseInput = {
        period: { id: period.id, status: period.status, payment_date: period.payment_date },
        runs: (runsData || []) as any,
        records: (recsData || []) as any,
        incidents: (incData || []) as any,
      };

      const result = validatePreCloseEngine(input);

      // Save validation results to period
      await supabase.from('hr_payroll_periods').update({
        validation_results: result,
      } as any).eq('id', periodId);

      // Return as legacy PreCloseValidation[] for backward compat
      return result.checks.map(c => ({
        id: c.id,
        label: c.label,
        passed: c.passed,
        detail: c.detail,
        severity: c.severity,
      }));
    } catch (e) {
      console.error('[usePayrollEngine] validatePreClose:', e);
      return [{ id: 'error', label: 'Error en validación', passed: false, detail: String(e) }];
    }
  }, [companyId, periods]);

  // ---- CLOSE PERIOD (V2-ES.7 Paso 3) ----

  const closePeriod = useCallback(async (periodId: string): Promise<{ success: boolean; snapshot?: PeriodClosureSnapshot }> => {
    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) { toast.error('Período no encontrado'); return { success: false }; }

      if (!canTransitionPeriod(period.status, 'closing')) {
        toast.error(`No se puede cerrar desde estado "${period.status}"`);
        return { success: false };
      }

      // Run full validation
      const { data: runsData } = await supabase
        .from('erp_hr_payroll_runs')
        .select('id, run_number, status, run_type, total_gross, total_net, total_employer_cost, total_employees, employees_errored, warnings_count, snapshot_hash, completed_at')
        .eq('period_id', periodId)
        .eq('company_id', companyId!);

      const { data: recsData } = await supabase
        .from('hr_payroll_records')
        .select('id, status, gross_salary, net_salary, employer_cost')
        .eq('payroll_period_id', periodId);

      const { data: incData } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .select('id, status')
        .eq('company_id', companyId!)
        .eq('period_id', periodId);

      const input: PreCloseInput = {
        period: { id: period.id, status: period.status, payment_date: period.payment_date },
        runs: (runsData || []) as any,
        records: (recsData || []) as any,
        incidents: (incData || []) as any,
      };

      const validation = validatePreCloseEngine(input);

      // Block on errors
      if (validation.failed > 0) {
        toast.error(`Cierre bloqueado: ${validation.failed} check(s) con error`);
        return { success: false };
      }

      // Build closure snapshot
      const { data: { user } } = await supabase.auth.getUser();
      const snapshot = buildClosureSnapshot(input, validation, user?.id || '');

      // Get approved run totals
      const approvedRun = (runsData || [])
        .filter((r: any) => r.status === 'approved')
        .sort((a: any, b: any) => b.run_number - a.run_number)[0] as any;

      // Transition: current → closing → closed
      const now = new Date().toISOString();
      const updates: any = {
        status: 'closed',
        closed_at: now,
        closed_by: user?.id,
        validation_results: validation,
        metadata: { ...(period.metadata || {}), closure_snapshot: snapshot },
        updated_at: now,
      };

      // Consolidate totals from approved run
      if (approvedRun) {
        updates.total_gross = approvedRun.total_gross;
        updates.total_net = approvedRun.total_net;
        updates.total_employer_cost = approvedRun.total_employer_cost;
        updates.employee_count = approvedRun.total_employees;
      }

      const { error } = await supabase.from('hr_payroll_periods').update(updates).eq('id', periodId);
      if (error) throw error;

      await logAudit('period_closed', 'period', periodId,
        { status: period.status },
        { status: 'closed', closure_snapshot: snapshot }
      );

      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, ...updates } : p));
      toast.success('Período cerrado correctamente');
      return { success: true, snapshot };
    } catch (e: any) {
      console.error('[usePayrollEngine] closePeriod:', e);
      toast.error(`Error al cerrar período: ${e.message}`);
      return { success: false };
    }
  }, [companyId, periods, logAudit]);

  // ---- LOCK PERIOD (V2-ES.7 Paso 3) ----

  const lockPeriod = useCallback(async (periodId: string): Promise<boolean> => {
    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) { toast.error('Período no encontrado'); return false; }

      if (period.status !== 'closed') {
        toast.error('Solo se puede bloquear un período cerrado');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const updates: any = {
        status: 'locked',
        locked_at: now,
        metadata: {
          ...(period.metadata || {}),
          locked_by: user?.id,
        },
        updated_at: now,
      };

      const { error } = await supabase.from('hr_payroll_periods').update(updates).eq('id', periodId);
      if (error) throw error;

      await logAudit('period_locked', 'period', periodId,
        { status: 'closed' },
        { status: 'locked', locked_at: now, locked_by: user?.id }
      );

      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, ...updates } : p));
      toast.success('Período bloqueado — no se permiten más cambios');
      return true;
    } catch (e: any) {
      console.error('[usePayrollEngine] lockPeriod:', e);
      toast.error(`Error al bloquear: ${e.message}`);
      return false;
    }
  }, [periods, logAudit]);

  // ---- REOPEN PERIOD (V2-ES.7 Paso 3, controlled) ----

  const reopenPeriod = useCallback(async (periodId: string, reason: string): Promise<boolean> => {
    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) { toast.error('Período no encontrado'); return false; }

      if (period.status !== 'closed') {
        toast.error('Solo se puede reabrir un período cerrado (no bloqueado)');
        return false;
      }

      if (!reason || reason.trim().length < 5) {
        toast.error('Se requiere un motivo de reapertura (mínimo 5 caracteres)');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const updates: any = {
        status: 'reviewing',
        updated_at: now,
        metadata: {
          ...(period.metadata || {}),
          reopen_history: [
            ...((period.metadata as any)?.reopen_history || []),
            { reopened_at: now, reopened_by: user?.id, reason },
          ],
        },
      };

      const { error } = await supabase.from('hr_payroll_periods').update(updates).eq('id', periodId);
      if (error) throw error;

      await logAudit('period_reopened', 'period', periodId,
        { status: 'closed' },
        { status: 'reviewing', reason, reopened_by: user?.id }
      );

      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, ...updates } : p));
      toast.success('Período reabierto para revisión');
      return true;
    } catch (e: any) {
      console.error('[usePayrollEngine] reopenPeriod:', e);
      toast.error(`Error al reabrir: ${e.message}`);
      return false;
    }
  }, [periods, logAudit]);

  // ---- WRITE GUARD (V2-ES.7 Paso 3) ----

  const assertPeriodWritable = useCallback((periodId: string): boolean => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return false;
    if (!isPeriodWritable(period.status)) {
      toast.error(`El período está ${period.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se permiten cambios`);
      return false;
    }
    return true;
  }, [periods]);

  // ---- REALTIME ----

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('payroll-engine-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_payroll_periods' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPeriods(prev => [payload.new as unknown as PayrollPeriod, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPeriods(prev => prev.map(p => p.id === (payload.new as any).id ? { ...p, ...(payload.new as any) } : p));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return {
    // State
    periods, records, lines, concepts, simulations, auditLog, isLoading,
    // Periods
    fetchPeriods, openPeriod, updatePeriodStatus,
    // Period Close (V2-ES.7 Paso 3)
    closePeriod, lockPeriod, reopenPeriod, assertPeriodWritable,
    // Records
    fetchRecords, updateRecordStatus,
    // Lines
    fetchLines, addLine, updateLine, deleteLine,
    // Concepts
    fetchConcepts, upsertConcept,
    // Simulations
    fetchSimulations, createSimulation,
    // Audit
    fetchAuditLog, logAudit,
    // Validation
    validatePreClose,
  };
}
