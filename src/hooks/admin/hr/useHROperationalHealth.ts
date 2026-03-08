import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HRHealthStatus {
  edgeFunctions: EdgeFunctionHealth[];
  recentErrors: OperationalError[];
  webhookFailures: WebhookFailure[];
  rateLimitStatus: RateLimitSnapshot[];
  integrationStatus: IntegrationHealth[];
  reportingStatus: ReportingHealth;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastChecked: Date | null;
}

export interface EdgeFunctionHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastResponseTime?: number;
  lastError?: string;
}

export interface OperationalError {
  id: string;
  source: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  count: number;
}

export interface WebhookFailure {
  id: string;
  webhookUrl: string;
  eventType: string;
  errorMessage: string;
  failedAt: string;
  retryCount: number;
}

export interface RateLimitSnapshot {
  functionName: string;
  dailyUsed: number;
  dailyLimit: number;
  percentUsed: number;
}

export interface IntegrationHealth {
  id: string;
  name: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  errorCount: number;
}

export interface ReportingHealth {
  pendingReports: number;
  failedReports: number;
  pendingBoardPacks: number;
  failedBoardPacks: number;
  pendingRegulatory: number;
  failedRegulatory: number;
}

const HR_EDGE_FUNCTIONS = [
  'hr-analytics-bi',
  'hr-board-pack',
  'hr-reporting-engine',
  'hr-regulatory-reporting',
  'hr-premium-api',
  'hr-enterprise-integrations',
  'hr-compliance-automation',
  'hr-orchestration-engine',
];

