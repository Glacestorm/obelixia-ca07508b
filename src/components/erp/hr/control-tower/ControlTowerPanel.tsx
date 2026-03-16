/**
 * ControlTowerPanel — V2-RRHH-FASE-6 + 6B Enrichment
 * Multi-company labor Control Tower dashboard.
 * Shows global KPIs, prioritized company list with health scores,
 * alerts by severity, and drill-down per company.
 *
 * 6B: All 6 alert categories now produce real alerts (readiness, documental, traceability).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Building2, AlertTriangle, CheckCircle2, ShieldAlert,
  ChevronDown, ChevronRight, Search, Activity, Gauge, XCircle,
  ClipboardList, CalendarCheck, ArrowRight, ShieldCheck,
  Info, FileWarning, Fingerprint, Radio,
} from 'lucide-react';
import { useControlTower } from '@/hooks/erp/hr/useControlTower';
import {
  SEVERITY_CONFIG,
  CATEGORY_LABELS,
  type CompanyHealthScore,
  type ControlTowerAlert,
  type AlertSeverity,
  type AlertCategory,
} from '@/engines/erp/hr/controlTowerEngine';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORY_ICONS: Record<AlertCategory, typeof AlertTriangle> = {
  closing: CalendarCheck,
  readiness: Radio,
  documental: FileWarning,
  tasks_sla: ClipboardList,
  consistency: ShieldAlert,
  traceability: Fingerprint,
};

interface Props {
  onNavigateToCompany?: (companyId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  className?: string;
}

export function ControlTowerPanel({ onNavigateToCompany, onNavigateToModule, className }: Props) {
  const {
    filteredCompanies,
    summary,
    selectedCompany,
    advisorRole,
    hasNoAssignments,
    isLoading,
    filters,
    setFilters,
    selectCompany,
    refresh,
  } = useControlTower();

  // ── No assignments state ──
  if (hasNoAssignments && !isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-16 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Sin cartera asignada</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Contacta con un supervisor para que te asigne empresas.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Count which categories have alerts for showing/hiding filter options
  const categoriesWithAlerts = new Set<AlertCategory>();
  for (const c of filteredCompanies) {
    for (const a of c.alerts) {
      categoriesWithAlerts.add(a.category);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Global Summary Bar ── */}
      {summary && (
        <Card>
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
                  <Gauge className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Control Tower Laboral</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {summary.totalCompanies} empresas · {summary.totalAlerts} alertas ·{' '}
                    Evaluado {formatDistanceToNow(new Date(summary.evaluatedAt), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>

            {/* KPI chips */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
              <SeverityKpi label="Crítico" count={summary.criticalCount} severity="critical" />
              <SeverityKpi label="Alto" count={summary.highCount} severity="high" />
              <SeverityKpi label="Medio" count={summary.mediumCount} severity="medium" />
              <SeverityKpi label="Normal" count={summary.healthyCount} severity="info" />
              <div className="p-2 rounded-lg border bg-card text-center">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{summary.totalOverdueTasks}</p>
                <p className="text-[10px] text-muted-foreground">SLA vencidos</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* ── Main content: list + drill-down ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Company list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa..."
                  value={filters.search}
                  onChange={e => setFilters({ search: e.target.value })}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select
                value={filters.severity}
                onValueChange={v => setFilters({ severity: v as AlertSeverity | 'all' })}
              >
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="info">Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.category}
                onValueChange={v => setFilters({ category: v as AlertCategory | 'all' })}
              >
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="closing">Cierre</SelectItem>
                  <SelectItem value="tasks_sla">Tareas/SLA</SelectItem>
                  <SelectItem value="consistency">Consistencia</SelectItem>
                  <SelectItem value="readiness">Readiness</SelectItem>
                  <SelectItem value="documental">Documental</SelectItem>
                  <SelectItem value="traceability">Trazabilidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[520px]">
              {filteredCompanies.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin empresas que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredCompanies.map(company => (
                    <CompanyHealthRow
                      key={company.companyId}
                      company={company}
                      isSelected={selectedCompany?.companyId === company.companyId}
                      onSelect={() => selectCompany(
                        selectedCompany?.companyId === company.companyId ? null : company.companyId
                      )}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Drill-down panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedCompany ? selectedCompany.companyName : 'Detalle de empresa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCompany ? (
              <CompanyDrillDown
                company={selectedCompany}
                onNavigateToCompany={onNavigateToCompany}
                onNavigateToModule={onNavigateToModule}
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Selecciona una empresa para ver el detalle</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SeverityKpi({ label, count, severity }: { label: string; count: number; severity: AlertSeverity }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <div className={cn('p-2 rounded-lg border bg-card text-center', count > 0 && config.bgColor)}>
      <div className={cn('h-3 w-3 rounded-full mx-auto mb-1', config.dotColor)} />
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CompanyHealthRow({ company, isSelected, onSelect }: {
  company: CompanyHealthScore;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = SEVERITY_CONFIG[company.severity];

  // Count unique categories for chips
  const categories = new Set(company.alerts.map(a => a.category));

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'bg-card hover:bg-muted/30',
        company.severity === 'critical' && !isSelected && 'border-destructive/30',
      )}
    >
      {/* Health score indicator */}
      <div className="relative shrink-0">
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border-2',
          config.bgColor, config.color,
        )}>
          {company.score}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{company.companyName}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {Array.from(categories).slice(0, 3).map(cat => {
            const CatIcon = CATEGORY_ICONS[cat];
            return (
              <span key={cat} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <CatIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{CATEGORY_LABELS[cat]}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Alert count + severity badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {company.alerts.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {company.alerts.length}
          </Badge>
        )}
        <Badge className={cn('text-[10px]', config.bgColor, config.color)}>
          {config.label}
        </Badge>
      </div>

      {isSelected
        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

function CompanyDrillDown({ company, onNavigateToCompany, onNavigateToModule }: {
  company: CompanyHealthScore;
  onNavigateToCompany?: (id: string) => void;
  onNavigateToModule?: (id: string) => void;
}) {
  const config = SEVERITY_CONFIG[company.severity];

  // Group alerts by category for organized display
  const alertsByCategory = new Map<AlertCategory, ControlTowerAlert[]>();
  for (const alert of company.alerts) {
    const existing = alertsByCategory.get(alert.category) || [];
    existing.push(alert);
    alertsByCategory.set(alert.category, existing);
  }

  return (
    <ScrollArea className="h-[480px]">
      <div className="space-y-4">
        {/* Score summary */}
        <div className="text-center">
          <div className={cn(
            'inline-flex items-center justify-center h-16 w-16 rounded-full text-2xl font-bold border-2 mb-2',
            config.bgColor, config.color,
          )}>
            {company.score}
          </div>
          <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
          <Progress
            value={company.score}
            className="mt-2 h-2"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Empleados" value={company.stats.activeEmployees} />
          <MiniStat label="Tareas pend." value={company.stats.pendingTasks} warn={company.stats.pendingTasks > 5} />
          <MiniStat label="SLA vencidos" value={company.stats.overdueTasks} alert={company.stats.overdueTasks > 0} />
          <MiniStat label="Cierres abiertos" value={company.stats.openClosingPeriods} warn={company.stats.openClosingPeriods > 0} />
        </div>

        <Separator />

        {/* Reasons */}
        {company.reasons.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Por qué este nivel
            </p>
            <ul className="space-y-1">
              {company.reasons.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top blockers */}
        {company.topBlockers.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1 text-destructive">
              <XCircle className="h-3.5 w-3.5" /> Bloqueantes
            </p>
            <ul className="space-y-1">
              {company.topBlockers.map((b, i) => (
                <li key={i} className="text-xs text-destructive/80 flex items-start gap-1.5">
                  <span className="mt-0.5">⛔</span> {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested actions */}
        {company.topActions.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1 text-primary">
              <ArrowRight className="h-3.5 w-3.5" /> Acciones recomendadas
            </p>
            <ul className="space-y-1">
              {company.topActions.map((a, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Alerts grouped by category */}
        {alertsByCategory.size > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">
              Alertas por categoría ({company.alerts.length})
            </p>
            <div className="space-y-3">
              {Array.from(alertsByCategory.entries()).map(([category, catAlerts]) => {
                const CatIcon = CATEGORY_ICONS[category];
                return (
                  <div key={category}>
                    <p className="text-[11px] font-medium mb-1 flex items-center gap-1 text-muted-foreground">
                      <CatIcon className="h-3 w-3" />
                      {CATEGORY_LABELS[category]}
                      <Badge variant="outline" className="text-[9px] h-4 ml-auto">
                        {catAlerts.length}
                      </Badge>
                    </p>
                    <div className="space-y-1.5">
                      {catAlerts.map(alert => (
                        <AlertCard key={alert.id} alert={alert} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onNavigateToCompany && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => onNavigateToCompany(company.companyId)}
            >
              <Building2 className="h-3 w-3 mr-1" /> Abrir empresa
            </Button>
          )}
          {onNavigateToModule && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => onNavigateToModule('payroll-management')}
            >
              <CalendarCheck className="h-3 w-3 mr-1" /> Ir a cierre
            </Button>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function AlertCard({ alert }: { alert: ControlTowerAlert }) {
  const sevConfig = SEVERITY_CONFIG[alert.severity];
  return (
    <div className={cn('p-2 rounded-lg border text-xs', sevConfig.bgColor)}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={cn('h-2 w-2 rounded-full', sevConfig.dotColor)} />
        <span className="font-medium">{alert.title}</span>
      </div>
      <p className="text-muted-foreground ml-3.5">{alert.explanation}</p>
      <p className="text-muted-foreground/70 ml-3.5 mt-0.5 italic">
        → {alert.suggestedAction}
      </p>
    </div>
  );
}

function MiniStat({ label, value, warn, alert }: {
  label: string;
  value: number;
  warn?: boolean;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      'p-2 rounded-lg border bg-card text-center',
      alert && value > 0 && 'border-destructive/30',
      warn && value > 0 && 'border-amber-300',
    )}>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default ControlTowerPanel;
