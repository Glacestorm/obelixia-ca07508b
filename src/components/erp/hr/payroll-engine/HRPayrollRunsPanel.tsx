/**
 * HRPayrollRunsPanel — V2-ES.7 Paso 2
 * Gestión visual de payroll runs: crear, ejecutar, comparar, auditar
 * Se integra como tab en HRPayrollEngine
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Play, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, ArrowUpDown, Eye, Loader2, Info, Archive, FileText
} from 'lucide-react';
import { usePayrollRuns } from '@/hooks/erp/hr/usePayrollRuns';
import {
  type PayrollRun,
  type PayrollRunStatus,
  RUN_STATUS_CONFIG,
  RUN_TYPE_LABELS,
  formatRunLabel,
  isRunTerminal,
  isRunActive,
  type SnapshotInput,
  type PayrollRunSnapshot,
  type PayrollRunValidationSummary,
} from '@/engines/erp/hr/payrollRunEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  periods: PayrollPeriod[];
  selectedPeriodId: string | null;
  onSelectPeriod: (id: string | null) => void;
  onBatchCalculateES?: (periodId: string) => Promise<{ calculated: number; skipped: number; errors: number } | null>;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  clock: <Clock className="h-3.5 w-3.5" />,
  loader: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  check: <CheckCircle className="h-3.5 w-3.5" />,
  alert: <AlertTriangle className="h-3.5 w-3.5" />,
  x: <XCircle className="h-3.5 w-3.5" />,
  archive: <Archive className="h-3.5 w-3.5" />,
};

export function HRPayrollRunsPanel({ companyId, periods, selectedPeriodId, onSelectPeriod, onBatchCalculateES }: Props) {
  const { runs, activeRun, isLoading, setActiveRun, fetchRuns, createRun, executeRun } = usePayrollRuns(companyId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [createNotes, setCreateNotes] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const selectedPeriod = useMemo(
    () => periods.find(p => p.id === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  useEffect(() => {
    if (selectedPeriodId) fetchRuns(selectedPeriodId);
  }, [selectedPeriodId, fetchRuns]);

  // ── Create Run ──
  const handleCreateRun = useCallback(async () => {
    if (!selectedPeriod) return;

    const snapshotInput: SnapshotInput = {
      period: {
        id: selectedPeriod.id,
        period_name: selectedPeriod.period_name,
        fiscal_year: selectedPeriod.fiscal_year,
        period_number: selectedPeriod.period_number,
        start_date: selectedPeriod.start_date,
        end_date: selectedPeriod.end_date,
        status: selectedPeriod.status,
      },
      incidents: [],  // Will be enriched when incidents are loaded
      conceptCount: 44,
      earningCount: 24,
      deductionCount: 10,
      employeeIds: [],  // Will be populated from employee scope
      runParams: {},
    };

    // Fetch employees in scope
    try {
      const { data: employees } = await (await import('@/integrations/supabase/client')).supabase
        .from('erp_hr_employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      
      if (employees) {
        snapshotInput.employeeIds = employees.map((e: any) => e.id);
      }

      // Fetch incidents for period
      const { data: incidents } = await (await import('@/integrations/supabase/client')).supabase
        .from('erp_hr_payroll_incidents')
        .select('status, incident_type')
        .eq('company_id', companyId)
        .eq('period_id', selectedPeriod.id);

      if (incidents) {
        snapshotInput.incidents = incidents as any[];
      }
    } catch { /* graceful degradation */ }

    const run = await createRun(snapshotInput, createNotes || undefined);
    if (run) {
      setShowCreateDialog(false);
      setCreateNotes('');
    }
  }, [selectedPeriod, companyId, createNotes, createRun]);

  // ── Execute Run ──
  const handleExecuteRun = useCallback(async (run: PayrollRun) => {
    if (!onBatchCalculateES) {
      return;
    }
    setIsExecuting(true);
    try {
      await executeRun(run.id, onBatchCalculateES);
      if (selectedPeriodId) await fetchRuns(selectedPeriodId);
    } finally {
      setIsExecuting(false);
    }
  }, [onBatchCalculateES, executeRun, selectedPeriodId, fetchRuns]);

  // ── Run Progress ──
  const getProgress = (run: PayrollRun) => {
    if (run.total_employees === 0) return 0;
    return Math.round(((run.employees_calculated + run.employees_errored + run.employees_skipped) / run.total_employees) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedPeriodId || ''} onValueChange={(v) => onSelectPeriod(v || null)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Seleccionar período..." />
          </SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.period_name} — {p.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={!selectedPeriod || isExecuting}
          size="sm"
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Nuevo Run
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectedPeriodId && fetchRuns(selectedPeriodId)}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* No period selected */}
      {!selectedPeriodId && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Selecciona un período para ver las ejecuciones de nómina</p>
          </CardContent>
        </Card>
      )}

      {/* Runs list */}
      {selectedPeriodId && (
        <div className="space-y-2">
          {runs.length === 0 && !isLoading && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin ejecuciones para este período</p>
                <p className="text-xs mt-1">Crea un nuevo run para calcular las nóminas</p>
              </CardContent>
            </Card>
          )}

          {runs.map(run => {
            const statusCfg = RUN_STATUS_CONFIG[run.status];
            const progress = getProgress(run);
            const snapshot = run.context_snapshot as PayrollRunSnapshot;

            return (
              <Card
                key={run.id}
                className={cn(
                  "transition-all hover:shadow-sm cursor-pointer",
                  run.status === 'superseded' && "opacity-60",
                  activeRun?.id === run.id && "ring-2 ring-primary/30"
                )}
                onClick={() => { setActiveRun(run); setShowDetailSheet(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md", statusCfg.color)}>
                        {STATUS_ICON[statusCfg.icon]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatRunLabel(run)}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.started_at
                            ? formatDistanceToNow(new Date(run.started_at), { locale: es, addSuffix: true })
                            : 'Pendiente'}
                          {' · '}
                          {snapshot?.employees?.total_in_scope || 0} empleados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Totals badge */}
                      {isRunTerminal(run.status) && run.status !== 'failed' && run.status !== 'cancelled' && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(run.total_net)}
                        </Badge>
                      )}

                      {/* Status badge */}
                      <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>

                      {/* Execute button */}
                      {run.status === 'pending' && onBatchCalculateES && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-xs"
                          disabled={isExecuting}
                          onClick={(e) => { e.stopPropagation(); handleExecuteRun(run); }}
                        >
                          {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Ejecutar
                        </Button>
                      )}

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Progress bar for running */}
                  {run.status === 'running' && (
                    <div className="mt-3">
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {run.employees_calculated}/{run.total_employees} calculados
                      </p>
                    </div>
                  )}

                  {/* Warnings/errors summary */}
                  {run.warnings && (run.warnings as any[]).length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      {(run.warnings as any[]).length} aviso(s)
                    </div>
                  )}

                  {/* Diff summary */}
                  {run.diff_summary && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <ArrowUpDown className="h-3 w-3" />
                      <span>vs Run #{(run.diff_summary as any).previous_run_number}: </span>
                      <span className={cn(
                        (run.diff_summary as any).diff_net > 0 ? 'text-green-600' : (run.diff_summary as any).diff_net < 0 ? 'text-destructive' : ''
                      )}>
                        {(run.diff_summary as any).diff_net > 0 ? '+' : ''}
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((run.diff_summary as any).diff_net)} neto
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Run Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Run de Nómina</DialogTitle>
            <DialogDescription>
              Se capturará un snapshot del contexto actual (empleados, incidencias, conceptos) antes de iniciar el cálculo.
            </DialogDescription>
          </DialogHeader>

          {selectedPeriod && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Período:</strong> {selectedPeriod.period_name}</p>
                <p><strong>Estado:</strong> {selectedPeriod.status}</p>
                <p><strong>Fechas:</strong> {selectedPeriod.start_date} → {selectedPeriod.end_date}</p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Operación interna</p>
                  <p className="mt-0.5">Este run es un cálculo interno de nómina. No constituye liquidación oficial ni comunicación a organismos externos.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas (opcional)</label>
                <Textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Motivo del run, contexto, observaciones..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateRun} className="gap-1.5">
              <Play className="h-4 w-4" />
              Crear Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Sheet ── */}
      <Dialog open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <DialogContent className="max-w-lg">
          {activeRun && (
            <>
              <DialogHeader>
                <DialogTitle>{formatRunLabel(activeRun)}</DialogTitle>
                <DialogDescription>
                  Detalle completo de la ejecución de nómina
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-2">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <Badge className={cn(RUN_STATUS_CONFIG[activeRun.status].color, "text-xs")}>
                      {STATUS_ICON[RUN_STATUS_CONFIG[activeRun.status].icon]}
                      <span className="ml-1">{RUN_STATUS_CONFIG[activeRun.status].label}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {RUN_TYPE_LABELS[activeRun.run_type]}
                    </span>
                  </div>

                  {/* Totals */}
                  {isRunTerminal(activeRun.status) && activeRun.status !== 'cancelled' && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Bruto</p>
                          <p className="text-sm font-bold font-mono">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(activeRun.total_gross)}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Neto</p>
                          <p className="text-sm font-bold font-mono">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(activeRun.total_net)}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Deducciones</p>
                          <p className="text-sm font-bold font-mono">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(activeRun.total_deductions)}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Coste empresa</p>
                          <p className="text-sm font-bold font-mono">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(activeRun.total_employer_cost)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground">Calculados</p>
                          <p className="font-bold text-green-600">{activeRun.employees_calculated}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Omitidos</p>
                          <p className="font-bold text-amber-600">{activeRun.employees_skipped}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Errores</p>
                          <p className="font-bold text-destructive">{activeRun.employees_errored}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Validation summary */}
                  {activeRun.validation_summary && (activeRun.validation_summary as PayrollRunValidationSummary).checks && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-2">Validación pre-run</p>
                        <div className="space-y-1">
                          {((activeRun.validation_summary as PayrollRunValidationSummary).checks || []).map((check) => (
                            <div key={check.id} className="flex items-center gap-2 text-xs">
                              {check.passed
                                ? <CheckCircle className="h-3 w-3 text-green-500" />
                                : check.severity === 'error'
                                  ? <XCircle className="h-3 w-3 text-destructive" />
                                  : <AlertTriangle className="h-3 w-3 text-amber-500" />
                              }
                              <span className={!check.passed ? 'text-destructive' : ''}>{check.label}</span>
                              {check.detail && <span className="text-muted-foreground ml-auto">{check.detail}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Warnings */}
                  {activeRun.warnings && (activeRun.warnings as any[]).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-2 text-amber-600">Avisos ({(activeRun.warnings as any[]).length})</p>
                        {(activeRun.warnings as any[]).map((w: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5" />
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Errors */}
                  {activeRun.errors && (activeRun.errors as any[]).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-2 text-destructive">Errores ({(activeRun.errors as any[]).length})</p>
                        {(activeRun.errors as any[]).map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                            <XCircle className="h-3 w-3 text-destructive mt-0.5" />
                            <span>{e.message}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Diff */}
                  {activeRun.diff_summary && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-2">Comparación vs Run #{(activeRun.diff_summary as any).previous_run_number}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                          {[
                            { label: 'Δ Bruto', value: (activeRun.diff_summary as any).diff_gross },
                            { label: 'Δ Neto', value: (activeRun.diff_summary as any).diff_net },
                            { label: 'Δ Coste', value: (activeRun.diff_summary as any).diff_employer_cost },
                          ].map(({ label, value }) => (
                            <div key={label} className="p-2 rounded bg-muted/50">
                              <p className="text-muted-foreground">{label}</p>
                              <p className={cn("font-mono font-bold", value > 0 ? 'text-green-600' : value < 0 ? 'text-destructive' : '')}>
                                {value > 0 ? '+' : ''}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Snapshot info */}
                  {activeRun.context_snapshot && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-2">Snapshot de contexto</p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Versión: {(activeRun.context_snapshot as PayrollRunSnapshot).version || '?'}</p>
                          <p>Capturado: {(activeRun.context_snapshot as PayrollRunSnapshot).captured_at || '?'}</p>
                          <p>Empleados: {(activeRun.context_snapshot as PayrollRunSnapshot).employees?.total_in_scope || 0}</p>
                          <p>Incidencias: {(activeRun.context_snapshot as PayrollRunSnapshot).incidents?.total || 0} ({(activeRun.context_snapshot as PayrollRunSnapshot).incidents?.pending_count || 0} pendientes)</p>
                          <p>Conceptos: {(activeRun.context_snapshot as PayrollRunSnapshot).concepts?.total_active || 0}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {activeRun.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium mb-1">Notas</p>
                        <p className="text-xs text-muted-foreground">{activeRun.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Timestamps */}
                  <Separator />
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>Creado: {new Date(activeRun.created_at).toLocaleString('es-ES')}</p>
                    {activeRun.started_at && <p>Iniciado: {new Date(activeRun.started_at).toLocaleString('es-ES')}</p>}
                    {activeRun.completed_at && <p>Completado: {new Date(activeRun.completed_at).toLocaleString('es-ES')}</p>}
                  </div>

                  {/* Disclaimer */}
                  <div className="p-2.5 rounded-lg border border-muted bg-muted/30 text-[10px] text-muted-foreground">
                    <strong>Nota:</strong> Este run es una ejecución interna de cálculo. No constituye liquidación oficial, ni comunicación a TGSS, AEAT o SEPE.
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRPayrollRunsPanel;
