/**
 * HRFiscalSupervisorPanel — G1.2 Fiscal Supervisor Core
 * Centralized fiscal/SS/international supervision dashboard.
 * 
 * DISCLAIMER: Supervisión fiscal interna preparatoria.
 * NO constituye presentación oficial ni asesoría fiscal.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, FileQuestion, AlertOctagon,
  ChevronDown, Shield, Filter, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFiscalSupervisor, type FiscalSupervisorFilters } from '@/hooks/erp/hr/useFiscalSupervisor';
import {
  type FiscalCheckStatus, type FiscalDomainResult, type FiscalSupervisorCheck,
  FISCAL_STATUS_CONFIG, getOverallScoreColor,
} from '@/engines/erp/hr/fiscalSupervisorEngine';

interface HRFiscalSupervisorPanelProps {
  companyId: string;
}

const STATUS_ICONS: Record<FiscalCheckStatus, typeof CheckCircle> = {
  ok: CheckCircle,
  missing_evidence: FileQuestion,
  preparatory_pending: Clock,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function HRFiscalSupervisorPanel({ companyId }: HRFiscalSupervisorPanelProps) {
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<FiscalCheckStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('resumen');

  const filters: FiscalSupervisorFilters = {
    companyId,
    periodYear,
    periodMonth,
    statusFilter: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { result, isLoading, error, refetch } = useFiscalSupervisor(filters);

  const alertsByDomain = useMemo(() => {
    if (!result) return new Map();
    const map = new Map<string, typeof result.alerts>();
    for (const a of result.alerts) {
      const domain = a.metadata?.domain as string ?? 'general';
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain)!.push(a);
    }
    return map;
  }, [result]);

  // ─── Status icon helper ───────────────────────────────────
  function StatusIcon({ status, className }: { status: FiscalCheckStatus; className?: string }) {
    const Icon = STATUS_ICONS[status];
    const config = FISCAL_STATUS_CONFIG[status];
    return <Icon className={cn('h-4 w-4', config.color, className)} />;
  }

  // ─── Status badge ─────────────────────────────────────────
  function StatusBadge({ status }: { status: FiscalCheckStatus }) {
    const config = FISCAL_STATUS_CONFIG[status];
    return (
      <Badge variant="outline" className={cn('text-xs', config.color, config.bgColor, config.borderColor)}>
        {config.label}
      </Badge>
    );
  }

  // ─── Domain card ──────────────────────────────────────────
  function DomainCard({ domain }: { domain: FiscalDomainResult }) {
    const [open, setOpen] = useState(false);
    const config = FISCAL_STATUS_CONFIG[domain.status];

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className={cn('border', config.borderColor, config.bgColor)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 px-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={domain.status} />
                  <span className="font-medium text-sm">{domain.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-mono', config.color)}>{domain.score}%</span>
                  {domain.alertCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-1.5">
                      {domain.alertCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn('h-4 w-4 transition-transform text-muted-foreground', open && 'rotate-180')} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-3 space-y-2">
              {domain.checks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sin checks en este filtro.</p>
              ) : (
                domain.checks.map(check => (
                  <CheckRow key={check.id} check={check} />
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // ─── Check row ────────────────────────────────────────────
  function CheckRow({ check }: { check: FiscalSupervisorCheck }) {
    const [expanded, setExpanded] = useState(false);

    return (
      <div
        className="border rounded-md p-2 bg-background/50 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2">
          <StatusIcon status={check.status} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-tight">{check.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
            {expanded && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span className="font-medium">Base legal:</span> {check.source}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span className="font-medium">Recomendación:</span> {check.recommendation}
                </div>
                {check.values && (
                  <div className="flex gap-3 text-muted-foreground font-mono">
                    {check.values.expected && <span>Esperado: {check.values.expected}</span>}
                    {check.values.actual && <span>Actual: {check.values.actual}</span>}
                    {check.values.diff && <span>Dif: {check.values.diff}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
          <StatusBadge status={check.status} />
        </div>
      </div>
    );
  }

  // ─── Loading / Error ──────────────────────────────────────
  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sky-500/10 border border-sky-500/20 text-xs text-sky-700">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Supervisión fiscal interna preparatoria. No constituye presentación oficial ni asesoría fiscal.</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodYear.toString()} onValueChange={v => setPeriodYear(Number(v))}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodMonth.toString()} onValueChange={v => setPeriodMonth(Number(v))}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as FiscalCheckStatus | 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Atención</SelectItem>
            <SelectItem value="preparatory_pending">Preparatorio</SelectItem>
            <SelectItem value="missing_evidence">Sin evidencia</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading} className="h-8">
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isLoading && 'animate-spin')} />
          <span className="text-xs">Actualizar</span>
        </Button>
      </div>

      {/* Score header */}
      {result && (
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon status={result.overallStatus} className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold text-sm">
                    Fiscal Supervisor — {MONTH_NAMES[periodMonth - 1]} {periodYear}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {result.passedChecks}/{result.totalChecks} checks ·{' '}
                    {result.alerts.length} alerta{result.alerts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn('text-2xl font-bold font-mono', getOverallScoreColor(result.score))}>
                  {result.score}%
                </span>
                <div className="mt-0.5">
                  <StatusBadge status={result.overallStatus} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {result && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">
              Alertas {result.alerts.length > 0 && `(${result.alerts.length})`}
            </TabsTrigger>
            <TabsTrigger value="detalle" className="text-xs">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.domains.map(domain => (
                <Card key={domain.id} className={cn('border', FISCAL_STATUS_CONFIG[domain.status].borderColor)}>
                  <CardContent className="py-3 px-3">
                    <div className="flex items-center justify-between mb-1">
                      <StatusIcon status={domain.status} />
                      <span className={cn('text-lg font-bold font-mono', FISCAL_STATUS_CONFIG[domain.status].color)}>
                        {domain.score}%
                      </span>
                    </div>
                    <p className="text-xs font-medium">{domain.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {domain.checks.length} check{domain.checks.length !== 1 ? 's' : ''}
                      {domain.alertCount > 0 && ` · ${domain.alertCount} alerta${domain.alertCount !== 1 ? 's' : ''}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="mt-3">
            <ScrollArea className="h-[400px]">
              {result.alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.alerts.map((alert, i) => (
                    <Card key={`${alert.deduplicationKey}-${i}`} className="border">
                      <CardContent className="py-2 px-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0',
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                            alert.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          </div>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'destructive' : 'secondary'
                          } className="text-xs shrink-0">
                            {alert.severity === 'critical' ? 'Crítico' :
                             alert.severity === 'high' ? 'Alto' :
                             alert.severity === 'warning' ? 'Atención' : 'Info'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="detalle" className="mt-3">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {result.domains.map(domain => (
                  <DomainCard key={domain.id} domain={domain} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!result && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileQuestion className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Selecciona un período para iniciar la supervisión fiscal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analizando datos fiscales...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HRFiscalSupervisorPanel;
