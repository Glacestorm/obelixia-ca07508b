/**
 * useGaliaSmartAudit - Auditoría Inteligente con IA
 * Fase 7: Excelencia Operacional
 * Detecta anomalías, genera informes de auditoría y recomienda correcciones
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditFinding {
  id: string;
  expedienteId: string;
  findingType: 'anomaly' | 'inconsistency' | 'missing_data' | 'compliance_gap' | 'duplicate';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  affectedFields: string[];
  suggestedAction: string;
  autoFixAvailable: boolean;
  confidence: number;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AuditReport {
  id: string;
  reportType: 'periodic' | 'on_demand' | 'compliance' | 'risk';
  period: { start: string; end: string };
  generatedAt: string;
  summary: {
    totalExpedientes: number;
    audited: number;
    findingsCount: number;
    criticalFindings: number;
    resolvedFindings: number;
    complianceScore: number;
  };
  findings: AuditFinding[];
  recommendations: string[];
  riskAreas: Array<{ area: string; riskLevel: string; description: string }>;
}

export interface AnomalyPattern {
  patternId: string;
  patternName: string;
  description: string;
  occurrences: number;
  affectedExpedientes: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  lastDetected: string;
}

export interface SmartAuditStats {
  totalAudits: number;
  findingsResolved: number;
  averageResolutionTime: number;
  complianceImprovement: number;
  anomaliesDetected: number;
  autoFixesApplied: number;
}

export function useGaliaSmartAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [patterns, setPatterns] = useState<AnomalyPattern[]>([]);
  const [stats, setStats] = useState<SmartAuditStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run smart audit on expedientes
  const runSmartAudit = useCallback(async (params: {
    expedienteIds?: string[];
    convocatoriaId?: string;
    auditType?: 'full' | 'quick' | 'compliance' | 'financial';
    dateRange?: { start: string; end: string };
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: {
          action: 'run_audit',
          params
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setFindings(data.findings || []);
        toast.success(`Auditoría completada: ${data.findings?.length || 0} hallazgos`);
        return data;
      }

      throw new Error(data?.error || 'Error en auditoría');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al ejecutar auditoría');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Detect anomalies using ML patterns
  const detectAnomalies = useCallback(async (expedienteId?: string) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: {
          action: 'detect_anomalies',
          expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPatterns(data.patterns || []);
        return data.patterns;
      }

      return [];
    } catch (err) {
      console.error('[SmartAudit] Anomaly detection error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate audit report
  const generateReport = useCallback(async (params: {
    reportType: 'periodic' | 'on_demand' | 'compliance' | 'risk';
    period: { start: string; end: string };
    includeRecommendations?: boolean;
  }) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: {
          action: 'generate_report',
          params
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data.report) {
        setReports(prev => [data.report, ...prev]);
        toast.success('Informe de auditoría generado');
        return data.report as AuditReport;
      }

      return null;
    } catch (err) {
      toast.error('Error al generar informe');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply auto-fix for a finding
  const applyAutoFix = useCallback(async (findingId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: {
          action: 'apply_autofix',
          findingId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setFindings(prev => prev.map(f => 
          f.id === findingId 
            ? { ...f, resolvedAt: new Date().toISOString() }
            : f
        ));
        toast.success('Corrección automática aplicada');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al aplicar corrección');
      return false;
    }
  }, []);

  // Resolve finding manually
  const resolveFinding = useCallback(async (findingId: string, resolution: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: {
          action: 'resolve_finding',
          findingId,
          resolution
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setFindings(prev => prev.filter(f => f.id !== findingId));
        toast.success('Hallazgo resuelto');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al resolver hallazgo');
      return false;
    }
  }, []);

  // Get audit statistics
  const getStats = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-smart-audit', {
        body: { action: 'get_stats' }
      });

      if (fnError) throw fnError;

      if (data?.success && data.stats) {
        setStats(data.stats);
        return data.stats as SmartAuditStats;
      }

      return null;
    } catch (err) {
      console.error('[SmartAudit] Stats error:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    findings,
    reports,
    patterns,
    stats,
    error,
    runSmartAudit,
    detectAnomalies,
    generateReport,
    applyAutoFix,
    resolveFinding,
    getStats
  };
}

export default useGaliaSmartAudit;
