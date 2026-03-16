/**
 * MonthlyClosingControlCenter — V2-RRHH-FASE-3
 * Main UI panel for monthly closing orchestration.
 * Connects to useMonthlyClosing + existing payroll engine.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Lock, Unlock,
  ClipboardList, ShieldCheck, Package, History, RefreshCw,
  ArrowRight, Play, BarChart3, FileText,
} from 'lucide-react';
import { useMonthlyClosing, type MonthlyClosingData } from '@/hooks/erp/hr/useMonthlyClosing';
import { CLOSING_PHASE_CONFIG, type ClosingCheckItem, type MonthlyClosingPhase } from '@/engines/erp/hr/monthlyClosingOrchestrationEngine';
import { LedgerTimelinePanel } from '../ledger/LedgerTimelinePanel';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  period: PayrollPeriod | null;
  onClosePeriod: (periodId: string) => Promise<{ success: boolean; snapshot?: any }>;
  onLockPeriod: (periodId: string) => Promise<boolean>;
  onReopenPeriod: (periodId: string, reason: string) => Promise<boolean>;
  className?: string;
}

export function MonthlyClosingControlCenter({
  companyId,
  period,
  onClosePeriod,
  onLockPeriod,
  onReopenPeriod,
  className,
}: Props) {
  const { data, isLoading, loadClosingContext, executeClosingWithAudit, recordReopenInLedger, recordLockInLedger } = useMonthlyClosing(companyId);
  const [activeTab, setActiveTab] = useState('checklist');
  const [reopenReason, setReopenReason] = useState('');

  // Load context when period changes
  useEffect(() => {
    if (period) {
      loadClosingContext(period);
    }
  }, [period?.id, period?.status]);

  // ── Handlers ──

  const handleClose = useCallback(async () => {
    if (!period) return;
    const success = await executeClosingWithAudit(period, onClosePeriod);
    if (success) {
      loadClosingContext({ ...period, status: 'closed' as any });
    }
  }, [period, executeClosingWithAudit, onClosePeriod, loadClosingContext]);

  const handleLock = useCallback(async () => {
    if (!period) return;
    const success = await onLockPeriod(period.id);
    if (success) {
      await recordLockInLedger(period.id);
    }
  }, [period, onLockPeriod, recordLockInLedger]);

  const handleReopen = useCallback(async () => {
    if (!period || !reopenReason.trim()) return;
    const success = await onReopenPeriod(period.id, reopenReason);
    if (success) {
      await recordReopenInLedger(period.id, reopenReason);
      setReopenReason('');
    }
  }, [period, reopenReason, onReopenPeriod, recordReopenInLedger]);

  if (!period) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Seleccione un período para gestionar el cierre mensual</p>
        </CardContent>
      </Card>
    );
  }

  const phaseConfig = CLOSING_PHASE_CONFIG[data.phase];
  const phasePct = Math.max(0, Math.min(100, (phaseConfig.step / 7) * 100));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Centro de Control — Cierre Mensual</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {period.period_name} · {period.fiscal_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("gap-1", phaseConfig.color)}>
              {phaseConfig.label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => period && loadClosingContext(period)} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Phase progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progreso del cierre</span>
            <span>{data.checklist?.overallScore ?? 0}% checklist</span>
          </div>
          <Progress value={phasePct} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>Preparación</span>
            <span>Validación</span>
            <span>Cierre</span>
            <span>Post-cierre</span>
            <span>Completo</span>
          </div>
        </div>

        {/* Quick KPIs */}
        {data.kpis && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            <KpiCard label="Empleados" value={data.kpis.employee_count.toString()} />
            <KpiCard label="Bruto" value={`${(data.kpis.total_gross / 1000).toFixed(1)}k€`} />
            <KpiCard label="Neto" value={`${(data.kpis.total_net / 1000).toFixed(1)}k€`} />
            <KpiCard label="Coste empresa" value={`${(data.kpis.total_employer_cost / 1000).toFixed(1)}k€`} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="checklist" className="text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Checklist
              {data.checklist && data.checklist.blockers > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">{data.checklist.blockers}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outputs" className="text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />
              Outputs
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1">
              <History className="h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Inteligencia
            </TabsTrigger>
          </TabsList>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-0">
            <ScrollArea className="h-[400px]">
              {data.checklist ? (
                <div className="space-y-1.5">
                  {data.checklist.items.map(item => (
                    <ChecklistRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Cargando checklist...
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <Separator className="my-3" />
            <ClosingActions
              phase={data.phase}
              canProceed={data.checklist?.canProceed ?? false}
              isLoading={isLoading}
              reopenReason={reopenReason}
              onReopenReasonChange={setReopenReason}
              onClose={handleClose}
              onLock={handleLock}
              onReopen={handleReopen}
            />
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {data.outputs.map(output => (
                  <div key={output.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      output.status === 'generated' ? 'bg-emerald-100 text-emerald-600' :
                      output.status === 'error' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground',
                    )}>
                      {output.status === 'generated' ? <CheckCircle2 className="h-4 w-4" /> :
                       output.status === 'error' ? <XCircle className="h-4 w-4" /> :
                       <FileText className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{output.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {output.status === 'generated' && output.generatedAt
                          ? `Generado ${formatDistanceToNow(new Date(output.generatedAt), { locale: es, addSuffix: true })}`
                          : output.status === 'error' ? 'Error en generación'
                          : 'Pendiente'}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      output.status === 'generated' ? 'border-emerald-300 text-emerald-700' :
                      output.status === 'error' ? 'border-destructive text-destructive' : '',
                    )}>
                      {output.status === 'generated' ? 'Generado' : output.status === 'error' ? 'Error' : 'Pendiente'}
                    </Badge>
                  </div>
                ))}

                {data.outputs.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Sin outputs generados aún
                  </div>
                )}

                {/* Expedient readiness summary */}
                {data.expedientReadiness && (
                  <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                    <h4 className="text-xs font-medium mb-2">Expedientes mensuales</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">SS:</span>{' '}
                        <Badge variant="outline" className="text-[10px]">
                          {data.expedientReadiness.ss_status || 'Sin generar'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fiscal:</span>{' '}
                        <Badge variant="outline" className="text-[10px]">
                          {data.expedientReadiness.fiscal_status || 'Sin generar'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-0">
            <ScrollArea className="h-[400px]">
              {data.timeline.length > 0 ? (
                <div className="space-y-1">
                  {data.timeline.map(event => (
                    <div key={event.id} className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg border-l-4",
                      event.severity === 'success' ? 'border-l-emerald-500 bg-emerald-50/30' :
                      event.severity === 'warning' ? 'border-l-amber-500 bg-amber-50/30' :
                      event.severity === 'error' ? 'border-l-red-500 bg-red-50/30' :
                      'border-l-blue-500 bg-blue-50/30',
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.action}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(event.timestamp), 'HH:mm:ss', { locale: es })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Sin eventos de cierre registrados
                </div>
              )}

              {/* Ledger events for this period */}
              {period && (
                <div className="mt-4">
                  <LedgerTimelinePanel
                    companyId={companyId}
                    entityType="payroll_period"
                    entityId={period.id}
                    title="Eventos del Ledger"
                    maxHeight="300px"
                  />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Intelligence Tab */}
          <TabsContent value="intelligence" className="mt-0">
            <ScrollArea className="h-[400px]">
              {data.intelligenceReport ? (
                <div className="space-y-4">
                  {/* Confidence score */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Confianza del cierre</h4>
                      <Badge className={cn(
                        data.intelligenceReport.confidence.level === 'high' ? 'bg-emerald-100 text-emerald-800' :
                        data.intelligenceReport.confidence.level === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800',
                      )}>
                        {data.intelligenceReport.confidence.overall}% — {data.intelligenceReport.confidence.label}
                      </Badge>
                    </div>
                    <Progress value={data.intelligenceReport.confidence.overall} className="h-2" />
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
                      <div>Validación: {data.intelligenceReport.confidence.breakdown.validation_score}/25</div>
                      <div>Run: {data.intelligenceReport.confidence.breakdown.run_integrity_score}/25</div>
                      <div>Expedientes: {data.intelligenceReport.confidence.breakdown.expedient_score}/25</div>
                      <div>Datos: {data.intelligenceReport.confidence.breakdown.data_completeness}/25</div>
                    </div>
                  </div>

                  {/* Narrative */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="text-sm font-medium mb-2">Resumen narrativo</h4>
                    <p className="text-sm text-muted-foreground">{data.intelligenceReport.narrative.summary}</p>
                    {data.intelligenceReport.narrative.details.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {data.intelligenceReport.narrative.details.map((d, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Discrepancies */}
                  {data.intelligenceReport.discrepancies.length > 0 && (
                    <div className="p-4 rounded-lg border bg-card">
                      <h4 className="text-sm font-medium mb-2">
                        Observaciones ({data.intelligenceReport.discrepancies.length})
                      </h4>
                      <div className="space-y-2">
                        {data.intelligenceReport.discrepancies.map(d => (
                          <div key={d.id} className="flex items-start gap-2 text-xs">
                            {d.severity === 'error' ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> :
                             d.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                             <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />}
                            <div>
                              <p className="font-medium">{d.title}</p>
                              <p className="text-muted-foreground">{d.explanation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimers */}
                  <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
                    {data.intelligenceReport.narrative.disclaimers.map((d, i) => (
                      <p key={i}>⚠ {d}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {['closed', 'locked'].includes(period?.status || '') 
                    ? 'Generando informe de inteligencia...' 
                    : 'El informe de inteligencia se genera al cerrar el período'}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Sub-components ──

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg border bg-card text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function ChecklistRow({ item }: { item: ClosingCheckItem }) {
  const Icon = item.severity === 'ok' ? CheckCircle2 :
               item.severity === 'blocker' ? XCircle :
               item.severity === 'warning' ? AlertTriangle : Info;
  const iconColor = item.severity === 'ok' ? 'text-emerald-500' :
                    item.severity === 'blocker' ? 'text-destructive' :
                    item.severity === 'warning' ? 'text-amber-500' : 'text-blue-400';

  return (
    <div className={cn(
      "flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors",
      item.severity === 'blocker' ? 'border-destructive/30 bg-destructive/5' :
      item.severity === 'warning' ? 'border-amber-300/30 bg-amber-50/20' :
      'border-border bg-card',
    )}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm">{item.label}</p>
        {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">{item.category}</Badge>
    </div>
  );
}

function ClosingActions({
  phase,
  canProceed,
  isLoading,
  reopenReason,
  onReopenReasonChange,
  onClose,
  onLock,
  onReopen,
}: {
  phase: MonthlyClosingPhase;
  canProceed: boolean;
  isLoading: boolean;
  reopenReason: string;
  onReopenReasonChange: (v: string) => void;
  onClose: () => void;
  onLock: () => void;
  onReopen: () => void;
}) {
  if (phase === 'completed') {
    return (
      <div className="text-center py-3">
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-emerald-700">Cierre completado y bloqueado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Close action */}
      {['not_started', 'preparation', 'validation', 'ready_to_close'].includes(phase) && (
        <Button
          onClick={onClose}
          disabled={!canProceed || isLoading}
          className="w-full gap-2"
          variant={canProceed ? 'default' : 'secondary'}
        >
          <Play className="h-4 w-4" />
          {canProceed ? 'Ejecutar cierre mensual' : 'Resuelva los bloqueantes para cerrar'}
        </Button>
      )}

      {/* Lock action */}
      {phase === 'closed' || phase === 'post_close' ? (
        <div className="flex gap-2">
          <Button onClick={onLock} disabled={isLoading} className="flex-1 gap-2" variant="default">
            <Lock className="h-4 w-4" />
            Bloquear período
          </Button>
          <div className="flex-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={reopenReason}
                onChange={e => onReopenReasonChange(e.target.value)}
                placeholder="Motivo de reapertura..."
                className="flex-1 h-9 px-2 text-xs rounded-md border bg-background"
              />
              <Button
                onClick={onReopen}
                disabled={isLoading || reopenReason.trim().length < 5}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Unlock className="h-3.5 w-3.5" />
                Reabrir
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reopened: restart */}
      {phase === 'reopened' && (
        <div className="text-center py-2 px-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-700">Período reabierto — ejecute un nuevo ciclo de cierre</p>
        </div>
      )}
    </div>
  );
}
