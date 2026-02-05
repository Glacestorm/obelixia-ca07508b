/**
 * useLegalMatters - Hook para Matter Management & Legal Spend
 * Fase 6: Gestión de asuntos legales, tiempo y gastos con soporte LEDES
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LegalMatter {
  id: string;
  company_id: string;
  matter_number: string;
  title: string;
  description?: string;
  matter_type: string;
  status: string;
  priority: string;
  practice_area?: string;
  open_date: string;
  close_date?: string;
  next_deadline?: string;
  billing_type: string;
  budget_amount?: number;
  budget_spent?: number;
  currency: string;
  opposing_party?: string;
  jurisdiction?: string;
  risk_assessment?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  matter_id: string;
  timekeeper_id: string;
  timekeeper_role?: string;
  work_date: string;
  hours: number;
  description: string;
  activity_code?: string;
  task_code?: string;
  billable: boolean;
  billing_status: string;
  hourly_rate?: number;
  amount?: number;
  approval_status: string;
}

export interface LegalExpense {
  id: string;
  matter_id: string;
  expense_date: string;
  description: string;
  expense_type: string;
  expense_code?: string;
  amount: number;
  currency: string;
  billable: boolean;
  billing_status: string;
  approval_status: string;
  vendor_name?: string;
}

export interface LegalInvoice {
  id: string;
  matter_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  billing_entity_type: string;
  entity_name?: string;
  fees_amount: number;
  expenses_amount: number;
  total_amount: number;
  status: string;
  ledes_format?: string;
  ai_analysis?: Record<string, unknown>;
}

export interface SpendAnalytics {
  total_spend: number;
  internal_spend: number;
  external_spend: number;
  fees_spend: number;
  expenses_spend: number;
  spend_by_practice_area: Record<string, number>;
  spend_by_matter_type: Record<string, number>;
  matters_opened: number;
  matters_closed: number;
  budget_variance_percentage: number;
}

export interface LegalContext {
  companyId: string;
  matterId?: string;
  period?: { start: string; end: string };
}

export function useLegalMatters() {
  const [matters, setMatters] = useState<LegalMatter[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<LegalExpense[]>([]);
  const [invoices, setInvoices] = useState<LegalInvoice[]>([]);
  const [analytics, setAnalytics] = useState<SpendAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch matters
  const fetchMatters = useCallback(async (companyId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_legal_matters')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMatters(data as LegalMatter[]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching matters';
      setError(message);
      console.error('[useLegalMatters] fetchMatters error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create matter
  const createMatter = useCallback(async (matter: Partial<LegalMatter> & { company_id: string; matter_number: string; title: string; matter_type: string }) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    try {
      const insertData = {
        company_id: matter.company_id,
        matter_number: matter.matter_number,
        title: matter.title,
        matter_type: matter.matter_type,
        description: matter.description,
        status: matter.status || 'active',
        priority: matter.priority || 'medium',
        practice_area: matter.practice_area,
        open_date: matter.open_date || new Date().toISOString().split('T')[0],
        billing_type: matter.billing_type || 'hourly',
        budget_amount: matter.budget_amount,
        currency: matter.currency || 'EUR',
        created_by: user.id
      };

      const { data, error: insertError } = await supabase
        .from('erp_legal_matters')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      const newMatter = data as LegalMatter;
      setMatters(prev => [newMatter, ...prev]);
      toast.success('Asunto legal creado');
      return newMatter;
    } catch (err) {
      console.error('[useLegalMatters] createMatter error:', err);
      toast.error('Error al crear asunto');
      return null;
    }
  }, [user?.id]);

  // Update matter
  const updateMatter = useCallback(async (matterId: string, updates: Partial<LegalMatter>) => {
    try {
      const { error: updateError } = await supabase
        .from('erp_legal_matters')
        .update(updates)
        .eq('id', matterId);

      if (updateError) throw updateError;

      setMatters(prev => prev.map(m => 
        m.id === matterId ? { ...m, ...updates } : m
      ));
      toast.success('Asunto actualizado');
      return true;
    } catch (err) {
      console.error('[useLegalMatters] updateMatter error:', err);
      toast.error('Error al actualizar');
      return false;
    }
  }, []);

  // Fetch time entries for a matter
  const fetchTimeEntries = useCallback(async (matterId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_legal_time_entries')
        .select('*')
        .eq('matter_id', matterId)
        .order('work_date', { ascending: false });

      if (fetchError) throw fetchError;
      setTimeEntries(data as TimeEntry[]);
      return data;
    } catch (err) {
      console.error('[useLegalMatters] fetchTimeEntries error:', err);
      return null;
    }
  }, []);

  // Create time entry
  const createTimeEntry = useCallback(async (entry: Partial<TimeEntry> & { matter_id: string; work_date: string; hours: number; description: string }) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    try {
      // Get company_id from matter
      const matter = matters.find(m => m.id === entry.matter_id);
      if (!matter) throw new Error('Matter not found');

      const insertData = {
        company_id: matter.company_id,
        matter_id: entry.matter_id,
        timekeeper_id: entry.timekeeper_id || user.id,
        timekeeper_role: entry.timekeeper_role,
        work_date: entry.work_date,
        hours: entry.hours,
        description: entry.description,
        activity_code: entry.activity_code,
        task_code: entry.task_code,
        billable: entry.billable ?? true,
        hourly_rate: entry.hourly_rate,
        amount: entry.amount
      };

      const { data, error: insertError } = await supabase
        .from('erp_legal_time_entries')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      const newEntry = data as TimeEntry;
      setTimeEntries(prev => [newEntry, ...prev]);
      toast.success('Tiempo registrado');
      return newEntry;
    } catch (err) {
      console.error('[useLegalMatters] createTimeEntry error:', err);
      toast.error('Error al registrar tiempo');
      return null;
    }
  }, [user?.id, matters]);

  // Fetch expenses
  const fetchExpenses = useCallback(async (matterId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_legal_expenses')
        .select('*')
        .eq('matter_id', matterId)
        .order('expense_date', { ascending: false });

      if (fetchError) throw fetchError;
      setExpenses(data as LegalExpense[]);
      return data;
    } catch (err) {
      console.error('[useLegalMatters] fetchExpenses error:', err);
      return null;
    }
  }, []);

  // Create expense
  const createExpense = useCallback(async (expense: Partial<LegalExpense> & { matter_id: string; expense_date: string; description: string; expense_type: string; amount: number }) => {
    try {
      const matter = matters.find(m => m.id === expense.matter_id);
      if (!matter) throw new Error('Matter not found');

      const insertData = {
        company_id: matter.company_id,
        matter_id: expense.matter_id,
        expense_date: expense.expense_date,
        description: expense.description,
        expense_type: expense.expense_type,
        expense_code: expense.expense_code,
        amount: expense.amount,
        currency: expense.currency || 'EUR',
        billable: expense.billable ?? true,
        vendor_name: expense.vendor_name
      };

      const { data, error: insertError } = await supabase
        .from('erp_legal_expenses')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      const newExpense = data as LegalExpense;
      setExpenses(prev => [newExpense, ...prev]);
      toast.success('Gasto registrado');
      return newExpense;
    } catch (err) {
      console.error('[useLegalMatters] createExpense error:', err);
      toast.error('Error al registrar gasto');
      return null;
    }
  }, [matters]);

  // AI-powered analysis
  const analyzeSpend = useCallback(async (context: LegalContext) => {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-legal-spend',
        {
          body: {
            action: 'analyze_spend',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAnalytics(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useLegalMatters] analyzeSpend error:', err);
      toast.error('Error en análisis de gastos');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate LEDES invoice
  const generateLEDESInvoice = useCallback(async (
    matterId: string,
    format: 'LEDES98B' | 'LEDES2000' | 'LEDES_XML' = 'LEDES98B'
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-legal-spend',
        {
          body: {
            action: 'generate_ledes',
            params: { matterId, format }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success(`Factura LEDES ${format} generada`);
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useLegalMatters] generateLEDESInvoice error:', err);
      toast.error('Error generando factura LEDES');
      return null;
    }
  }, []);

  // AI invoice analysis for anomalies
  const analyzeInvoice = useCallback(async (invoiceId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-legal-spend',
        {
          body: {
            action: 'analyze_invoice',
            params: { invoiceId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useLegalMatters] analyzeInvoice error:', err);
      toast.error('Error en análisis de factura');
      return null;
    }
  }, []);

  // Benchmark vendor rates
  const benchmarkVendorRates = useCallback(async (
    companyId: string,
    practiceArea?: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-legal-spend',
        {
          body: {
            action: 'benchmark_rates',
            params: { companyId, practiceArea }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useLegalMatters] benchmarkVendorRates error:', err);
      toast.error('Error en benchmark de tarifas');
      return null;
    }
  }, []);

  // Calculate matter totals
  const calculateMatterTotals = useCallback((matterId: string) => {
    const matterTimeEntries = timeEntries.filter(t => t.matter_id === matterId);
    const matterExpenses = expenses.filter(e => e.matter_id === matterId);

    const totalHours = matterTimeEntries.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = matterTimeEntries
      .filter(t => t.billable)
      .reduce((sum, t) => sum + t.hours, 0);
    const feesAmount = matterTimeEntries
      .filter(t => t.billable && t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expensesAmount = matterExpenses
      .filter(e => e.billable)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalHours,
      billableHours,
      feesAmount,
      expensesAmount,
      totalAmount: feesAmount + expensesAmount,
      utilizationRate: totalHours > 0 ? (billableHours / totalHours) * 100 : 0
    };
  }, [timeEntries, expenses]);

  return {
    // State
    matters,
    timeEntries,
    expenses,
    invoices,
    analytics,
    loading,
    error,
    // Matter operations
    fetchMatters,
    createMatter,
    updateMatter,
    // Time entries
    fetchTimeEntries,
    createTimeEntry,
    // Expenses
    fetchExpenses,
    createExpense,
    // AI/Analytics
    analyzeSpend,
    generateLEDESInvoice,
    analyzeInvoice,
    benchmarkVendorRates,
    calculateMatterTotals,
  };
}

export default useLegalMatters;
