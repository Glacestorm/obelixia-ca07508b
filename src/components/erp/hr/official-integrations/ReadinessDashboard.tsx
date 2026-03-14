/**
 * ReadinessDashboard — V2-ES.8 Paso 5
 * Enhanced: operational visibility, credential status, payload/dry-run tracking,
 * 5-level score system, and clear disclaimers.
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Gauge,
  FlaskConical,
  Info,
  KeyRound,
  PackageCheck,
  Calculator,
  ChevronDown,
  ChevronRight,
  Lock,
  ServerCrash,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  OfficialReadinessSummary,
  ConnectorReadiness,
  ReadinessLevel,
} from '@/components/erp/hr/shared/officialReadinessEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { useOfficialReadiness } from '@/hooks/erp/hr/useOfficialReadiness';
import { usePreparatorySubmissions } from '@/hooks/erp/hr/usePreparatorySubmissions';
import { getDomainMeta, type SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';
import {
  useHRDomainCertificates,
  DOMAIN_LABELS as CERT_DOMAIN_LABELS,
  STATUS_LABELS as CERT_STATUS_LABELS,
  isCertificateExpiringSoon,
  type CertificateDomain,
} from '@/hooks/erp/hr/useHRDomainCertificates';

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
}

// ─── Operational Score System ───────────────────────────────────────────────

type OperationalScore =
  | 'not_configured'
  | 'partially_ready'
  | 'ready_for_dry_run'
  | 'dry_run_tested'
  | 'ready_for_real';

const OPSCORE_META: Record<OperationalScore, { label: string; color: string; bg: string; percent: number }> = {
  not_configured:   { label: 'No configurado',     color: 'text-muted-foreground', bg: 'bg-muted',              percent: 0 },
  partially_ready:  { label: 'Parcialmente listo',  color: 'text-amber-500',        bg: 'bg-amber-500/10',       percent: 30 },
  ready_for_dry_run:{ label: 'Listo para dry-run',  color: 'text-blue-500',         bg: 'bg-blue-500/10',        percent: 60 },
  dry_run_tested:   { label: 'Dry-run verificado',  color: 'text-green-500',        bg: 'bg-green-500/10',       percent: 85 },
  ready_for_real:   { label: 'Listo para real',      color: 'text-purple-500',       bg: 'bg-purple-500/10',      percent: 100 },
};

function computeOperationalScore(
  connector: ConnectorReadiness,
  submissionStats: { payloads: number; validated: number; dryRuns: number },
): OperationalScore {
  if (submissionStats.dryRuns > 0) return 'dry_run_tested';
  if (connector.canDryRun && submissionStats.validated > 0) return 'ready_for_dry_run';
  if (connector.level === 'ready_internal' || connector.level === 'ready_dryrun') return 'ready_for_dry_run';
  if (connector.level === 'partial' || submissionStats.payloads > 0) return 'partially_ready';
  return 'not_configured';
}

// ─── Domain mapping ─────────────────────────────────────────────────────────

const CONNECTOR_TO_DOMAIN: Record<string, SubmissionDomain> = {
  tgss_siltra: 'TGSS',
  contrata_sepe: 'CONTRATA',
  aeat_111: 'AEAT_111',
  aeat_190: 'AEAT_190',
  certifica2: 'CERTIFICA2',
  delta: 'DELTA',
};

// ─── Visual maps ────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<ReadinessLevel, string> = {
  not_ready: 'text-destructive',
  partial: 'text-amber-500',
  ready_internal: 'text-blue-500',
  ready_dryrun: 'text-green-500',
};

const LEVEL_BG: Record<ReadinessLevel, string> = {
  not_ready: 'bg-destructive/10 border-destructive/20',
  partial: 'bg-amber-500/10 border-amber-500/20',
  ready_internal: 'bg-blue-500/10 border-blue-500/20',
  ready_dryrun: 'bg-green-500/10 border-green-500/20',
};

const LEVEL_PROGRESS: Record<ReadinessLevel, string> = {
  not_ready: '[&>div]:bg-destructive',
  partial: '[&>div]:bg-amber-500',
  ready_internal: '[&>div]:bg-blue-500',
  ready_dryrun: '[&>div]:bg-green-500',
};

const CONNECTOR_ICONS: Record<string, typeof Shield> = {
  tgss_siltra: Shield,
  contrata_sepe: FileText,
  aeat_111: Calculator,
  aeat_190: Calculator,
  certifica2: FileText,
  delta: AlertTriangle,
};

// ─── ConnectorCard ──────────────────────────────────────────────────────────

function ConnectorCard({
  connector,
  opScore,
  stats,
  isExpanded,
  onToggle,
}: {
  connector: ConnectorReadiness;
  opScore: OperationalScore;
  stats: { payloads: number; validated: number; dryRuns: number };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = CONNECTOR_ICONS[connector.connectorId] || FileText;
  const op = OPSCORE_META[opScore];
  const domain = CONNECTOR_TO_DOMAIN[connector.connectorId];
  const domainMeta = domain ? getDomainMeta(domain) : null;

  return (
    <Card className={cn('border transition-colors', LEVEL_BG[connector.level])}>
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn('p-1.5 rounded-md', LEVEL_BG[connector.level])}>
              <Icon className={cn('h-4 w-4', LEVEL_COLORS[connector.level])} />
            </div>
            <div>
              <p className="text-sm font-semibold">{connector.label}</p>
              <p className="text-[11px] text-muted-foreground">{connector.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={cn('text-[10px]', op.bg, op.color)}>
              {op.label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Preparación</span>
            <span className={cn('font-mono font-medium', LEVEL_COLORS[connector.level])}>{connector.percent}%</span>
          </div>
          <Progress value={connector.percent} className={cn('h-1.5', LEVEL_PROGRESS[connector.level])} />
        </div>

        {/* Signal badges */}
        <div className="flex flex-wrap gap-1.5">
          <SignalBadge ok={connector.signals.dataComplete} label="Datos" />
          <SignalBadge ok={connector.signals.formatValid} label="Formato" />
          <SignalBadge ok={connector.signals.consistencyOk} label="Consistencia" />
          {connector.signals.docsReady !== null && (
            <SignalBadge ok={connector.signals.docsReady} label="Docs" />
          )}
          <SignalBadge ok={connector.signals.adapterConfigured} label="Conector" />
          <SignalBadge ok={connector.signals.credentialsPresent} label="Certificado" icon={<KeyRound className="h-2.5 w-2.5" />} />
        </div>

        {/* Operational pipeline mini */}
        <div className="flex items-center gap-1 text-[10px]">
          <PipelineStep done={stats.payloads > 0} label={`Payload ${stats.payloads > 0 ? `(${stats.payloads})` : ''}`} />
          <span className="text-muted-foreground">→</span>
          <PipelineStep done={stats.validated > 0} label={`Validado ${stats.validated > 0 ? `(${stats.validated})` : ''}`} />
          <span className="text-muted-foreground">→</span>
          <PipelineStep done={stats.dryRuns > 0} label={`Dry-run ${stats.dryRuns > 0 ? `(${stats.dryRuns})` : ''}`} />
          <span className="text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            <Lock className="h-2 w-2" /> Real
          </span>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="pt-2 border-t space-y-2">
            {/* Domain info */}
            {domainMeta && (
              <div className="text-[11px] space-y-0.5">
                <p><span className="text-muted-foreground">Organismo:</span> {domainMeta.organism}</p>
                <p><span className="text-muted-foreground">Formato:</span> {domainMeta.payloadFormat}</p>
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Certificado digital:</span>
                  {domainMeta.requiresCertificate ? (
                    <span className="text-amber-600 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> Requerido (no configurado)
                    </span>
                  ) : (
                    <span className="text-green-600">No requerido</span>
                  )}
                </p>
              </div>
            )}

            {/* Blockers */}
            {connector.blockers.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-destructive">Bloqueantes:</p>
                {connector.blockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-destructive">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {connector.warnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-amber-600">Avisos:</p>
                {connector.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* What's missing */}
            {!connector.signals.credentialsPresent && (
              <div className="flex items-start gap-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                <KeyRound className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                <span>
                  <strong>Configuración pendiente:</strong> Certificado digital FNMT o electrónico no configurado.
                  Requerido para envío real, no para dry-run.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignalBadge({ ok, label, icon }: { ok: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
      ok ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground',
    )}>
      {icon || (ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />)}
      {label}
    </span>
  );
}

function PipelineStep({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded',
      done ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground',
    )}>
      {done ? <CheckCircle2 className="h-2 w-2" /> : <Clock className="h-2 w-2" />}
      {label}
    </span>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function ReadinessDashboard({ companyId, adapters }: Props) {
  const { summary, isEvaluating, lastEvaluatedAt, evaluate } = useOfficialReadiness(companyId);
  const { submissions, fetchPreparatory } = usePreparatorySubmissions(companyId);
  const { certificates, fetchCertificates, getCertificateSummary } = useHRDomainCertificates(companyId);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);

  useEffect(() => {
    evaluate(adapters);
    fetchPreparatory();
    fetchCertificates();
  }, []);

  // Compute per-domain submission stats
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

  // Compute operational scores
  const operationalScores = useMemo(() => {
    if (!summary) return {};
    const scores: Record<string, OperationalScore> = {};
    for (const c of summary.connectors) {
      const domain = CONNECTOR_TO_DOMAIN[c.connectorId] || 'generic';
      scores[c.connectorId] = computeOperationalScore(c, domainStats[domain] || { payloads: 0, validated: 0, dryRuns: 0 });
    }
    return scores;
  }, [summary, domainStats]);

  // Global operational stats
  const globalOps = useMemo(() => {
    const totalPayloads = Object.values(domainStats).reduce((s, d) => s + d.payloads, 0);
    const totalValidated = Object.values(domainStats).reduce((s, d) => s + d.validated, 0);
    const totalDryRuns = Object.values(domainStats).reduce((s, d) => s + d.dryRuns, 0);
    const testedDomains = Object.values(domainStats).filter(d => d.dryRuns > 0).length;
    return { totalPayloads, totalValidated, totalDryRuns, testedDomains };
  }, [domainStats]);

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Evaluando preparación…</p>
        </CardContent>
      </Card>
    );
  }

  const primaryConnectors = summary.connectors.filter(c =>
    ['tgss_siltra', 'contrata_sepe', 'aeat_111', 'aeat_190'].includes(c.connectorId)
  );
  const secondaryConnectors = summary.connectors.filter(c =>
    ['certifica2', 'delta'].includes(c.connectorId)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" /> Readiness de Integración Oficial
          </h3>
          <p className="text-sm text-muted-foreground">
            Pre-validación y preparación para envíos oficiales · Modo preparatorio
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { evaluate(adapters); fetchPreparatory(); fetchCertificates(); }} disabled={isEvaluating}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isEvaluating && 'animate-spin')} />
          Reevaluar
        </Button>
      </div>

      {/* Overall summary */}
      <Card className={cn('border-2', LEVEL_BG[summary.overallLevel])}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={cn('text-3xl font-bold font-mono', LEVEL_COLORS[summary.overallLevel])}>
                  {summary.overallPercent}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Preparación</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className={cn('text-sm font-semibold', LEVEL_COLORS[summary.overallLevel])}>
                  {summary.overallLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.dryRunReady} de {summary.connectors.length} conectores listos para dry-run
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-destructive">{summary.totalBlockers}</p>
                <p className="text-[10px] text-muted-foreground">Bloqueantes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-500">{summary.totalWarnings}</p>
                <p className="text-[10px] text-muted-foreground">Avisos</p>
              </div>
              {lastEvaluatedAt && (
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(lastEvaluatedAt), { locale: es, addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{globalOps.totalPayloads}</p>
              <p className="text-[10px] text-muted-foreground">Payloads generados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">{globalOps.totalValidated}</p>
              <p className="text-[10px] text-muted-foreground">Validados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-lg font-bold">{globalOps.totalDryRuns}</p>
              <p className="text-[10px] text-muted-foreground">Dry-runs ejecutados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-lg font-bold">{globalOps.testedDomains}/{Object.keys(CONNECTOR_TO_DOMAIN).length}</p>
              <p className="text-[10px] text-muted-foreground">Dominios verificados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p>
            V2-ES.8 opera en modo <strong>preparatorio (dry-run)</strong>: pre-validación, generación de payloads y simulación de envíos.
            <strong> No se realizan envíos oficiales</strong> ni conexiones productivas reales a TGSS, SEPE o AEAT.
          </p>
          <p className="mt-1 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            El envío real está <strong>bloqueado</strong> por defecto. Requiere certificado digital y autorización explícita.
          </p>
        </div>
      </div>

      {/* Primary connectors */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Conectores principales</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {primaryConnectors.map(c => {
            const domain = CONNECTOR_TO_DOMAIN[c.connectorId] || 'generic';
            return (
              <ConnectorCard
                key={c.connectorId}
                connector={c}
                opScore={operationalScores[c.connectorId] || 'not_configured'}
                stats={domainStats[domain] || { payloads: 0, validated: 0, dryRuns: 0 }}
                isExpanded={expandedConnector === c.connectorId}
                onToggle={() => setExpandedConnector(prev => prev === c.connectorId ? null : c.connectorId)}
              />
            );
          })}
        </div>
      </div>

      {/* Secondary connectors */}
      {secondaryConnectors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Conectores secundarios</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {secondaryConnectors.map(c => {
              const domain = CONNECTOR_TO_DOMAIN[c.connectorId] || 'generic';
              return (
                <ConnectorCard
                  key={c.connectorId}
                  connector={c}
                  opScore={operationalScores[c.connectorId] || 'not_configured'}
                  stats={domainStats[domain] || { payloads: 0, validated: 0, dryRuns: 0 }}
                  isExpanded={expandedConnector === c.connectorId}
                  onToggle={() => setExpandedConnector(prev => prev === c.connectorId ? null : c.connectorId)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Credential requirements summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" /> Certificados y configuración por dominio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {(['tgss_siltra', 'contrata_sepe', 'aeat'] as CertificateDomain[]).map(domain => {
            const cert = certificates.find(c => c.domain === domain);
            const statusLabel = cert ? CERT_STATUS_LABELS[cert.certificate_status] : 'No configurado';
            const isReady = cert && (cert.certificate_status === 'cert_loaded_placeholder' || cert.certificate_status === 'cert_ready_preparatory');
            const isExpiring = cert ? isCertificateExpiringSoon(cert) : false;
            const isExpired = cert?.certificate_status === 'expired';

            return (
              <div key={domain} className="flex items-center justify-between text-[11px] py-1.5 border-b last:border-0">
                <div className="flex items-center gap-1.5">
                  {isReady ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : isExpired ? (
                    <XCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                  <span className="font-medium">{CERT_DOMAIN_LABELS[domain]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isExpiring && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 text-amber-600 border-amber-300">
                      Próximo a expirar
                    </Badge>
                  )}
                  <span className={cn(
                    'text-[10px]',
                    isReady ? 'text-green-600' : isExpired ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {statusLabel}
                  </span>
                  {cert && (
                    <span className="text-[9px] text-muted-foreground font-mono">{cert.configuration_completeness}%</span>
                  )}
                </div>
              </div>
            );
          })}
          {[
            { label: 'CCC (Código Cuenta Cotización)', required: true, configured: summary.connectors.find(c => c.connectorId === 'tgss_siltra')?.signals.dataComplete || false, domains: 'TGSS' },
            { label: 'NIF empresa declarante', required: true, configured: summary.connectors.find(c => c.connectorId === 'aeat_111')?.signals.dataComplete || false, domains: 'AEAT' },
            { label: 'Conector SILTRA activo', required: false, configured: summary.connectors.find(c => c.connectorId === 'tgss_siltra')?.signals.adapterConfigured || false, domains: 'TGSS' },
            { label: 'Conector Contrat@ activo', required: false, configured: summary.connectors.find(c => c.connectorId === 'contrata_sepe')?.signals.adapterConfigured || false, domains: 'Contrat@' },
          ].map((req, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b last:border-0">
              <div className="flex items-center gap-1.5">
                {req.configured ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-amber-500" />
                )}
                <span>{req.label}</span>
                {req.required && <Badge variant="outline" className="text-[8px] h-3.5 px-1">Obligatorio</Badge>}
              </div>
              <span className="text-muted-foreground">{req.domains}</span>
            </div>
          ))}
          <div className="flex items-start gap-1.5 pt-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <p>
              Los certificados configurados aquí son <strong>preparatorios</strong>. Un certificado con estado "preparatorio" 
              <strong> NO activa firma real ni envío oficial</strong>. El modo dry-run funciona sin certificados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
