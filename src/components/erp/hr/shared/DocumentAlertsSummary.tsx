/**
 * DocumentAlertsSummary — Panel consolidado de alertas documentales
 * V2-ES.4 Paso 2.2: Alertas y escalado básico documental
 *
 * Consolida TODAS las señales (vencimiento, estado, checklist, conciliación)
 * en un widget compacto con tooltips explicativos.
 * Componente puro — recibe docs por prop, sin fetch independiente.
 */
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  computeExpedientAlerts,
  type AlertSeverity,
  type ExpedientAlert,
  type ExpedientAlertSummary,
} from './expedientAlertEngine';

// ─── Severity visual config ─────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
  icon: typeof AlertOctagon;
  badgeClass: string;
  dotClass: string;
  label: string;
}> = {
  critical: {
    icon: AlertOctagon,
    badgeClass: 'bg-red-500/10 text-red-700 border-red-500/30',
    dotClass: 'bg-red-500',
    label: 'Crítico',
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    dotClass: 'bg-amber-500',
    label: 'Atención',
  },
  info: {
    icon: Info,
    badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
    dotClass: 'bg-sky-400',
    label: 'Info',
  },
};

const OVERALL_STYLES: Record<AlertSeverity | 'ok', string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  info: 'border-sky-500/20 bg-sky-500/5',
  ok: 'border-emerald-500/30 bg-emerald-500/5',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface DocForAlerts {
  id: string;
  document_type: string;
  document_status?: string | null;
  expiry_date?: string | null;
  reconciled_with_payroll?: boolean;
  reconciled_with_social_security?: boolean;
  reconciled_with_tax?: boolean;
}

interface Props {
  docs: DocForAlerts[];
  mandatoryMissing?: string[];
  /** Compact mode — only shows summary dot + count (default: false) */
  compact?: boolean;
  /** Max alerts visible before expand (default: 3) */
  maxVisible?: number;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DocumentAlertsSummary({
  docs,
  mandatoryMissing,
  compact = false,
  maxVisible = 3,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const summary = computeExpedientAlerts(docs, mandatoryMissing);

  // Nothing to show
  if (summary.totalAlerts === 0) {
    if (docs.length === 0) return null;
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-emerald-600', className)}>
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Expediente sin alertas</span>
      </div>
    );
  }

  // Compact mode: just a summary badge
  if (compact) {
    return (
      <CompactSummary summary={summary} className={className} />
    );
  }

  // Full mode
  const visibleAlerts = expanded ? summary.alerts : summary.alerts.slice(0, maxVisible);
  const hasMore = summary.alerts.length > maxVisible;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('space-y-1.5', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', getSeverityDotClass(summary.overallSeverity))} />
            <span className="font-medium">Alertas documentales</span>
          </div>
          <div className="flex items-center gap-1">
            {summary.criticalCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-700 border-red-500/30">
                {summary.criticalCount}
              </Badge>
            )}
            {summary.warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
                {summary.warningCount}
              </Badge>
            )}
            {summary.infoCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-700 border-sky-500/30">
                {summary.infoCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Alert items */}
        <div className="space-y-1">
          {visibleAlerts.map(alert => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>

        {/* Expand/collapse */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Mostrar menos' : `+${summary.alerts.length - maxVisible} más`}
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: ExpedientAlert }) {
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          'flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-default',
          OVERALL_STYLES[alert.severity],
        )}>
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1 text-[11px]">{alert.title}</span>
          {alert.count > 1 && (
            <Badge variant="outline" className={cn('text-[9px] px-1 py-0 shrink-0', config.badgeClass)}>
              {alert.count}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs max-w-[240px]">
        <p className="font-medium">{alert.title}</p>
        <p className="text-muted-foreground mt-0.5">{alert.description}</p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          Severidad: {config.label} · Categoría: {alert.category}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function CompactSummary({ summary, className }: { summary: ExpedientAlertSummary; className?: string }) {
  const dotClass = getSeverityDotClass(summary.overallSeverity);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5 cursor-default', className)}>
            <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', dotClass)} />
            <span className="text-xs text-muted-foreground">
              {summary.totalAlerts} alerta{summary.totalAlerts !== 1 ? 's' : ''}
            </span>
            {summary.criticalCount > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500/10 text-red-700 border-red-500/30">
                {summary.criticalCount} crít.
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          {summary.alerts.map(a => (
            <p key={a.id} className="flex items-center gap-1">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', SEVERITY_CONFIG[a.severity].dotClass)} />
              {a.title}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSeverityDotClass(severity: AlertSeverity | 'ok'): string {
  switch (severity) {
    case 'critical': return 'bg-red-500';
    case 'warning': return 'bg-amber-500';
    case 'info': return 'bg-sky-400';
    case 'ok': return 'bg-emerald-500';
  }
}
