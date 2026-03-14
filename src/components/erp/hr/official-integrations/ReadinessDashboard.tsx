/**
 * ReadinessDashboard — V2-ES.8 Paso 1
 * Visual readiness status for all official connectors.
 * Shows per-connector readiness, blockers, warnings, and dry-run availability.
 */
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ChevronRight,
  FlaskConical,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OfficialReadinessSummary, ConnectorReadiness, ReadinessLevel } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { useOfficialReadiness } from '@/hooks/erp/hr/useOfficialReadiness';

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
}

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
  aeat_111: FileText,
  aeat_190: FileText,
  certifica2: FileText,
  delta: AlertTriangle,
};

function ConnectorCard({ connector }: { connector: ConnectorReadiness }) {
  const Icon = CONNECTOR_ICONS[connector.connectorId] || FileText;

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
          <div className="flex items-center gap-2">
            {connector.canDryRun && (
              <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-600">
                <FlaskConical className="h-3 w-3" /> Dry-run
              </Badge>
            )}
            <Badge className={cn('text-[10px]', LEVEL_BG[connector.level], LEVEL_COLORS[connector.level])}>
              {connector.levelLabel}
            </Badge>
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

        {/* Signals */}
        <div className="flex flex-wrap gap-2">
          <SignalBadge ok={connector.signals.dataComplete} label="Datos" />
          <SignalBadge ok={connector.signals.formatValid} label="Formato" />
          <SignalBadge ok={connector.signals.consistencyOk} label="Consistencia" />
          {connector.signals.docsReady !== null && (
            <SignalBadge ok={connector.signals.docsReady} label="Documentación" />
          )}
          <SignalBadge ok={connector.signals.adapterConfigured} label="Conector" />
        </div>

        {/* Blockers & Warnings */}
        {connector.blockers.length > 0 && (
          <div className="space-y-1">
            {connector.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-destructive">
                <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}
        {connector.warnings.length > 0 && (
          <div className="space-y-1">
            {connector.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignalBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
      ok ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground',
    )}>
      {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

export function ReadinessDashboard({ companyId, adapters }: Props) {
  const { summary, isEvaluating, lastEvaluatedAt, evaluate } = useOfficialReadiness(companyId);

  useEffect(() => {
    evaluate(adapters);
  }, []);

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
            Pre-validación y preparación para envíos oficiales · Modo dry-run
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => evaluate(adapters)}
          disabled={isEvaluating}
        >
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isEvaluating && 'animate-spin')} />
          Reevaluar
        </Button>
      </div>

      {/* Overall summary card */}
      <Card className={cn('border-2', LEVEL_BG[summary.overallLevel])}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
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

      {/* Dry-run disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <span>
          V2-ES.8 opera en modo <strong>dry-run</strong>: pre-validación, simulación de payloads y detección de gaps.
          No se realizan envíos oficiales ni conexiones productivas reales.
        </span>
      </div>

      {/* Primary connectors */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Conectores principales</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {primaryConnectors.map(c => (
            <ConnectorCard key={c.connectorId} connector={c} />
          ))}
        </div>
      </div>

      {/* Secondary connectors */}
      {secondaryConnectors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Conectores secundarios</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {secondaryConnectors.map(c => (
              <ConnectorCard key={c.connectorId} connector={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
