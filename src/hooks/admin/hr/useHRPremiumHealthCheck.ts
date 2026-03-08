/**
 * useHRPremiumHealthCheck — P9.11 Premium Health Check
 * Runs integrity diagnostics across all 8 Premium HR modules.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'pending';
export type PremiumModule = 'security' | 'ai_governance' | 'workforce' | 'fairness' | 'twin' | 'legal' | 'cnae' | 'role_experience';

export interface HealthCheckItem {
  id: string;
  module: PremiumModule;
  label: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  recordCount?: number;
}

export interface HealthCheckSummary {
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  score: number; // 0-100
}

interface TableCheck {
  module: PremiumModule;
  table: string;
  label: string;
  description: string;
  minExpected?: number; // warn if below
}

const TABLE_CHECKS: TableCheck[] = [
  // P1 Security
  { module: 'security', table: 'erp_hr_masking_rules', label: 'Reglas de enmascaramiento', description: 'Reglas de data masking configuradas', minExpected: 1 },
  { module: 'security', table: 'erp_hr_sod_rules', label: 'Reglas SoD', description: 'Segregación de funciones definida', minExpected: 1 },
  { module: 'security', table: 'erp_hr_security_incidents', label: 'Registro de incidencias', description: 'Tabla de incidencias de seguridad operativa' },
  // P2 AI Governance
  { module: 'ai_governance', table: 'erp_hr_ai_model_registry', label: 'Registro de modelos IA', description: 'Modelos de IA registrados y gobernados', minExpected: 1 },
  { module: 'ai_governance', table: 'erp_hr_ai_decisions', label: 'Decisiones IA', description: 'Log de decisiones automatizadas' },
  { module: 'ai_governance', table: 'erp_hr_ai_bias_audits', label: 'Auditorías de sesgo', description: 'Auditorías de sesgo algorítmico' },
  // P3 Workforce
  { module: 'workforce', table: 'erp_hr_workforce_plans', label: 'Planes de workforce', description: 'Planes estratégicos de fuerza laboral', minExpected: 1 },
  { module: 'workforce', table: 'erp_hr_workforce_scenarios', label: 'Escenarios', description: 'Escenarios de simulación' },
  // P4 Fairness
  { module: 'fairness', table: 'erp_hr_justice_cases', label: 'Casos de justicia', description: 'Casos del motor de equidad' },
  { module: 'fairness', table: 'erp_hr_equity_analyses', label: 'Análisis de equidad', description: 'Análisis salariales y de equidad' },
  { module: 'fairness', table: 'erp_hr_pay_equity_rules', label: 'Reglas pay equity', description: 'Reglas de equidad salarial configuradas', minExpected: 1 },
  // P5 Twin
  { module: 'twin', table: 'erp_hr_twin_snapshots', label: 'Snapshots Twin', description: 'Snapshots del gemelo digital' },
  { module: 'twin', table: 'erp_hr_twin_alerts', label: 'Alertas Twin', description: 'Alertas de divergencia organizacional' },
  { module: 'twin', table: 'erp_hr_twin_experiments', label: 'Experimentos Twin', description: 'Experimentos what-if del gemelo' },
  // P6 Legal
  { module: 'legal', table: 'erp_hr_legal_contracts', label: 'Contratos legales', description: 'Contratos generados por el motor legal' },
  { module: 'legal', table: 'erp_hr_legal_clause_library', label: 'Biblioteca de cláusulas', description: 'Cláusulas legales reutilizables', minExpected: 1 },
  { module: 'legal', table: 'erp_hr_legal_templates', label: 'Plantillas legales', description: 'Plantillas de documentos legales', minExpected: 1 },
  // P7 CNAE
  { module: 'cnae', table: 'erp_hr_cnae_profiles', label: 'Perfiles CNAE', description: 'Perfiles sectoriales configurados', minExpected: 1 },
  { module: 'cnae', table: 'erp_hr_cnae_risk_assessments', label: 'Evaluaciones riesgo', description: 'Evaluaciones de riesgo sectorial' },
  { module: 'cnae', table: 'erp_hr_cnae_benchmarks', label: 'Benchmarks CNAE', description: 'Benchmarks sectoriales' },
  // P8 Role Experience
  { module: 'role_experience', table: 'erp_hr_role_dashboards', label: 'Dashboards de rol', description: 'Configuraciones de dashboard por rol', minExpected: 1 },
  { module: 'role_experience', table: 'erp_hr_role_widgets', label: 'Widgets de rol', description: 'Widgets personalizados por rol' },
];

const MODULE_LABELS: Record<PremiumModule, string> = {
  security: 'Security & Data Masking',
  ai_governance: 'AI Governance',
  workforce: 'Workforce Planning',
  fairness: 'Fairness Engine',
  twin: 'Digital Twin',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
  role_experience: 'Role Experience',
};

export function useHRPremiumHealthCheck(companyId?: string) {
  const [checks, setChecks] = useState<HealthCheckItem[]>([]);
  const [summary, setSummary] = useState<HealthCheckSummary>({ totalChecks: 0, passed: 0, warnings: 0, failures: 0, score: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runHealthCheck = useCallback(async () => {
    if (!companyId) return;
    setIsRunning(true);

    // Initialize all as pending
    const pending: HealthCheckItem[] = TABLE_CHECKS.map(tc => ({
      id: `${tc.module}-${tc.table}`,
      module: tc.module,
      label: tc.label,
      description: tc.description,
      status: 'pending' as CheckStatus,
    }));
    setChecks([...pending]);

    const results: HealthCheckItem[] = [];

    const promises = TABLE_CHECKS.map(async (tc, idx) => {
      try {
        const { count, error } = await supabase
          .from(tc.table as any)
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);

        const n = count || 0;
        let status: CheckStatus = 'pass';
        let detail = `${n} registro(s) encontrado(s)`;

        if (error) {
          status = 'fail';
          detail = `Error: ${error.message}`;
        } else if (tc.minExpected && n < tc.minExpected) {
          status = 'warn';
          detail = `Se esperan al menos ${tc.minExpected} registro(s), encontrado(s): ${n}`;
        } else if (n === 0) {
          status = 'warn';
          detail = 'Sin datos — módulo no inicializado o sin actividad';
        }

        results[idx] = {
          id: `${tc.module}-${tc.table}`,
          module: tc.module,
          label: tc.label,
          description: tc.description,
          status,
          detail,
          recordCount: n,
        };
      } catch {
        results[idx] = {
          id: `${tc.module}-${tc.table}`,
          module: tc.module,
          label: tc.label,
          description: tc.description,
          status: 'fail',
          detail: 'Tabla no accesible',
          recordCount: 0,
        };
      }
    });

    await Promise.all(promises);

    // Fill any gaps
    const finalResults = TABLE_CHECKS.map((tc, idx) => results[idx] || {
      id: `${tc.module}-${tc.table}`,
      module: tc.module,
      label: tc.label,
      description: tc.description,
      status: 'fail' as CheckStatus,
      detail: 'Check no completado',
    });

    setChecks(finalResults);

    // Compute summary
    const passed = finalResults.filter(c => c.status === 'pass').length;
    const warnings = finalResults.filter(c => c.status === 'warn').length;
    const failures = finalResults.filter(c => c.status === 'fail').length;
    const total = finalResults.length;
    const score = total > 0 ? Math.round(((passed + warnings * 0.5) / total) * 100) : 0;

    setSummary({ totalChecks: total, passed, warnings, failures, score });
    setLastRun(new Date());
    setIsRunning(false);
  }, [companyId]);

  return {
    checks,
    summary,
    isRunning,
    lastRun,
    runHealthCheck,
    moduleLabels: MODULE_LABELS,
  };
}

export default useHRPremiumHealthCheck;
