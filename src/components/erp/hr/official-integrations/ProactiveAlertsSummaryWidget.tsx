/**
 * ProactiveAlertsSummaryWidget — V2-ES.8 Tramo 6 Paso 4
 * Compact executive summary of active proactive alerts.
 * Designed to be embedded in ReadinessDashboard.
 *
 * Does NOT create a separate notification center.
 * Shows actionable alert counts by severity with dismiss/acknowledge capability.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  ProactiveAlertSummary,
  ProactiveAlert,
  ProactiveAlertSeverity,
  ProactiveAlertDomain,
} from '@/components/erp/hr/shared/proactiveAlertEngine';
import {
  PROACTIVE_SEVERITY_CONFIG,
  PROACTIVE_STATUS_CONFIG,
  ALERT_CATEGORY_LABELS,
  ALERT_DOMAIN_LABELS,
} from '@/components/erp/hr/shared/proactiveAlertEngine';

interface Props {
  summary: ProactiveAlertSummary | null;
  isEvaluating?: boolean;
  lastEvaluatedAt?: Date | null;
  onAcknowledge?: (key: string) => void;
  onDismiss?: (key: string) => void;
  onResolve?: (key: string) => void;
  /** Compact mode: only show counts */
  compact?: boolean;
  /** Filter by domain */
  filterDomain?: ProactiveAlertDomain;
  className?: string;
}

const SEVERITY_ICON: Record<ProactiveAlertSeverity, typeof AlertTriangle> = {
  critical: XCircle,
  high: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export function ProactiveAlertsSummaryWidget({
  summary,
  isEvaluating,
  lastEvaluatedAt,
  onAcknowledge,
  onDismiss,
  onResolve,
  compact = false,
  filterDomain,
  className,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter to only active/acknowledged alerts
  const activeAlerts = useMemo(() => {
    if (!summary) return [];
    let alerts = summary.alerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
    if (filterDomain) {
      alerts = alerts.filter(a => a.domain === filterDomain);
    }
    return alerts;
  }, [summary, filterDomain]);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const highCount = activeAlerts.filter(a => a.severity === 'high').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

  if (!summary || activeAlerts.length === 0) {
    if (compact) return null;
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellOff className="h-4 w-4" />
            <span>Sin alertas activas</span>
            {lastEvaluatedAt && (
              <span className="text-[10px]">
                · Evaluado {formatDistanceToNow(lastEvaluatedAt, { locale: es, addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Bell className="h-3.5 w-3.5 text-primary" />
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-[9px] h-4 px-1.5">{criticalCount} crítico</Badge>
        )}
        {highCount > 0 && (
          <Badge className="text-[9px] h-4 px-1.5 bg-orange-500/10 text-orange-600 border border-orange-500/30">{highCount} alto</Badge>
        )}
        {warningCount > 0 && (
          <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/30">{warningCount}</Badge>
        )}
        {infoCount > 0 && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{infoCount}</Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      'border transition-colors',
      criticalCount > 0 ? 'border-red-500/30 bg-red-500/5' :
      highCount > 0 ? 'border-orange-500/30 bg-orange-500/5' :
      warningCount > 0 ? 'border-amber-500/30 bg-amber-500/5' :
      'border-sky-500/20 bg-sky-500/5',
      className,
    )}>
      <CardContent className="py-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Alertas Proactivas</span>
            <Badge variant="outline" className="text-[9px] h-4">
              {activeAlerts.length} activa{activeAlerts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Severity counters */}
            <div className="flex items-center gap-1.5 text-[10px]">
              {criticalCount > 0 && (
                <span className="flex items-center gap-0.5 text-red-600 font-medium">
                  <XCircle className="h-3 w-3" /> {criticalCount}
                </span>
              )}
              {highCount > 0 && (
                <span className="flex items-center gap-0.5 text-orange-600">
                  <AlertTriangle className="h-3 w-3" /> {highCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> {warningCount}
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center gap-0.5 text-sky-600">
                  <Info className="h-3 w-3" /> {infoCount}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Alert list (expanded) */}
        {isExpanded && (
          <div className="space-y-1.5 pt-1">
            {activeAlerts.map(alert => (
              <AlertRow
                key={alert.deduplicationKey}
                alert={alert}
                onAcknowledge={onAcknowledge}
                onDismiss={onDismiss}
                onResolve={onResolve}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {isExpanded && (
          <div className="flex items-start gap-1.5 pt-1 text-[9px] text-muted-foreground">
            <Info className="h-2.5 w-2.5 mt-0.5 shrink-0 text-blue-400" />
            <span>
              Las alertas son orientativas para gestión interna. No sustituyen el criterio profesional
              ni constituyen asesoría legal. Alerta ≠ incumplimiento confirmado.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AlertRow ───────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onAcknowledge,
  onDismiss,
  onResolve,
}: {
  alert: ProactiveAlert;
  onAcknowledge?: (key: string) => void;
  onDismiss?: (key: string) => void;
  onResolve?: (key: string) => void;
}) {
  const config = PROACTIVE_SEVERITY_CONFIG[alert.severity];
  const SevIcon = SEVERITY_ICON[alert.severity];
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <div className={cn(
      'flex items-start gap-2 py-2 px-2.5 rounded border text-[11px] transition-colors',
      config.bgClass,
      config.borderClass,
      isAcknowledged && 'opacity-70',
    )}>
      <SevIcon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', config.textClass)} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('font-medium', config.textClass)}>{alert.title}</span>
          <Badge variant="outline" className="text-[8px] h-3.5 px-1">
            {ALERT_DOMAIN_LABELS[alert.domain]}
          </Badge>
          <Badge variant="outline" className="text-[8px] h-3.5 px-1">
            {ALERT_CATEGORY_LABELS[alert.category]}
          </Badge>
          {isAcknowledged && (
            <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
              <Eye className="h-2 w-2 mr-0.5" /> Reconocida
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground leading-tight">{alert.message}</p>
        <div className="flex items-center gap-1.5 pt-0.5 text-[9px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(alert.evaluatedAt, { locale: es, addSuffix: true })}
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!isAcknowledged && onAcknowledge && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onAcknowledge(alert.deduplicationKey)}
            title="Reconocer"
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onDismiss(alert.deduplicationKey)}
            title="Descartar"
          >
            <XCircle className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProactiveAlertsSummaryWidget;
