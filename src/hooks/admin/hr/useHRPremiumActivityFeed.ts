/**
 * useHRPremiumActivityFeed — P9.9 Premium Activity Feed
 * Aggregates recent activity from all 8 Premium HR modules into a unified timeline.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityModule = 
  | 'security' | 'ai_governance' | 'workforce' 
  | 'fairness' | 'twin' | 'legal' | 'cnae' | 'role_experience';

export interface ActivityEntry {
  id: string;
  module: ActivityModule;
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface TableFeedConfig {
  module: ActivityModule;
  table: string;
  actionLabel: string;
  descriptionFn: (row: Record<string, unknown>) => string;
  timestampField?: string;
}

const MODULE_LABELS: Record<ActivityModule, string> = {
  security: 'Security & Data Masking',
  ai_governance: 'AI Governance',
  workforce: 'Workforce Planning',
  fairness: 'Fairness Engine',
  twin: 'Digital Twin',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
  role_experience: 'Role Experience',
};

const FEED_CONFIGS: TableFeedConfig[] = [
  {
    module: 'security', table: 'erp_hr_security_incidents',
    actionLabel: 'Incidencia de seguridad',
    descriptionFn: (r) => `${r.incident_type || 'Incidencia'}: ${r.description || r.title || 'Sin descripción'}`,
  },
  {
    module: 'security', table: 'erp_hr_data_access_log',
    actionLabel: 'Acceso a datos',
    descriptionFn: (r) => `Acceso ${r.access_type || ''} a ${r.resource_type || 'recurso'}`,
  },
  {
    module: 'ai_governance', table: 'erp_hr_ai_decisions',
    actionLabel: 'Decisión IA',
    descriptionFn: (r) => `Modelo ${r.model_id || 'IA'}: ${r.outcome || 'procesado'}`,
  },
  {
    module: 'ai_governance', table: 'erp_hr_ai_bias_audits',
    actionLabel: 'Auditoría de sesgo',
    descriptionFn: (r) => `Auditoría de sesgo — resultado: ${r.result || r.status || 'completado'}`,
  },
  {
    module: 'workforce', table: 'erp_hr_workforce_plans',
    actionLabel: 'Plan de workforce',
    descriptionFn: (r) => `Plan "${r.name || r.title || 'Sin nombre'}" — ${r.status || 'creado'}`,
  },
  {
    module: 'workforce', table: 'erp_hr_scenarios',
    actionLabel: 'Escenario simulado',
    descriptionFn: (r) => `Escenario "${r.name || r.title || ''}" — ${r.scenario_type || 'análisis'}`,
  },
  {
    module: 'fairness', table: 'erp_hr_justice_cases',
    actionLabel: 'Caso de equidad',
    descriptionFn: (r) => `Caso "${r.title || r.case_type || 'equidad'}" — ${r.status || 'abierto'}`,
  },
  {
    module: 'fairness', table: 'erp_hr_equity_analyses',
    actionLabel: 'Análisis de equidad',
    descriptionFn: (r) => `Análisis ${r.analysis_type || 'salarial'} — score: ${r.equity_score ?? 'N/A'}`,
  },
  {
    module: 'twin', table: 'erp_hr_twin_snapshots',
    actionLabel: 'Snapshot Digital Twin',
    descriptionFn: (r) => `Snapshot organizacional — ${r.snapshot_type || 'completo'}`,
  },
  {
    module: 'twin', table: 'erp_hr_twin_alerts',
    actionLabel: 'Alerta Digital Twin',
    descriptionFn: (r) => `Alerta: ${r.alert_type || r.title || 'divergencia detectada'}`,
  },
  {
    module: 'legal', table: 'erp_hr_legal_contracts',
    actionLabel: 'Contrato legal',
    descriptionFn: (r) => `Contrato "${r.title || r.contract_type || ''}" — ${r.status || 'generado'}`,
  },
  {
    module: 'legal', table: 'erp_hr_legal_clause_library',
    actionLabel: 'Cláusula legal',
    descriptionFn: (r) => `Cláusula "${r.name || r.title || ''}" añadida a la biblioteca`,
  },
  {
    module: 'cnae', table: 'erp_hr_cnae_profiles',
    actionLabel: 'Perfil CNAE',
    descriptionFn: (r) => `Perfil sectorial ${r.cnae_code || ''} — ${r.sector_name || 'configurado'}`,
  },
  {
    module: 'cnae', table: 'erp_hr_cnae_risk_assessments',
    actionLabel: 'Evaluación riesgo CNAE',
    descriptionFn: (r) => `Riesgo ${r.risk_level || 'evaluado'} — ${r.risk_category || 'sectorial'}`,
  },
  {
    module: 'role_experience', table: 'erp_hr_role_dashboards',
    actionLabel: 'Dashboard de rol',
    descriptionFn: (r) => `Dashboard para rol "${r.role_name || r.role_type || ''}" configurado`,
  },
];

const LIMIT_PER_TABLE = 3;

export function useHRPremiumActivityFeed(companyId?: string) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const results: ActivityEntry[] = [];

      const promises = FEED_CONFIGS.map(async (cfg) => {
        try {
          const tsField = cfg.timestampField || 'created_at';
          const { data } = await supabase
            .from(cfg.table as any)
            .select('*')
            .eq('company_id', companyId)
            .order(tsField, { ascending: false })
            .limit(LIMIT_PER_TABLE);

          if (data && data.length > 0) {
            for (const row of data) {
              const r = row as unknown as Record<string, unknown>;
              results.push({
                id: `${cfg.table}-${r.id || Math.random()}`,
                module: cfg.module,
                action: cfg.actionLabel,
                description: cfg.descriptionFn(r),
                timestamp: (r[tsField] as string) || new Date().toISOString(),
                metadata: { table: cfg.table },
              });
            }
          }
        } catch {
          // Table may not exist — skip
        }
      });

      await Promise.all(promises);

      // Sort by timestamp desc
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEntries(results.slice(0, 50));
      setLastFetch(new Date());
    } catch (err) {
      console.error('[useHRPremiumActivityFeed] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (companyId) {
      fetchFeed();
      intervalRef.current = setInterval(fetchFeed, 120000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFeed, companyId]);

  return {
    entries,
    isLoading,
    lastFetch,
    fetchFeed,
    moduleLabels: MODULE_LABELS,
  };
}

export default useHRPremiumActivityFeed;
