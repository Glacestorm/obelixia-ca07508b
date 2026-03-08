/**
 * useHRPremiumExport — P9.12 Premium Export & Report Generator
 * Exports data from Premium HR modules as JSON or CSV.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ExportFormat = 'json' | 'csv';
export type PremiumModuleKey =
  | 'security' | 'ai_governance' | 'workforce' | 'fairness'
  | 'twin' | 'legal' | 'cnae' | 'role_experience';

interface ExportableTable {
  module: PremiumModuleKey;
  table: string;
  label: string;
}

const EXPORTABLE_TABLES: ExportableTable[] = [
  { module: 'security', table: 'erp_hr_masking_rules', label: 'Reglas de enmascaramiento' },
  { module: 'security', table: 'erp_hr_sod_rules', label: 'Reglas SoD' },
  { module: 'security', table: 'erp_hr_security_incidents', label: 'Incidencias de seguridad' },
  { module: 'security', table: 'erp_hr_data_access_log', label: 'Log de acceso a datos' },
  { module: 'ai_governance', table: 'erp_hr_ai_model_registry', label: 'Registro de modelos IA' },
  { module: 'ai_governance', table: 'erp_hr_ai_decisions', label: 'Decisiones IA' },
  { module: 'ai_governance', table: 'erp_hr_ai_bias_audits', label: 'Auditorías de sesgo' },
  { module: 'workforce', table: 'erp_hr_workforce_plans', label: 'Planes de workforce' },
  { module: 'workforce', table: 'erp_hr_workforce_scenarios', label: 'Escenarios' },
  { module: 'fairness', table: 'erp_hr_justice_cases', label: 'Casos de justicia' },
  { module: 'fairness', table: 'erp_hr_equity_analyses', label: 'Análisis de equidad' },
  { module: 'fairness', table: 'erp_hr_pay_equity_rules', label: 'Reglas pay equity' },
  { module: 'twin', table: 'erp_hr_twin_snapshots', label: 'Snapshots Twin' },
  { module: 'twin', table: 'erp_hr_twin_alerts', label: 'Alertas Twin' },
  { module: 'twin', table: 'erp_hr_twin_experiments', label: 'Experimentos Twin' },
  { module: 'legal', table: 'erp_hr_legal_contracts', label: 'Contratos legales' },
  { module: 'legal', table: 'erp_hr_legal_clause_library', label: 'Biblioteca de cláusulas' },
  { module: 'legal', table: 'erp_hr_legal_templates', label: 'Plantillas legales' },
  { module: 'cnae', table: 'erp_hr_cnae_profiles', label: 'Perfiles CNAE' },
  { module: 'cnae', table: 'erp_hr_cnae_risk_assessments', label: 'Evaluaciones de riesgo' },
  { module: 'cnae', table: 'erp_hr_cnae_benchmarks', label: 'Benchmarks CNAE' },
  { module: 'role_experience', table: 'erp_hr_role_dashboards', label: 'Dashboards de rol' },
  { module: 'role_experience', table: 'erp_hr_role_widgets', label: 'Widgets de rol' },
];

const MODULE_LABELS: Record<PremiumModuleKey, string> = {
  security: 'Security & Data Masking',
  ai_governance: 'AI Governance',
  workforce: 'Workforce Planning',
  fairness: 'Fairness Engine',
  twin: 'Digital Twin',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
  role_experience: 'Role Experience',
};

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useHRPremiumExport(companyId?: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const getTablesForModule = useCallback((module: PremiumModuleKey) => {
    return EXPORTABLE_TABLES.filter(t => t.module === module);
  }, []);

  const exportModule = useCallback(async (module: PremiumModuleKey, format: ExportFormat) => {
    if (!companyId) {
      toast.error('Selecciona una empresa primero');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const tables = getTablesForModule(module);
      const allData: Record<string, unknown[]> = {};
      let completed = 0;

      for (const t of tables) {
        try {
          const { data } = await supabase
            .from(t.table as any)
            .select('*')
            .eq('company_id', companyId)
            .limit(1000);

          allData[t.label] = (data as unknown as Record<string, unknown>[]) || [];
        } catch {
          allData[t.label] = [];
        }
        completed++;
        setProgress(Math.round((completed / tables.length) * 100));
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `premium-hr-${module}-${timestamp}`;

      if (format === 'json') {
        downloadFile(JSON.stringify(allData, null, 2), `${filename}.json`, 'application/json');
      } else {
        // CSV: concatenate all tables with headers
        let csv = '';
        for (const [label, rows] of Object.entries(allData)) {
          if ((rows as Record<string, unknown>[]).length > 0) {
            csv += `\n### ${label} ###\n`;
            csv += toCSV(rows as Record<string, unknown>[]);
            csv += '\n';
          }
        }
        downloadFile(csv, `${filename}.csv`, 'text/csv');
      }

      const totalRecords = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);
      toast.success(`Exportado: ${totalRecords} registros de ${MODULE_LABELS[module]}`);
    } catch (err) {
      console.error('[useHRPremiumExport] Error:', err);
      toast.error('Error al exportar datos');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [companyId, getTablesForModule]);

  const exportAll = useCallback(async (format: ExportFormat) => {
    if (!companyId) {
      toast.error('Selecciona una empresa primero');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const allData: Record<string, unknown[]> = {};
      let completed = 0;

      for (const t of EXPORTABLE_TABLES) {
        try {
          const { data } = await supabase
            .from(t.table as any)
            .select('*')
            .eq('company_id', companyId)
            .limit(1000);

          allData[`${MODULE_LABELS[t.module]} — ${t.label}`] = (data as unknown as Record<string, unknown>[]) || [];
        } catch {
          allData[`${MODULE_LABELS[t.module]} — ${t.label}`] = [];
        }
        completed++;
        setProgress(Math.round((completed / EXPORTABLE_TABLES.length) * 100));
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `premium-hr-full-export-${timestamp}`;

      if (format === 'json') {
        downloadFile(JSON.stringify(allData, null, 2), `${filename}.json`, 'application/json');
      } else {
        let csv = '';
        for (const [label, rows] of Object.entries(allData)) {
          if ((rows as Record<string, unknown>[]).length > 0) {
            csv += `\n### ${label} ###\n`;
            csv += toCSV(rows as Record<string, unknown>[]);
            csv += '\n';
          }
        }
        downloadFile(csv, `${filename}.csv`, 'text/csv');
      }

      const totalRecords = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);
      toast.success(`Exportación completa: ${totalRecords} registros totales`);
    } catch (err) {
      console.error('[useHRPremiumExport] Error:', err);
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [companyId]);

  return {
    isExporting,
    progress,
    exportModule,
    exportAll,
    moduleLabels: MODULE_LABELS,
    getTablesForModule,
    allModules: Object.keys(MODULE_LABELS) as PremiumModuleKey[],
  };
}

export default useHRPremiumExport;
