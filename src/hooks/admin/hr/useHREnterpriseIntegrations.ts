/**
 * useHREnterpriseIntegrations - Hook for Enterprise External Integrations Wave 1
 * BI Export, DMS Archival, E-Sign Flows
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ========== TYPES ==========

export interface EnterpriseConnector {
  id: string;
  connector_type: 'bi_export' | 'dms' | 'esign';
  name: string;
  provider: string;
  auth_type: string;
  is_active: boolean;
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown';
  config: Record<string, unknown>;
  last_health_check_at: string | null;
  created_at: string;
}

export interface BIDataset {
  id: string;
  name: string;
  dataset_type: string;
  refresh_frequency: string;
  export_format: string;
  row_count: number;
  last_exported_at: string | null;
  is_active: boolean;
  schema_definition: { fields?: Array<{ name: string; type: string; description: string }> };
}

export interface DMSArchive {
  id: string;
  source_type: string;
  source_name: string;
  source_id: string;
  remote_path: string | null;
  archive_status: 'pending' | 'uploading' | 'archived' | 'failed';
  file_size_bytes: number | null;
  mime_type: string;
  archived_at: string | null;
  retry_count: number;
  created_at: string;
}

export interface ESignEnvelope {
  id: string;
  document_type: string;
  document_name: string;
  document_id: string;
  envelope_status: 'draft' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided' | 'expired';
  remote_envelope_id: string | null;
  signers: Array<{ name: string; email: string; role: string; status: string; signed_at: string | null }>;
  expiration_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface IntegrationLogEntry {
  id: string;
  integration_type: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface IntegrationLogSummary {
  total: number;
  success: number;
  errors: number;
  warnings: number;
}

// ========== HOOK ==========

export function useHREnterpriseIntegrations(companyId?: string) {
  const [connectors, setConnectors] = useState<EnterpriseConnector[]>([]);
  const [biDatasets, setBIDatasets] = useState<BIDataset[]>([]);
  const [dmsArchives, setDMSArchives] = useState<DMSArchive[]>([]);
  const [esignEnvelopes, setESignEnvelopes] = useState<ESignEnvelope[]>([]);
  const [logs, setLogs] = useState<IntegrationLogEntry[]>([]);
  const [logSummary, setLogSummary] = useState<IntegrationLogSummary>({ total: 0, success: 0, errors: 0, warnings: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    if (!companyId) return null;
    try {
      const { data, error: fnError } = await supabase.functions.invoke('hr-enterprise-integrations', {
        body: { action, companyId, params }
      });
      if (fnError) throw fnError;
      if (data?.success) return data.data;
      throw new Error(data?.error || 'Unknown error');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[useHREnterpriseIntegrations] ${action} error:`, err);
      throw new Error(msg);
    }
  }, [companyId]);

  // ========== CONNECTORS ==========
  const fetchConnectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke('list_connectors');
      setConnectors(result?.connectors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [invoke]);

  const healthCheck = useCallback(async () => {
    try {
      const result = await invoke('health_check', { connectorIds: connectors.map(c => c.id) });
      toast.success('Health check completado');
      return result?.results || [];
    } catch {
      toast.error('Error en health check');
      return [];
    }
  }, [invoke, connectors]);

  // ========== BI ==========
  const fetchBIDatasets = useCallback(async () => {
    try {
      const result = await invoke('list_bi_datasets');
      setBIDatasets(result?.datasets || []);
    } catch (err) {
      console.error('fetchBIDatasets error:', err);
    }
  }, [invoke]);

  const exportBIDataset = useCallback(async (datasetId: string, format?: string) => {
    try {
      const result = await invoke('export_bi_dataset', { datasetId, format });
      toast.success(`Dataset exportado: ${result?.export?.rows_exported || 0} filas`);
      return result?.export;
    } catch {
      toast.error('Error al exportar dataset');
      return null;
    }
  }, [invoke]);

  // ========== DMS ==========
  const fetchDMSArchives = useCallback(async () => {
    try {
      const result = await invoke('list_dms_archives');
      setDMSArchives(result?.archives || []);
    } catch (err) {
      console.error('fetchDMSArchives error:', err);
    }
  }, [invoke]);

  const archiveDocument = useCallback(async (sourceType: string, sourceId: string, sourceName: string) => {
    try {
      const result = await invoke('archive_document', { sourceType, sourceId, sourceName });
      toast.success('Documento archivado correctamente');
      await fetchDMSArchives();
      return result?.archive;
    } catch {
      toast.error('Error al archivar documento');
      return null;
    }
  }, [invoke, fetchDMSArchives]);

  // ========== E-SIGN ==========
  const fetchESignEnvelopes = useCallback(async () => {
    try {
      const result = await invoke('list_esign_envelopes');
      setESignEnvelopes(result?.envelopes || []);
    } catch (err) {
      console.error('fetchESignEnvelopes error:', err);
    }
  }, [invoke]);

  const createESignEnvelope = useCallback(async (documentType: string, documentId: string, documentName: string, signers: Array<{ name: string; email: string; role: string }>) => {
    try {
      const result = await invoke('create_esign_envelope', { documentType, documentId, documentName, signers });
      toast.success('Envelope de firma creado');
      await fetchESignEnvelopes();
      return result?.envelope;
    } catch {
      toast.error('Error al crear envelope');
      return null;
    }
  }, [invoke, fetchESignEnvelopes]);

  // ========== LOGS ==========
  const fetchLogs = useCallback(async (filters?: { type?: string; status?: string }) => {
    try {
      const result = await invoke('list_integration_logs', filters);
      setLogs(result?.logs || []);
      setLogSummary(result?.summary || { total: 0, success: 0, errors: 0, warnings: 0 });
    } catch (err) {
      console.error('fetchLogs error:', err);
    }
  }, [invoke]);

  // ========== LOAD ALL ==========
  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      await Promise.all([
        fetchConnectors(),
        fetchBIDatasets(),
        fetchDMSArchives(),
        fetchESignEnvelopes(),
        fetchLogs(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, fetchConnectors, fetchBIDatasets, fetchDMSArchives, fetchESignEnvelopes, fetchLogs]);

  // ========== AUTO-REFRESH ==========
  const startAutoRefresh = useCallback((intervalMs = 120000) => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(loadAll, intervalMs);
  }, [loadAll]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return {
    connectors, biDatasets, dmsArchives, esignEnvelopes,
    logs, logSummary, isLoading, error,
    fetchConnectors, healthCheck,
    fetchBIDatasets, exportBIDataset,
    fetchDMSArchives, archiveDocument,
    fetchESignEnvelopes, createESignEnvelope,
    fetchLogs, loadAll,
    startAutoRefresh, stopAutoRefresh,
  };
}

export default useHREnterpriseIntegrations;
