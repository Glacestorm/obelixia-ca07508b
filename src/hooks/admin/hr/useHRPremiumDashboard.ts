/**
 * useHRPremiumDashboard — P9.7 Premium Executive Dashboard
 * Aggregates KPIs from all 8 Premium HR phases into unified metrics.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumModuleStatus {
  id: string;
  label: string;
  phase: string;
  table: string;
  count: number;
  lastActivity: string | null;
  health: 'healthy' | 'warning' | 'critical' | 'inactive';
}

export interface PremiumKPI {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  delta?: string;
  icon?: string;
}

export interface PremiumDashboardData {
  modules: PremiumModuleStatus[];
  totalRecords: number;
  activeModules: number;
  healthScore: number;
  kpis: PremiumKPI[];
  lastRefresh: Date | null;
}

const PREMIUM_MODULES = [
  { id: 'p1', label: 'Security & Data Masking', phase: 'P1', table: 'erp_hr_masking_rules' },
  { id: 'p2', label: 'AI Governance', phase: 'P2', table: 'erp_hr_ai_models' },
  { id: 'p3', label: 'Workforce Planning', phase: 'P3', table: 'erp_hr_workforce_plans' },
  { id: 'p4', label: 'Fairness Engine', phase: 'P4', table: 'erp_hr_pay_equity_analyses' },
  { id: 'p5', label: 'Digital Twin', phase: 'P5', table: 'erp_hr_twin_instances' },
  { id: 'p6', label: 'Legal Engine', phase: 'P6', table: 'erp_hr_legal_templates' },
  { id: 'p7', label: 'CNAE Intelligence', phase: 'P7', table: 'erp_hr_cnae_sector_profiles' },
  { id: 'p8', label: 'Role Experience', phase: 'P8', table: 'erp_hr_role_experience_profiles' },
];

export function useHRPremiumDashboard(companyId?: string) {
  const [data, setData] = useState<PremiumDashboardData>({
    modules: [],
    totalRecords: 0,
    activeModules: 0,
    healthScore: 0,
    kpis: [],
    lastRefresh: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);

    try {
      // Parallel count queries for all premium tables
      const countPromises = PREMIUM_MODULES.map(async (mod) => {
        try {
          const { count, error: qErr } = await supabase
            .from(mod.table as any)
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId);

          if (qErr) return { ...mod, count: 0, lastActivity: null, health: 'inactive' as const };

          // Get last activity
          const { data: lastRow } = await supabase
            .from(mod.table as any)
            .select('created_at')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const recordCount = count || 0;
          const health: PremiumModuleStatus['health'] = 
            recordCount === 0 ? 'inactive' :
            recordCount < 3 ? 'warning' : 'healthy';

          return {
            ...mod,
            count: recordCount,
            lastActivity: (lastRow as any)?.created_at || null,
            health,
          };
        } catch {
          return { ...mod, count: 0, lastActivity: null, health: 'inactive' as const };
        }
      });

      const modules = await Promise.all(countPromises);
      const totalRecords = modules.reduce((sum, m) => sum + m.count, 0);
      const activeModules = modules.filter(m => m.count > 0).length;
      const healthScore = PREMIUM_MODULES.length > 0 
        ? Math.round((activeModules / PREMIUM_MODULES.length) * 100)
        : 0;

      // Build KPIs
      const securityRules = modules.find(m => m.id === 'p1')?.count || 0;
      const aiModels = modules.find(m => m.id === 'p2')?.count || 0;
      const fairnessAnalyses = modules.find(m => m.id === 'p4')?.count || 0;
      const legalTemplates = modules.find(m => m.id === 'p6')?.count || 0;

      // Fetch additional KPI data
      let openIncidents = 0;
      let pendingPlans = 0;

      try {
        const { count: incCount } = await supabase
          .from('erp_hr_security_incidents' as any)
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'open');
        openIncidents = incCount || 0;
      } catch { /* table may not exist */ }

      try {
        const { count: planCount } = await supabase
          .from('erp_hr_workforce_plans' as any)
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'draft');
        pendingPlans = planCount || 0;
      } catch { /* table may not exist */ }

      const kpis: PremiumKPI[] = [
        { label: 'Módulos Activos', value: `${activeModules}/8`, trend: activeModules >= 6 ? 'up' : 'stable' },
        { label: 'Registros Totales', value: totalRecords, trend: 'up' },
        { label: 'Reglas Seguridad', value: securityRules, trend: 'stable' },
        { label: 'Modelos IA', value: aiModels, trend: 'stable' },
        { label: 'Análisis Equidad', value: fairnessAnalyses, trend: 'up' },
        { label: 'Plantillas Legales', value: legalTemplates, trend: 'stable' },
        { label: 'Incidencias Abiertas', value: openIncidents, trend: openIncidents > 0 ? 'down' : 'stable' },
        { label: 'Planes Pendientes', value: pendingPlans, trend: 'stable' },
      ];

      setData({
        modules,
        totalRecords,
        activeModules,
        healthScore,
        kpis,
        lastRefresh: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando dashboard premium');
      console.error('[useHRPremiumDashboard] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (companyId) {
      fetchDashboard();
      intervalRef.current = setInterval(fetchDashboard, 120000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDashboard, companyId]);

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}

export default useHRPremiumDashboard;