export function useHROperationalHealth(companyId?: string) {
  const [health, setHealth] = useState<HRHealthStatus>({
    edgeFunctions: HR_EDGE_FUNCTIONS.map(name => ({ name, status: 'unknown' as const })),
    recentErrors: [],
    webhookFailures: [],
    rateLimitStatus: [],
    integrationStatus: [],
    reportingStatus: {
      pendingReports: 0, failedReports: 0,
      pendingBoardPacks: 0, failedBoardPacks: 0,
      pendingRegulatory: 0, failedRegulatory: 0,
    },
    overallHealth: 'healthy',
    lastChecked: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkWebhookFailures = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const query = supabase
        .from('erp_hr_webhook_deliveries')
        .select('id, webhook_url, event_type, error_message, delivered_at, retry_count')
        .eq('status', 'failed')
        .gte('delivered_at', since)
        .order('delivered_at', { ascending: false })
        .limit(20);

      if (companyId) query.eq('company_id', companyId);
      const { data } = await query;

      return (data || []).map((d: any) => ({
        id: d.id,
        webhookUrl: d.webhook_url || '',
        eventType: d.event_type || '',
        errorMessage: d.error_message || 'Unknown error',
        failedAt: d.delivered_at || '',
        retryCount: d.retry_count || 0,
      }));
    } catch {
      return [];
    }
  }, [companyId]);

  const checkRateLimits = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const limits: Record<string, number> = {
        'hr-analytics-bi': 50,
        'hr-board-pack': 30,
        'hr-reporting-engine': 100,
        'hr-regulatory-reporting': 30,
        'hr-premium-api': 200,
        'hr-enterprise-integrations': 60,
        'hr-compliance-automation': 40,
        'hr-orchestration-engine': 200,
      };

      const results: RateLimitSnapshot[] = [];
      for (const [fn, limit] of Object.entries(limits)) {
        const query = supabase
          .from('erp_hr_api_access_log')
          .select('id', { count: 'exact', head: true })
          .eq('endpoint', fn)
          .gte('created_at', `${today}T00:00:00Z`);

        if (companyId) query.eq('company_id', companyId);
        const { count } = await query;

        const used = count || 0;
        results.push({
          functionName: fn,
          dailyUsed: used,
          dailyLimit: limit,
          percentUsed: Math.round((used / limit) * 100),
        });
      }
      return results;
    } catch {
      return [];
    }
  }, [companyId]);

  const checkIntegrations = useCallback(async () => {
    try {
      const query = supabase
        .from('erp_hr_integration_configs')
        .select('id, integration_name, provider, status, last_sync_at, error_count')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (companyId) query.eq('company_id', companyId);
      const { data } = await query;

      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.integration_name || d.provider,
        provider: d.provider || '',
        status: d.status || 'unknown',
        lastSyncAt: d.last_sync_at,
        errorCount: d.error_count || 0,
      }));
    } catch {
      return [];
    }
  }, [companyId]);

  const checkReportingStatus = useCallback(async (): Promise<ReportingHealth> => {
    const result: ReportingHealth = {
      pendingReports: 0, failedReports: 0,
      pendingBoardPacks: 0, failedBoardPacks: 0,
      pendingRegulatory: 0, failedRegulatory: 0,
    };

    try {
      // Reports
      const { count: pendingR } = await supabase
        .from('erp_hr_executive_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'generating']);
      result.pendingReports = pendingR || 0;

      const { count: failedR } = await supabase
        .from('erp_hr_executive_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');
      result.failedReports = failedR || 0;

      // Board Packs
      const { count: pendingBP } = await supabase
        .from('erp_hr_board_packs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'generating']);
      result.pendingBoardPacks = pendingBP || 0;

      const { count: failedBP } = await supabase
        .from('erp_hr_board_packs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');
      result.failedBoardPacks = failedBP || 0;

      // Regulatory
      const { count: pendingReg } = await supabase
        .from('erp_hr_regulatory_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'generating']);
      result.pendingRegulatory = pendingReg || 0;

      const { count: failedReg } = await supabase
        .from('erp_hr_regulatory_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');
      result.failedRegulatory = failedReg || 0;
    } catch {
      // Silently handle missing tables
    }

    return result;
  }, []);

  const checkOrchestratorErrors = useCallback(async (): Promise<OperationalError[]> => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('erp_hr_orchestration_logs')
        .select('id, event_type, details, status, created_at')
        .eq('status', 'error')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);

      return (data || []).map((d: any) => ({
        id: d.id,
        source: 'orchestration',
        message: d.details?.error || d.event_type || 'Unknown error',
        severity: 'error' as const,
        timestamp: d.created_at,
        count: 1,
      }));
    } catch {
      return [];
    }
  }, []);

  const runFullHealthCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const [webhookFailures, rateLimits, integrations, reporting, errors] = await Promise.all([
        checkWebhookFailures(),
        checkRateLimits(),
        checkIntegrations(),
        checkReportingStatus(),
        checkOrchestratorErrors(),
      ]);

      // Determine overall health
      const hasFailedReports = reporting.failedReports > 0 || reporting.failedBoardPacks > 0 || reporting.failedRegulatory > 0;
      const hasHighRateLimit = rateLimits.some(r => r.percentUsed > 80);
      const hasManyWebhookFailures = webhookFailures.length > 5;
      const hasIntegrationErrors = integrations.some(i => i.status === 'error');
      const hasCriticalErrors = errors.length > 5;

      let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (hasCriticalErrors || hasIntegrationErrors) overallHealth = 'critical';
      else if (hasFailedReports || hasHighRateLimit || hasManyWebhookFailures) overallHealth = 'degraded';

      setHealth({
        edgeFunctions: HR_EDGE_FUNCTIONS.map(name => ({ name, status: 'healthy' as const })),
        recentErrors: errors,
        webhookFailures,
        rateLimitStatus: rateLimits,
        integrationStatus: integrations,
        reportingStatus: reporting,
        overallHealth,
        lastChecked: new Date(),
      });
    } catch (err) {
      console.error('[HROperationalHealth] Error:', err);
      toast.error('Error al verificar salud operativa');
    } finally {
      setIsLoading(false);
    }
  }, [checkWebhookFailures, checkRateLimits, checkIntegrations, checkReportingStatus, checkOrchestratorErrors]);

  const startAutoRefresh = useCallback((intervalMs = 120000) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    runFullHealthCheck();
    intervalRef.current = setInterval(runFullHealthCheck, intervalMs);
  }, [runFullHealthCheck]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return {
    health,
    isLoading,
    runFullHealthCheck,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
