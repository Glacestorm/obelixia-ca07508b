/**
 * useERPMigration - Hook principal para migración ERP/Contable
 * Soporta 20+ sistemas contables con análisis IA
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface ERPConnector {
  id: string;
  kind: string;
  label: string;
  vendor: string;
  logo_url?: string;
  region?: string;
  notes?: string[];
  file_import?: {
    formats: string[];
    max_size_mb: number;
  };
  entities?: Record<string, unknown>;
  documentation_url?: string;
  is_active: boolean;
  popularity_rank?: number;
}

export interface ERPMigrationSession {
  id: string;
  company_id: string;
  connector_id: string;
  session_name: string;
  status: 'draft' | 'analyzing' | 'mapping' | 'validating' | 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'rolled_back';
  source_chart_type?: string;
  target_chart_type?: string;
  source_fiscal_year?: number;
  target_fiscal_year?: number;
  total_records: number;
  migrated_records: number;
  failed_records: number;
  skipped_records: number;
  config: Record<string, unknown>;
  ai_analysis?: MigrationAnalysis;
  validation_summary?: ValidationSummary;
  compliance_checks?: Record<string, unknown>;
  fiscal_reconciliation?: Record<string, unknown>;
  rollback_available: boolean;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ERPChartMapping {
  id: string;
  session_id: string;
  source_account_code: string;
  source_account_name?: string;
  source_account_type?: string;
  target_account_code?: string;
  target_account_name?: string;
  target_account_type?: string;
  transform_type: 'direct' | 'aggregate' | 'split' | 'create_new';
  transform_rules?: Record<string, unknown>;
  ai_confidence?: number;
  ai_reasoning?: string;
  manual_override: boolean;
  is_verified: boolean;
  notes?: string;
}

export interface ERPFieldMapping {
  id: string;
  session_id: string;
  entity_type: string;
  source_field: string;
  target_field: string;
  transform_type: 'direct' | 'formula' | 'lookup' | 'constant';
  transform_formula?: string;
  default_value?: string;
  is_required: boolean;
  ai_confidence?: number;
  manual_override: boolean;
  sample_values?: unknown[];
}

export interface ERPMigrationRecord {
  id: string;
  session_id: string;
  entity_type: string;
  original_id?: string;
  original_code?: string;
  original_name?: string;
  original_data: Record<string, unknown>;
  transformed_data?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'migrated' | 'failed' | 'skipped' | 'rolled_back';
  validation_errors?: Array<{ field: string; message: string; severity: string }>;
  ai_confidence?: number;
  ai_notes?: string;
  batch_number?: number;
  row_number?: number;
  processing_time_ms?: number;
  target_table?: string;
  imported_id?: string;
}

export interface ERPValidationRule {
  id: string;
  rule_key: string;
  rule_name: string;
  description?: string;
  entity_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  rule_type: string;
  validation_logic: Record<string, unknown>;
  error_message_template?: string;
  is_active: boolean;
  is_blocking: boolean;
}

export interface ERPMappingTemplate {
  id: string;
  template_name: string;
  source_system: string;
  source_chart_type?: string;
  target_chart_type: string;
  description?: string;
  field_mappings: ERPFieldMapping[];
  chart_mappings: ERPChartMapping[];
  is_official: boolean;
  is_public: boolean;
  usage_count: number;
  success_rate?: number;
}

export interface ERPFiscalReconciliation {
  id: string;
  session_id: string;
  reconciliation_type: 'vat_sales' | 'vat_purchases' | 'withholdings' | 'bank' | 'trial_balance';
  period_start?: string;
  period_end?: string;
  source_total: number;
  target_total: number;
  difference: number;
  difference_percentage: number;
  is_reconciled: boolean;
  reconciliation_notes?: string;
  adjustments?: unknown[];
  details?: Record<string, unknown>;
}

export interface MigrationAnalysis {
  detected_system?: string;
  detected_chart_type?: string;
  detected_format?: string;
  total_records: number;
  detected_entities: Array<{
    type: string;
    count: number;
    sample?: unknown[];
  }>;
  detected_accounts: Array<{
    code: string;
    name: string;
    type?: string;
    balance?: number;
  }>;
  suggested_mappings: Array<{
    source_code: string;
    target_code: string;
    confidence: number;
    reasoning: string;
  }>;
  data_quality_score: number;
  fiscal_years_detected: number[];
  warnings: string[];
  recommendations: string[];
}

export interface ValidationSummary {
  total_validated: number;
  passed: number;
  failed: number;
  warnings: number;
  blocking_errors: number;
  issues: Array<{
    rule_key: string;
    severity: string;
    count: number;
    message: string;
  }>;
  can_proceed: boolean;
}

export interface MigrationStats {
  total_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  total_records_migrated: number;
  success_rate: number;
  avg_migration_time_ms: number;
  sessions_by_connector: Record<string, number>;
}

// === HOOK ===
export function useERPMigration() {
  // Estado
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [sessions, setSessions] = useState<ERPMigrationSession[]>([]);
  const [activeSession, setActiveSession] = useState<ERPMigrationSession | null>(null);
  const [records, setRecords] = useState<ERPMigrationRecord[]>([]);
  const [chartMappings, setChartMappings] = useState<ERPChartMapping[]>([]);
  const [fieldMappings, setFieldMappings] = useState<ERPFieldMapping[]>([]);
  const [templates, setTemplates] = useState<ERPMappingTemplate[]>([]);
  const [validationRules, setValidationRules] = useState<ERPValidationRule[]>([]);
  const [analysis, setAnalysis] = useState<MigrationAnalysis | null>(null);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Refs para polling
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH CONNECTORS ===
  const fetchConnectors = useCallback(async (): Promise<ERPConnector[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: { action: 'list_connectors' }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.connectors) {
        setConnectors(data.connectors);
        return data.connectors;
      }

      // Fallback: fetch from database directly
      const { data: dbData, error: dbError } = await supabase
        .from('erp_migration_connectors')
        .select('*')
        .eq('is_active', true)
        .order('popularity_rank', { ascending: true });

      if (dbError) throw dbError;
      
      const mapped = (dbData || []).map(c => ({
        id: c.id,
        kind: c.kind,
        label: c.label,
        vendor: c.vendor || '',
        logo_url: c.logo_url,
        region: c.region,
        notes: c.notes,
        file_import: c.file_import as ERPConnector['file_import'],
        entities: c.entities as Record<string, unknown>,
        documentation_url: c.documentation_url,
        is_active: c.is_active ?? true,
        popularity_rank: c.popularity_rank
      }));
      
      setConnectors(mapped);
      return mapped;
    } catch (err) {
      console.error('[useERPMigration] fetchConnectors error:', err);
      return [];
    }
  }, []);

  // === FETCH SESSIONS ===
  const fetchSessions = useCallback(async (companyId?: string): Promise<ERPMigrationSession[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: { action: 'list_sessions', company_id: companyId }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.sessions) {
        setSessions(data.sessions);
        return data.sessions;
      }

      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching sessions';
      setError(message);
      console.error('[useERPMigration] fetchSessions error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH TEMPLATES ===
  const fetchTemplates = useCallback(async (sourceSystem?: string): Promise<ERPMappingTemplate[]> => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_mapping_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (dbError) throw dbError;

      const filtered = sourceSystem 
        ? (data || []).filter(t => t.source_system === sourceSystem)
        : (data || []);

      setTemplates(filtered as unknown as ERPMappingTemplate[]);
      return filtered as unknown as ERPMappingTemplate[];
    } catch (err) {
      console.error('[useERPMigration] fetchTemplates error:', err);
      return [];
    }
  }, []);

  // === FETCH VALIDATION RULES ===
  const fetchValidationRules = useCallback(async (): Promise<ERPValidationRule[]> => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_validation_rules')
        .select('*')
        .eq('is_active', true);

      if (dbError) throw dbError;

      setValidationRules(data as unknown as ERPValidationRule[]);
      return data as unknown as ERPValidationRule[];
    } catch (err) {
      console.error('[useERPMigration] fetchValidationRules error:', err);
      return [];
    }
  }, []);

  // === ANALYZE FILE ===
  const analyzeFile = useCallback(async (
    fileContent: string,
    fileType: 'csv' | 'json' | 'xml' | 'xlsx',
    connectorId?: string
  ): Promise<MigrationAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'analyze_file',
          file_content: fileContent,
          file_type: fileType,
          connector_id: connectorId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        return data.analysis;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error analyzing file';
      setError(message);
      console.error('[useERPMigration] analyzeFile error:', err);
      toast.error('Error al analizar archivo');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // === CREATE SESSION ===
  const createSession = useCallback(async (
    companyId: string,
    connectorId: string,
    sessionName: string,
    fileContent: string,
    fileType: 'csv' | 'json' | 'xml' | 'xlsx',
    config?: Record<string, unknown>
  ): Promise<ERPMigrationSession | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'create_session',
          company_id: companyId,
          connector_id: connectorId,
          session_name: sessionName,
          file_content: fileContent,
          file_type: fileType,
          config
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.session) {
        setSessions(prev => [data.session, ...prev]);
        setActiveSession(data.session);
        if (data.analysis) {
          setAnalysis(data.analysis);
        }
        toast.success('Sesión de migración creada');
        return data.session;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating session';
      setError(message);
      console.error('[useERPMigration] createSession error:', err);
      toast.error('Error al crear sesión de migración');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === UPDATE CHART MAPPINGS ===
  const updateChartMappings = useCallback(async (
    sessionId: string,
    mappings: Partial<ERPChartMapping>[]
  ): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'update_chart_mappings',
          session_id: sessionId,
          mappings
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        if (data.mappings) {
          setChartMappings(data.mappings);
        }
        toast.success('Mapeo de cuentas actualizado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useERPMigration] updateChartMappings error:', err);
      toast.error('Error al actualizar mapeo de cuentas');
      return false;
    }
  }, []);

  // === UPDATE FIELD MAPPINGS ===
  const updateFieldMappings = useCallback(async (
    sessionId: string,
    mappings: Partial<ERPFieldMapping>[]
  ): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'update_field_mappings',
          session_id: sessionId,
          mappings
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        if (data.mappings) {
          setFieldMappings(data.mappings);
        }
        toast.success('Mapeo de campos actualizado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useERPMigration] updateFieldMappings error:', err);
      toast.error('Error al actualizar mapeo de campos');
      return false;
    }
  }, []);

  // === VALIDATE SESSION ===
  const validateSession = useCallback(async (sessionId: string): Promise<ValidationSummary | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'validate_session',
          session_id: sessionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.validation) {
        // Update session with validation
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, validation_summary: data.validation, status: 'validating' } : s
        ));
        return data.validation;
      }

      return null;
    } catch (err) {
      console.error('[useERPMigration] validateSession error:', err);
      toast.error('Error al validar sesión');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RUN MIGRATION ===
  const runMigration = useCallback(async (sessionId: string): Promise<boolean> => {
    setIsRunning(true);
    setProgress(0);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'run_migration',
          session_id: sessionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Migración iniciada');
        startProgressPolling(sessionId);
        return true;
      }

      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error running migration';
      setError(message);
      console.error('[useERPMigration] runMigration error:', err);
      toast.error('Error al ejecutar migración');
      setIsRunning(false);
      return false;
    }
  }, []);

  // === PAUSE MIGRATION ===
  const pauseMigration = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'pause_migration',
          session_id: sessionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        stopProgressPolling();
        setIsRunning(false);
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, status: 'paused' } : s
        ));
        toast.success('Migración pausada');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useERPMigration] pauseMigration error:', err);
      toast.error('Error al pausar migración');
      return false;
    }
  }, []);

  // === RESUME MIGRATION ===
  const resumeMigration = useCallback(async (sessionId: string): Promise<boolean> => {
    setIsRunning(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'resume_migration',
          session_id: sessionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        startProgressPolling(sessionId);
        toast.success('Migración reanudada');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useERPMigration] resumeMigration error:', err);
      toast.error('Error al reanudar migración');
      setIsRunning(false);
      return false;
    }
  }, []);

  // === ROLLBACK MIGRATION ===
  const rollbackMigration = useCallback(async (sessionId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'rollback_migration',
          session_id: sessionId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, status: 'rolled_back', rollback_available: false } : s
        ));
        toast.success('Rollback completado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useERPMigration] rollbackMigration error:', err);
      toast.error('Error al realizar rollback');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET SESSION RECORDS ===
  const getSessionRecords = useCallback(async (
    sessionId: string,
    options?: { status?: string; entity_type?: string; limit?: number; offset?: number }
  ): Promise<ERPMigrationRecord[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'get_records',
          session_id: sessionId,
          ...options
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.records) {
        setRecords(data.records);
        return data.records;
      }

      return [];
    } catch (err) {
      console.error('[useERPMigration] getSessionRecords error:', err);
      return [];
    }
  }, []);

  // === GET FISCAL RECONCILIATIONS ===
  const getFiscalReconciliations = useCallback(async (sessionId: string): Promise<ERPFiscalReconciliation[]> => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_fiscal_reconciliations')
        .select('*')
        .eq('session_id', sessionId);

      if (dbError) throw dbError;

      return (data || []) as unknown as ERPFiscalReconciliation[];
    } catch (err) {
      console.error('[useERPMigration] getFiscalReconciliations error:', err);
      return [];
    }
  }, []);

  // === EXPORT AUDIT REPORT ===
  const exportAuditReport = useCallback(async (
    sessionId: string,
    format: 'pdf' | 'xlsx' | 'json'
  ): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
        body: {
          action: 'export_audit_report',
          session_id: sessionId,
          format
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.download_url) {
        toast.success('Informe generado');
        return data.download_url;
      }

      return null;
    } catch (err) {
      console.error('[useERPMigration] exportAuditReport error:', err);
      toast.error('Error al generar informe');
      return null;
    }
  }, []);

  // === POLLING HELPERS ===
  const startProgressPolling = useCallback((sessionId: string) => {
    stopProgressPolling();
    
    pollingInterval.current = setInterval(async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('erp-migration-engine', {
          body: { action: 'get_progress', session_id: sessionId }
        });

        if (fnError) throw fnError;

        if (data?.success) {
          setProgress(data.progress || 0);
          
          if (data.session) {
            setSessions(prev => prev.map(s => 
              s.id === sessionId ? data.session : s
            ));
            
            if (data.session.status === 'completed' || data.session.status === 'failed') {
              stopProgressPolling();
              setIsRunning(false);
              
              if (data.session.status === 'completed') {
                toast.success('¡Migración completada!');
              } else {
                toast.error('Migración fallida');
              }
            }
          }
        }
      } catch (err) {
        console.error('[useERPMigration] polling error:', err);
      }
    }, 2000);
  }, []);

  const stopProgressPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // === INITIAL LOAD ===
  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopProgressPolling();
  }, [stopProgressPolling]);

  // === RETURN ===
  return {
    // State
    connectors,
    sessions,
    activeSession,
    records,
    chartMappings,
    fieldMappings,
    templates,
    validationRules,
    analysis,
    stats,
    isLoading,
    isAnalyzing,
    isRunning,
    error,
    progress,

    // Actions
    fetchConnectors,
    fetchSessions,
    fetchTemplates,
    fetchValidationRules,
    analyzeFile,
    createSession,
    updateChartMappings,
    updateFieldMappings,
    validateSession,
    runMigration,
    pauseMigration,
    resumeMigration,
    rollbackMigration,
    getSessionRecords,
    getFiscalReconciliations,
    exportAuditReport,
    setActiveSession,
    setAnalysis,
  };
}

export default useERPMigration;
