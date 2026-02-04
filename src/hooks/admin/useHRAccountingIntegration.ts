/**
 * Hook para integración RRHH ↔ Contabilidad
 * Genera asientos contables automáticos desde nóminas, finiquitos y SS
 * Cumplimiento: PGC 2007 (Grupo 64), LGT, LGSS
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface AccountingMapping {
  id: string;
  company_id: string | null;
  concept_code: string;
  concept_name: string;
  account_code: string;
  account_name: string;
  debit_credit: 'D' | 'C';
  category: string;
  jurisdiction: string;
  is_active: boolean;
}

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  concept: string;
  description?: string;
}

export interface HRJournalEntry {
  id: string;
  company_id: string;
  source_type: 'payroll' | 'settlement' | 'ss_contribution' | 'irpf_payment' | 'ss_payment' | 'salary_payment';
  source_id: string;
  source_reference: string | null;
  journal_entry_id: string | null;
  entry_date: string;
  description: string | null;
  total_debit: number;
  total_credit: number;
  auto_generated: boolean;
  generation_status: 'pending' | 'generated' | 'posted' | 'reversed' | 'failed';
  validation_status: 'pending' | 'validated' | 'rejected';
  entry_lines: JournalEntryLine[];
  created_at: string;
}

export interface PayrollAccountingData {
  grossSalary: number;
  ssEmployee: number;
  irpfRetention: number;
  ssCompany: number;
  otherDeductions?: number;
  employeeName?: string;
  period?: string;
}

export interface SettlementAccountingData {
  salaryPending: number;
  vacationDays: number;
  vacationAmount: number;
  extraPayProrate: number;
  indemnityAmount: number;
  indemnityType: 'objective' | 'unfair' | 'ere' | 'voluntary' | 'none';
  ssEmployee: number;
  irpfRetention: number;
  employeeName: string;
  terminationDate: string;
}

// === HOOK ===

export function useHRAccountingIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [mappings, setMappings] = useState<AccountingMapping[]>([]);
  const [journalEntries, setJournalEntries] = useState<HRJournalEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // === FETCH MAPPINGS ===
  const fetchMappings = useCallback(async (companyId: string, jurisdiction = 'ES') => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_accounting_mapping')
        .select('*')
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .eq('jurisdiction', jurisdiction)
        .eq('is_active', true)
        .order('concept_code');

      if (fetchError) throw fetchError;

      setMappings((data || []) as AccountingMapping[]);
      return data;
    } catch (err) {
      console.error('[useHRAccountingIntegration] fetchMappings error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar mapeos');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH JOURNAL ENTRIES ===
  const fetchJournalEntries = useCallback(async (companyId: string, filters?: {
    sourceType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_journal_entries')
        .select('*')
        .eq('company_id', companyId)
        .order('entry_date', { ascending: false })
        .limit(100);

      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters?.status) {
        query = query.eq('generation_status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('entry_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('entry_date', filters.dateTo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const entries = (data || []).map(entry => ({
        ...entry,
        entry_lines: (entry.entry_lines as unknown as JournalEntryLine[]) || []
      })) as HRJournalEntry[];

      setJournalEntries(entries);
      return entries;
    } catch (err) {
      console.error('[useHRAccountingIntegration] fetchJournalEntries error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar asientos');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE PAYROLL ENTRY LINES ===
  const generatePayrollEntryLines = useCallback((data: PayrollAccountingData): JournalEntryLine[] => {
    const lines: JournalEntryLine[] = [];
    const netSalary = data.grossSalary - data.ssEmployee - data.irpfRetention - (data.otherDeductions || 0);

    // Debe: Sueldos y salarios (640)
    if (data.grossSalary > 0) {
      lines.push({
        account_code: '640',
        account_name: 'Sueldos y salarios',
        debit: data.grossSalary,
        credit: 0,
        concept: 'SALARY_GROSS',
        description: `Salario bruto ${data.employeeName || ''} ${data.period || ''}`
      });
    }

    // Debe: SS Empresa (642)
    if (data.ssCompany > 0) {
      lines.push({
        account_code: '642',
        account_name: 'Seguridad Social a cargo empresa',
        debit: data.ssCompany,
        credit: 0,
        concept: 'SS_COMPANY',
        description: `Cuota patronal SS ${data.period || ''}`
      });
    }

    // Haber: HP Acreedora IRPF (4751)
    if (data.irpfRetention > 0) {
      lines.push({
        account_code: '4751',
        account_name: 'HP Acreedora por retenciones',
        debit: 0,
        credit: data.irpfRetention,
        concept: 'IRPF_RETENTION',
        description: `Retención IRPF ${data.employeeName || ''}`
      });
    }

    // Haber: Organismos SS (476) - Trabajador + Empresa
    const totalSS = data.ssEmployee + data.ssCompany;
    if (totalSS > 0) {
      lines.push({
        account_code: '476',
        account_name: 'Organismos SS acreedores',
        debit: 0,
        credit: totalSS,
        concept: 'SS_TOTAL',
        description: `Cuotas SS a ingresar ${data.period || ''}`
      });
    }

    // Haber: Remuneraciones pendientes (465)
    if (netSalary > 0) {
      lines.push({
        account_code: '465',
        account_name: 'Remuneraciones pendientes de pago',
        debit: 0,
        credit: netSalary,
        concept: 'NET_SALARY',
        description: `Neto a pagar ${data.employeeName || ''}`
      });
    }

    return lines;
  }, []);

  // === GENERATE SETTLEMENT ENTRY LINES ===
  const generateSettlementEntryLines = useCallback((data: SettlementAccountingData): JournalEntryLine[] => {
    const lines: JournalEntryLine[] = [];
    
    // Debe: Salario pendiente (640)
    if (data.salaryPending > 0) {
      lines.push({
        account_code: '640',
        account_name: 'Sueldos y salarios',
        debit: data.salaryPending,
        credit: 0,
        concept: 'SETTLEMENT_SALARY',
        description: `Salario pendiente finiquito ${data.employeeName}`
      });
    }

    // Debe: Vacaciones no disfrutadas (640)
    if (data.vacationAmount > 0) {
      lines.push({
        account_code: '640',
        account_name: 'Sueldos y salarios',
        debit: data.vacationAmount,
        credit: 0,
        concept: 'SETTLEMENT_VACATION',
        description: `${data.vacationDays} días vacaciones ${data.employeeName}`
      });
    }

    // Debe: Prorrata pagas extras (640)
    if (data.extraPayProrate > 0) {
      lines.push({
        account_code: '640',
        account_name: 'Sueldos y salarios',
        debit: data.extraPayProrate,
        credit: 0,
        concept: 'SETTLEMENT_EXTRA',
        description: `Prorrata pagas extras ${data.employeeName}`
      });
    }

    // Debe: Indemnización (641) - si aplica
    if (data.indemnityAmount > 0 && data.indemnityType !== 'none') {
      const indemnityDesc = {
        objective: 'Indemnización despido objetivo (20d/año)',
        unfair: 'Indemnización despido improcedente (33d/año)',
        ere: 'Indemnización ERE',
        voluntary: 'Indemnización baja voluntaria'
      };
      
      lines.push({
        account_code: '641',
        account_name: 'Indemnizaciones',
        debit: data.indemnityAmount,
        credit: 0,
        concept: `INDEMNITY_${data.indemnityType.toUpperCase()}`,
        description: `${indemnityDesc[data.indemnityType]} ${data.employeeName}`
      });
    }

    // Haber: HP Acreedora IRPF (4751)
    if (data.irpfRetention > 0) {
      lines.push({
        account_code: '4751',
        account_name: 'HP Acreedora por retenciones',
        debit: 0,
        credit: data.irpfRetention,
        concept: 'IRPF_RETENTION',
        description: `Retención IRPF finiquito ${data.employeeName}`
      });
    }

    // Haber: Organismos SS (476)
    if (data.ssEmployee > 0) {
      lines.push({
        account_code: '476',
        account_name: 'Organismos SS acreedores',
        debit: 0,
        credit: data.ssEmployee,
        concept: 'SS_EMPLOYEE',
        description: `SS trabajador finiquito ${data.employeeName}`
      });
    }

    // Haber: Neto finiquito (465)
    const totalDebit = data.salaryPending + data.vacationAmount + data.extraPayProrate + data.indemnityAmount;
    const netSettlement = totalDebit - data.irpfRetention - data.ssEmployee;
    
    if (netSettlement > 0) {
      lines.push({
        account_code: '465',
        account_name: 'Remuneraciones pendientes de pago',
        debit: 0,
        credit: netSettlement,
        concept: 'SETTLEMENT_NET',
        description: `Neto finiquito ${data.employeeName}`
      });
    }

    return lines;
  }, []);

  // === VALIDATE DOUBLE ENTRY ===
  const validateDoubleEntry = useCallback((lines: JournalEntryLine[]): boolean => {
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }, []);

  // === CREATE JOURNAL ENTRY ===
  const createJournalEntry = useCallback(async (
    companyId: string,
    sourceType: HRJournalEntry['source_type'],
    sourceId: string,
    sourceReference: string,
    entryDate: string,
    description: string,
    entryLines: JournalEntryLine[]
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      // Validar partida doble
      if (!validateDoubleEntry(entryLines)) {
        const totalDebit = entryLines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = entryLines.reduce((sum, l) => sum + l.credit, 0);
        throw new Error(`El asiento no cuadra: Debe=${totalDebit.toFixed(2)}, Haber=${totalCredit.toFixed(2)}`);
      }

      const totalDebit = entryLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = entryLines.reduce((sum, l) => sum + l.credit, 0);

      const { data, error: insertError } = await supabase
        .from('erp_hr_journal_entries')
        .insert([{
          company_id: companyId,
          source_type: sourceType,
          source_id: sourceId,
          source_reference: sourceReference,
          entry_date: entryDate,
          description,
          total_debit: totalDebit,
          total_credit: totalCredit,
          entry_lines: JSON.parse(JSON.stringify(entryLines)),
          generation_status: 'pending',
          auto_generated: true
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Log de auditoría
      await supabase.from('erp_hr_integration_log').insert([{
        company_id: companyId,
        integration_type: 'accounting',
        source_type: sourceType,
        source_id: sourceId,
        action: 'create',
        status: 'success',
        details: {
          entry_id: data.id,
          total_debit: totalDebit,
          total_credit: totalCredit,
          lines_count: entryLines.length
        }
      }]);

      toast.success('Asiento contable generado correctamente');
      return data.id;
    } catch (err) {
      console.error('[useHRAccountingIntegration] createJournalEntry error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear asiento';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [validateDoubleEntry]);

  // === UPDATE ENTRY STATUS ===
  const updateEntryStatus = useCallback(async (
    entryId: string,
    status: HRJournalEntry['generation_status'],
    journalEntryId?: string
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = { generation_status: status };
      
      if (journalEntryId) {
        updates.journal_entry_id = journalEntryId;
      }
      
      if (status === 'posted') {
        updates.validation_status = 'validated';
      }

      const { error: updateError } = await supabase
        .from('erp_hr_journal_entries')
        .update(updates)
        .eq('id', entryId);

      if (updateError) throw updateError;

      toast.success(`Estado actualizado a: ${status}`);
      return true;
    } catch (err) {
      console.error('[useHRAccountingIntegration] updateEntryStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, []);

  // === REVERSE ENTRY ===
  const reverseEntry = useCallback(async (
    entryId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      // Obtener asiento original
      const { data: original, error: fetchError } = await supabase
        .from('erp_hr_journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (fetchError || !original) throw new Error('Asiento no encontrado');

      const originalLines = (original.entry_lines as unknown as JournalEntryLine[]) || [];

      // Crear asiento de reversión (invertir Debe/Haber)
      const reversedLines: JournalEntryLine[] = originalLines.map(line => ({
        ...line,
        debit: line.credit,
        credit: line.debit,
        description: `REVERSIÓN: ${line.description || ''}`
      }));

      // Insertar asiento de reversión
      const { error: insertError } = await supabase
        .from('erp_hr_journal_entries')
        .insert([{
          company_id: original.company_id,
          source_type: original.source_type,
          source_id: original.source_id,
          source_reference: `REV-${original.source_reference}`,
          entry_date: new Date().toISOString().split('T')[0],
          description: `Reversión: ${reason}`,
          total_debit: original.total_credit,
          total_credit: original.total_debit,
          entry_lines: JSON.parse(JSON.stringify(reversedLines)),
          generation_status: 'pending',
          auto_generated: true,
          metadata: { reversed_entry_id: entryId, reversal_reason: reason }
        }]);

      if (insertError) throw insertError;

      // Marcar original como revertido
      await supabase
        .from('erp_hr_journal_entries')
        .update({ generation_status: 'reversed' })
        .eq('id', entryId);

      toast.success('Asiento revertido correctamente');
      return true;
    } catch (err) {
      console.error('[useHRAccountingIntegration] reverseEntry error:', err);
      toast.error('Error al revertir asiento');
      return false;
    }
  }, []);

  // === GENERATE PAYROLL ENTRY (via Edge Function) ===
  const generatePayrollEntry = useCallback(async (
    companyId: string,
    payroll: {
      id: string;
      employee_id: string;
      employee_name: string;
      period: string;
      gross_salary: number;
      net_salary: number;
      irpf_amount: number;
      irpf_percentage: number;
      ss_employee: number;
      ss_company: number;
      extras: number;
      deductions: number;
    },
    entryDate: string,
    journalId?: string,
    autoPost?: boolean
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-accounting-bridge', {
        body: {
          action: 'generate_payroll_entry',
          payload: {
            company_id: companyId,
            payroll,
            entry_date: entryDate,
            journal_id: journalId,
            auto_post: autoPost
          }
        }
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Error al generar asiento');

      toast.success(`Asiento de nómina generado: ${data.journal_entry_id}`);
      return data;
    } catch (err) {
      console.error('[useHRAccountingIntegration] generatePayrollEntry error:', err);
      const msg = err instanceof Error ? err.message : 'Error al generar asiento';
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE BATCH PAYROLL ENTRIES ===
  const generateBatchPayrollEntries = useCallback(async (
    companyId: string,
    period: string,
    payrolls: Array<{
      id: string;
      employee_id: string;
      employee_name: string;
      period: string;
      gross_salary: number;
      net_salary: number;
      irpf_amount: number;
      irpf_percentage: number;
      ss_employee: number;
      ss_company: number;
      extras: number;
      deductions: number;
    }>,
    entryDate: string,
    journalId?: string,
    consolidate: boolean = true
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-accounting-bridge', {
        body: {
          action: 'generate_batch_payroll_entries',
          payload: {
            company_id: companyId,
            period,
            payrolls,
            entry_date: entryDate,
            journal_id: journalId,
            consolidate
          }
        }
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Error al generar asientos');

      toast.success(consolidate 
        ? `Asiento consolidado creado: ${data.journal_entry_id}`
        : `${data.entries_created} asientos creados`
      );
      return data;
    } catch (err) {
      console.error('[useHRAccountingIntegration] generateBatchPayrollEntries error:', err);
      const msg = err instanceof Error ? err.message : 'Error al generar asientos';
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET ACCOUNTING STATUS (from Edge Function) ===
  const getAccountingStatus = useCallback(async (
    companyId: string,
    sourceType: 'payroll' | 'settlement' | 'ss_contribution',
    sourceIds: string[]
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-accounting-bridge', {
        body: {
          action: 'get_accounting_status',
          payload: { company_id: companyId, source_type: sourceType, source_ids: sourceIds }
        }
      });

      if (fnError) throw fnError;
      return data?.status || {};
    } catch (err) {
      console.error('[useHRAccountingIntegration] getAccountingStatus error:', err);
      return {};
    }
  }, []);

  // === GET SUMMARY ===
  const getAccountingSummary = useCallback(async (companyId: string, period?: string) => {
    try {
      let query = supabase
        .from('erp_hr_journal_entries')
        .select('source_type, generation_status, total_debit, total_credit')
        .eq('company_id', companyId);

      if (period) {
        const [year, month] = period.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        query = query.gte('entry_date', startDate).lte('entry_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = {
        totalEntries: data?.length || 0,
        pending: data?.filter(e => e.generation_status === 'pending').length || 0,
        posted: data?.filter(e => e.generation_status === 'posted').length || 0,
        reversed: data?.filter(e => e.generation_status === 'reversed').length || 0,
        totalDebit: data?.reduce((sum, e) => sum + (e.total_debit || 0), 0) || 0,
        totalCredit: data?.reduce((sum, e) => sum + (e.total_credit || 0), 0) || 0,
        byType: {
          payroll: data?.filter(e => e.source_type === 'payroll').length || 0,
          settlement: data?.filter(e => e.source_type === 'settlement').length || 0,
          ss_contribution: data?.filter(e => e.source_type === 'ss_contribution').length || 0
        }
      };

      return summary;
    } catch (err) {
      console.error('[useHRAccountingIntegration] getAccountingSummary error:', err);
      return null;
    }
  }, []);

  return {
    // Estado
    isLoading,
    mappings,
    journalEntries,
    error,
    // Fetch
    fetchMappings,
    fetchJournalEntries,
    // Generación de líneas (local)
    generatePayrollEntryLines,
    generateSettlementEntryLines,
    // Validación
    validateDoubleEntry,
    // CRUD local
    createJournalEntry,
    updateEntryStatus,
    reverseEntry,
    // Edge Function actions
    generatePayrollEntry,
    generateBatchPayrollEntries,
    getAccountingStatus,
    // Resumen
    getAccountingSummary
  };
}

export default useHRAccountingIntegration;
