/**
 * ExportHubPanel — V2-ES.8 Tramo 7
 * Centralized export panel for evidence packs and reporting.
 * Tab inside OfficialIntegrationsHub.
 *
 * DISCLAIMER: All exports are internal preparatory documents.
 * They do NOT constitute official submissions or validations.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Package,
  Gauge,
  FlaskConical,
  Shield,
  Info,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfficialReadiness } from '@/hooks/erp/hr/useOfficialReadiness';
import { usePreparatorySubmissions } from '@/hooks/erp/hr/usePreparatorySubmissions';
import { useHRDomainCertificates } from '@/hooks/erp/hr/useHRDomainCertificates';
import { usePreRealApproval } from '@/hooks/erp/hr/usePreRealApproval';
import { useRegulatoryCalendar } from '@/hooks/erp/hr/useRegulatoryCalendar';
import { useMultiEntityReadiness } from '@/hooks/erp/hr/useMultiEntityReadiness';
import { useProactiveAlertSignals } from '@/hooks/erp/hr/useProactiveAlertSignals';
import { useOfficialExport } from '@/hooks/erp/hr/useOfficialExport';
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

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
}

export function ExportHubPanel({ companyId, adapters }: Props) {
  const { summary } = useOfficialReadiness(companyId);
  const { submissions } = usePreparatorySubmissions(companyId);
  const { certificates } = useHRDomainCertificates(companyId);
  const { pendingCount, approvedCount: approvalApprovedCount, rejectedCount: approvalRejectedCount } = usePreRealApproval(companyId);
  const { isExporting, exportReadiness, lastExport } = useOfficialExport(companyId);

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

  const handleExport = (format: 'pdf' | 'excel', category: string) => {
    if (category === 'readiness' && summary) {
      const certData = certificates.map(c => ({
        domain: c.domain,
        status: c.certificate_status,
        completeness: c.configuration_completeness,
      }));
      exportReadiness(format, summary, domainStats, {
        companyId,
        certificates: certData,
        approvals: { pending: pendingCount, approved: approvalApprovedCount, rejected: approvalRejectedCount },
      });
    }
    // dry_run and evidence_pack exports will be added in T7-P2 and T7-P3
  };

  const exportOptions = [
    {
      id: 'readiness',
      label: 'Informe de Readiness',
      description: 'Estado de preparacion de todos los conectores, señales, bloqueantes y pipeline operativo.',
      icon: Gauge,
      available: !!summary,
      color: 'text-blue-500',
    },
    {
      id: 'dry_run',
      label: 'Resumen de Dry-Runs',
      description: 'Historial y resultados de simulaciones internas por dominio.',
      icon: FlaskConical,
      available: false, // T7-P2
      color: 'text-amber-500',
    },
    {
      id: 'evidence_pack',
      label: 'Evidence Pack',
      description: 'Paquete documental completo por dominio/entidad/periodo.',
      icon: Package,
      available: false, // T7-P3
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" /> Exportación y Reporting
        </h3>
        <p className="text-sm text-muted-foreground">
          Genera informes internos de readiness, dry-runs y evidence packs para auditoría y compliance.
        </p>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-3">
          <div className="flex items-start gap-2 text-xs text-amber-700">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Todos los documentos generados son <strong>informes internos preparatorios</strong>.
              No constituyen presentaciones oficiales, acuses ni validaciones de organismos.
              Exportado ≠ presentado. Reporte ≠ cumplimiento confirmado.
            </p>
          </div>
        </CardContent>
      </Card>

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
                          <Badge variant="outline" className="text-[9px] h-4">Próximamente</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </div>
                  {opt.available && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                        onClick={() => handleExport('pdf', opt.id)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting}
                        onClick={() => handleExport('excel', opt.id)}
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
