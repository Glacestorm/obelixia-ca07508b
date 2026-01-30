/**
 * useERPFiscalClosing - Hook para gestión de cierre fiscal
 * Conecta el FiscalClosingWizard con la edge function erp-fiscal-closing-wizard
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// === TYPES ===
export type ClosingAction = 
  | 'validate' 
  | 'close_periods' 
  | 'regularization' 
  | 'closing_entry' 
  | 'opening_entry' 
  | 'full_wizard';

export type ClosingStatus = 'pending' | 'validating' | 'closing' | 'closed' | 'reopened';

export interface FiscalClosing {
  id: string;
  company_id: string;
  fiscal_year_id: string;
  status: ClosingStatus;
  started_at: string | null;
  completed_at: string | null;
  performed_by: string | null;
  regularization_entry_id: string | null;
  closing_entry_id: string | null;
  opening_entry_id: string | null;
  validations_json: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClosingEvent {
  id: string;
  closing_id: string;
  event_type: string;
  event_timestamp: string;
  message: string;
  details: any;
  severity: 'info' | 'warning' | 'error' | 'success';
  created_at: string;
}

export interface ValidationIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  fiscalYear?: any;
}

export interface ClosingStepResult {
  success: boolean;
  action: ClosingAction;
  closing_id: string;
  entry?: any;
  periods?: any[];
  regularization?: any;
  closing?: any;
  opening?: any;
  issues?: ValidationIssue[];
  step?: string;
}

export interface StepState {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';
  required: boolean;
  validations?: string[];
  errors?: string[];
  result?: any;
}

// === HOOK ===
export function useERPFiscalClosing(fiscalYearId?: string) {
  const { currentCompany } = useERPContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentClosing, setCurrentClosing] = useState<FiscalClosing | null>(null);
  const [events, setEvents] = useState<ClosingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const effectiveFiscalYearId = fiscalYearId;

  // === FETCH CLOSING ===
  const fetchCurrentClosing = useCallback(async () => {
    if (!currentCompany?.id || !effectiveFiscalYearId) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('erp_fiscal_closings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('fiscal_year_id', effectiveFiscalYearId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      setCurrentClosing(data as FiscalClosing | null);
      return data as FiscalClosing | null;
    } catch (err) {
      console.error('[useERPFiscalClosing] fetchCurrentClosing error:', err);
      return null;
    }
  }, [currentCompany?.id, effectiveFiscalYearId]);

  // === FETCH EVENTS ===
  const fetchEvents = useCallback(async (closingId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_closing_events')
        .select('*')
        .eq('closing_id', closingId)
        .order('event_timestamp', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      
      setEvents(data as ClosingEvent[] || []);
      return data as ClosingEvent[];
    } catch (err) {
      console.error('[useERPFiscalClosing] fetchEvents error:', err);
      return [];
    }
  }, []);

  // === EXECUTE ACTION ===
  const executeAction = useCallback(async (
    action: ClosingAction,
    options?: {
      target_account?: string;
      new_fiscal_year_id?: string;
    }
  ): Promise<ClosingStepResult> => {
    if (!currentCompany?.id || !effectiveFiscalYearId) {
      const errorMsg = 'Empresa o ejercicio fiscal no seleccionado';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, action, closing_id: '' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error: fnError } = await supabase.functions.invoke('erp-fiscal-closing-wizard', {
        body: {
          action,
          company_id: currentCompany.id,
          fiscal_year_id: effectiveFiscalYearId,
          user_id: userData.user?.id,
          options
        }
      });

      if (fnError) throw fnError;

      if (!data.success && action === 'validate') {
        setValidationResult({
          valid: false,
          issues: data.issues || [],
          fiscalYear: data.fiscalYear
        });
      } else if (action === 'validate' && data.valid !== undefined) {
        setValidationResult({
          valid: data.valid,
          issues: data.issues || [],
          fiscalYear: data.fiscalYear
        });
      }

      // Refresh closing and events after action
      if (data.closing_id) {
        await fetchCurrentClosing();
        await fetchEvents(data.closing_id);
      }

      return data as ClosingStepResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error en cierre fiscal';
      setError(errorMsg);
      console.error('[useERPFiscalClosing] executeAction error:', err);
      return { success: false, action, closing_id: '' };
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, effectiveFiscalYearId, fetchCurrentClosing, fetchEvents]);

  // === VALIDATE PREREQUISITES ===
  const validatePrerequisites = useCallback(async () => {
    const result = await executeAction('validate');
    return result;
  }, [executeAction]);

  // === CLOSE PERIODS ===
  const closePeriods = useCallback(async () => {
    const result = await executeAction('close_periods');
    if (result.success) {
      toast.success(`${result.periods?.length || 0} períodos cerrados`);
    }
    return result;
  }, [executeAction]);

  // === CREATE REGULARIZATION ENTRY ===
  const createRegularization = useCallback(async (targetAccount?: string) => {
    const result = await executeAction('regularization', { target_account: targetAccount });
    if (result.success && result.entry) {
      toast.success('Asiento de regularización creado');
    }
    return result;
  }, [executeAction]);

  // === CREATE CLOSING ENTRY ===
  const createClosingEntry = useCallback(async () => {
    const result = await executeAction('closing_entry');
    if (result.success && result.entry) {
      toast.success('Asiento de cierre creado');
    }
    return result;
  }, [executeAction]);

  // === CREATE OPENING ENTRY ===
  const createOpeningEntry = useCallback(async (newFiscalYearId: string) => {
    const result = await executeAction('opening_entry', { new_fiscal_year_id: newFiscalYearId });
    if (result.success && result.entry) {
      toast.success('Asiento de apertura creado');
    }
    return result;
  }, [executeAction]);

  // === EXECUTE FULL WIZARD ===
  const executeFullWizard = useCallback(async (newFiscalYearId?: string, targetAccount?: string) => {
    const result = await executeAction('full_wizard', {
      target_account: targetAccount,
      new_fiscal_year_id: newFiscalYearId
    });
    
    if (result.success) {
      toast.success('Cierre fiscal completado exitosamente');
    } else if (result.step) {
      toast.error(`Error en paso: ${result.step}`);
    }
    
    return result;
  }, [executeAction]);

  // === EXECUTE SPECIFIC STEP ===
  const executeStep = useCallback(async (stepId: string): Promise<{ success: boolean; errors?: string[] }> => {
    const stepToAction: Record<string, ClosingAction> = {
      'validate_entries': 'validate',
      'reconcile_accounts': 'validate',
      'calculate_depreciation': 'validate',
      'provisions': 'validate',
      'accruals': 'validate',
      'regularization': 'regularization',
      'result_distribution': 'regularization',
      'closing_entry': 'closing_entry',
      'opening_entry': 'opening_entry',
    };

    const action = stepToAction[stepId] || 'validate';
    
    try {
      const result = await executeAction(action);
      
      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          errors: result.issues?.map(i => i.message) || ['Error en la ejecución'] 
        };
      }
    } catch (err) {
      return { 
        success: false, 
        errors: [err instanceof Error ? err.message : 'Error desconocido'] 
      };
    }
  }, [executeAction]);

  // === GET CLOSING STATUS ===
  const getClosingStatus = useCallback((): string => {
    if (!currentClosing) return 'not_started';
    return currentClosing.status;
  }, [currentClosing]);

  // === CHECK IF CLOSABLE ===
  const canClose = useCallback((): boolean => {
    if (!currentCompany?.id || !effectiveFiscalYearId) return false;
    if (currentClosing?.status === 'closed') return false;
    return true;
  }, [currentCompany?.id, effectiveFiscalYearId, currentClosing]);

  // === INITIAL FETCH ===
  useEffect(() => {
    if (currentCompany?.id && effectiveFiscalYearId) {
      fetchCurrentClosing();
    }
  }, [currentCompany?.id, effectiveFiscalYearId, fetchCurrentClosing]);

  // === REALTIME SUBSCRIPTION ===
  useEffect(() => {
    if (!currentClosing?.id) return;

    const channel = supabase
      .channel(`closing-events-${currentClosing.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'erp_closing_events',
          filter: `closing_id=eq.${currentClosing.id}`
        },
        (payload) => {
          const newEvent = payload.new as ClosingEvent;
          setEvents(prev => [newEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentClosing?.id]);

  return {
    // State
    isLoading,
    currentClosing,
    events,
    error,
    validationResult,
    
    // Actions
    validatePrerequisites,
    closePeriods,
    createRegularization,
    createClosingEntry,
    createOpeningEntry,
    executeFullWizard,
    executeStep,
    executeAction,
    
    // Helpers
    fetchCurrentClosing,
    fetchEvents,
    getClosingStatus,
    canClose,
  };
}

export default useERPFiscalClosing;
