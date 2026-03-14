/**
 * ExportHubPanel — V2-ES.8 Tramo 7
 * Centralized export panel for readiness reports, dry-run diffs, and evidence packs.
 * Tab inside OfficialIntegrationsHub.
 *
 * DISCLAIMER: All exports are internal preparatory documents.
 * They do NOT constitute official submissions or validations.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Package,
  Gauge,
  FlaskConical,
  Info,
  Clock,
  GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfficialReadiness } from '@/hooks/erp/hr/useOfficialReadiness';
import { usePreparatorySubmissions } from '@/hooks/erp/hr/usePreparatorySubmissions';
import { useHRDomainCertificates } from '@/hooks/erp/hr/useHRDomainCertificates';
import { usePreRealApproval } from '@/hooks/erp/hr/usePreRealApproval';
import { useRegulatoryCalendar } from '@/hooks/erp/hr/useRegulatoryCalendar';
import { useMultiEntityReadiness } from '@/hooks/erp/hr/useMultiEntityReadiness';
import { useProactiveAlertSignals } from '@/hooks/erp/hr/useProactiveAlertSignals';
import { useDryRunPersistence } from '@/hooks/erp/hr/useDryRunPersistence';
import { useOfficialExport } from '@/hooks/erp/hr/useOfficialExport';
import { computeDryRunDiff } from '@/components/erp/hr/shared/dryRunDiffEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import type { SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';

const CONNECTOR_TO_DOMAIN: Record<string, SubmissionDomain> = {
  tgss_siltra: 'TGSS',
  contrata_sepe: 'CONTRATA',
  aeat_111: 'AEAT_111',
  aeat_190: 'AEAT_190',
  certifica2: 'CERTIFICA2',
  delta: 'DELTA',
};

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'Todos los dominios' },
  { value: 'TGSS', label: 'TGSS / SILTRA' },
  { value: 'CONTRATA', label: 'Contrat@ / SEPE' },
  { value: 'AEAT', label: 'AEAT' },
];

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
}

export function ExportHubPanel({ companyId, adapters }: Props) {
  const { summary } = useOfficialReadiness(companyId);
  const { submissions } = usePreparatorySubmissions(companyId);
  const { certificates } = useHRDomainCertificates(companyId);
  const { pendingCount, approvedCount: approvalApprovedCount, rejectedCount: approvalRejectedCount, approvals } = usePreRealApproval(companyId);
  const { calendar } = useRegulatoryCalendar(companyId);
  const { report: multiEntityReport } = useMultiEntityReadiness(companyId);
  const { results: dryRuns, evidence: dryRunEvidence, fetchResults, fetchEvidence } = useDryRunPersistence(companyId);
  const proactiveAlerts = useProactiveAlertSignals({
    readinessSummary: summary,
    calendar,
    certificates,
    submissions,
    approvals,
    enabled: !!summary,
  });
  const { isExporting, exportReadiness, exportDiff, exportEvidencePack, lastExport } = useOfficialExport(companyId);

  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  useEffect(() => { fetchResults({ limit: 50 }); }, [fetchResults]);

  // Load evidence for latest dry-runs
  useEffect(() => {
    if (dryRuns.length > 0) {
      fetchEvidence(dryRuns[0].id);
    }
  }, [dryRuns, fetchEvidence]);

  const domainStats = useMemo(() => {
    const stats: Record<string, { payloads: number; validated: number; dryRuns: number }> = {};
    for (const domain of Object.values(CONNECTOR_TO_DOMAIN)) {
      const domSubs = submissions.filter(s => s.submission_domain === domain);
      stats[domain] = {
        payloads: domSubs.filter(s => ['payload_generated', 'validated_internal', 'ready_for_dry_run', 'dry_run_executed'].includes(s.status)).length,
        validated: domSubs.filter(s => ['validated_internal', 'ready_for_dry_run', 'dry_run_executed'].includes(s.status)).length,
        dryRuns: domSubs.filter(s => s.status === 'dry_run_executed').length,
      };
    }
    return stats;
  }, [submissions]);

  const certData = useMemo(() => certificates.map(c => ({
    domain: c.domain,
    status: c.certificate_status,
    completeness: c.configuration_completeness,
    expirationDate: c.expiration_date,
  })), [certificates]);

  const alertData = useMemo(() =>
    proactiveAlerts.summary?.alerts.map(a => ({
      severity: a.severity, category: a.category, title: a.title, status: a.status,
    })) || []
  , [proactiveAlerts.summary]);

  // Can we generate a diff? (need ≥2 runs in same domain)
  const diffPair = useMemo(() => {
    if (dryRuns.length < 2) return null;
    // Find latest 2 runs in same domain
    const domainGroups: Record<string, typeof dryRuns> = {};
    for (const r of dryRuns) {
      const d = r.submission_domain;
      if (!domainGroups[d]) domainGroups[d] = [];
      domainGroups[d].push(r);
    }
    for (const group of Object.values(domainGroups)) {
      if (group.length >= 2) return { baseline: group[1], comparison: group[0] };
    }
    return null;
  }, [dryRuns]);

  const handleReadinessExport = useCallback((format: 'pdf' | 'excel') => {
    if (!summary) return;
    exportReadiness(format, summary, domainStats, {
      companyId,
      certificates: certData,
      approvals: { pending: pendingCount, approved: approvalApprovedCount, rejected: approvalRejectedCount },
      deadlines: calendar || undefined,
      alerts: alertData,
      multiEntity: multiEntityReport || undefined,
    });
  }, [summary, domainStats, companyId, certData, pendingCount, approvalApprovedCount, approvalRejectedCount, calendar, alertData, multiEntityReport, exportReadiness]);

  const handleDiffExport = useCallback((format: 'pdf' | 'excel') => {
    if (!diffPair) return;
    const diff = computeDryRunDiff(diffPair.baseline, diffPair.comparison);
    exportDiff(format, diff);
  }, [diffPair, exportDiff]);

  const handleEvidencePackExport = useCallback((format: 'pdf' | 'excel') => {
    exportEvidencePack(format, {
      companyId,
      domain: selectedDomain !== 'all' ? selectedDomain : undefined,
      readiness: summary || undefined,
      domainStats,
      dryRuns,
      evidence: dryRunEvidence,
      approvals: { pending: pendingCount, approved: approvalApprovedCount, rejected: approvalRejectedCount },
      deadlines: calendar || undefined,
      alerts: alertData,
      certificates: certData,
    });
  }, [companyId, selectedDomain, summary, domainStats, dryRuns, dryRunEvidence, pendingCount, approvalApprovedCount, approvalRejectedCount, calendar, alertData, certData, exportEvidencePack]);

  const exportOptions = [
    {
      id: 'readiness',
      label: 'Informe de Readiness',
      description: 'Estado de preparación de todos los conectores, señales, bloqueantes y pipeline operativo.',
      icon: Gauge,
      available: !!summary,
      color: 'text-blue-500',
      onExport: handleReadinessExport,
    },
    {
      id: 'dry_run_diff',
      label: 'Comparativa Dry-Runs',
      description: diffPair
        ? `Última comparativa: #${diffPair.baseline.execution_number} vs #${diffPair.comparison.execution_number} (${diffPair.comparison.submission_domain})`
        : 'Compara dos ejecuciones sucesivas. Necesita ≥2 dry-runs en el mismo dominio.',
      icon: GitCompareArrows,
      available: !!diffPair,
      color: 'text-amber-500',
      onExport: handleDiffExport,
    },
    {
      id: 'evidence_pack',
      label: 'Evidence Pack',
      description: 'Paquete documental completo con readiness, dry-runs, evidencias, aprobaciones y alertas.',
      icon: Package,
      available: true,
      color: 'text-purple-500',
      onExport: handleEvidencePackExport,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" /> Exportación y Reporting
        </h3>
        <p className="text-sm text-muted-foreground">
          Genera informes internos de readiness, comparativas de dry-runs y evidence packs para auditoría y compliance.
        </p>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30">
        <CardContent className="py-3">
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Todos los documentos generados son <strong>informes internos preparatorios</strong>.
              No constituyen presentaciones oficiales, acuses ni validaciones de organismos.
              Exportado ≠ presentado. Reporte ≠ cumplimiento confirmado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Domain filter for evidence packs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtro dominio (Evidence Pack):</span>
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOMAIN_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Export options */}
      <div className="grid gap-3">
        {exportOptions.map(opt => {
          const Icon = opt.icon;
          return (
            <Card key={opt.id} className={cn(!opt.available && 'opacity-60')}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-muted', opt.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {opt.label}
                        {!opt.available && (
                          <Badge variant="outline" className="text-[9px] h-4">No disponible</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{opt.description}</p>
                    </div>
                  </div>
                  {opt.available && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                        onClick={() => opt.onExport('pdf')}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                        onClick={() => opt.onExport('excel')}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Last export info */}
      {lastExport && (
        <Card className="border-dashed">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Última exportación: <strong>{lastExport.fileName}</strong>
                {' · '}
                {new Date(lastExport.generatedAt).toLocaleString('es-ES')}
                {lastExport.success ? (
                  <Badge variant="outline" className="ml-2 text-[8px] h-3.5 text-green-600 border-green-300">OK</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2 text-[8px] h-3.5">Error</Badge>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
