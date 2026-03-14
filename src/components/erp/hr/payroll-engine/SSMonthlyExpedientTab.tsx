/**
 * SSMonthlyExpedientTab — V2-ES.7 Paso 4
 * Tab integrable en HRSocialSecurityPanel para el expediente interno SS mensual.
 *
 * NOTA IMPORTANTE:
 * "Finalizado (interno)" NO equivale a presentación oficial ante TGSS/SILTRA.
 * Este componente gestiona exclusivamente el expediente preparatorio interno.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Shield, CheckCircle, AlertTriangle, XCircle,
  RefreshCw, FileCheck, Link2, ArrowRightLeft, Eye,
  Lock, Loader2, Euro, Users, Building2, Ban,
  Clock, User, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSSMonthlyExpedient, type SSMonthlyExpedient } from '@/hooks/erp/hr/useSSMonthlyExpedient';
import {
  SS_EXPEDIENT_STATUS_CONFIG,
  getExpedientReadiness,
  formatExpedientLabel,
  type SSExpedientStatus,
  type SSReconciliationCheck,
} from '@/engines/erp/hr/ssMonthlyExpedientEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SSMonthlyExpedientTabProps {
  companyId: string;
  periods: PayrollPeriod[];
}

export function SSMonthlyExpedientTab({ companyId, periods }: SSMonthlyExpedientTabProps) {
  const {
    expedients, isLoading, fetchExpedients,
    consolidateExpedient, reconcileExpedient,
    updateExpedientStatus, cancelExpedient, finalizeExpedientInternal,
    createExpedientForPeriod,
  } = useSSMonthlyExpedient(companyId);

  const [selectedExpedient, setSelectedExpedient] = useState<SSMonthlyExpedient | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showTraceDialog, setShowTraceDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [finalizeNotes, setFinalizeNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchExpedients(); }, [fetchExpedients]);

  const closedPeriods = useMemo(() =>
    periods.filter(p => p.status === 'closed' || p.status === 'locked'),
    [periods]
  );

  const findPeriodForExpedient = useCallback((exp: SSMonthlyExpedient): PayrollPeriod | null => {
    if (exp.period_id) return periods.find(p => p.id === exp.period_id) || null;
    return periods.find(p =>
      p.fiscal_year === exp.period_year && p.period_number === exp.period_month
    ) || null;
  }, [periods]);

  const getClosureSnapshot = useCallback((period: PayrollPeriod): PeriodClosureSnapshot | null => {
    return (period.metadata as any)?.closure_snapshot || null;
  }, []);

  // ── Actions ──

  const handleConsolidate = useCallback(async (exp: SSMonthlyExpedient) => {
    const period = findPeriodForExpedient(exp);
    if (!period) { toast.error('No se encontró un período cerrado para este mes'); return; }
    if (period.status !== 'closed' && period.status !== 'locked') {
      toast.error('El período debe estar cerrado o bloqueado para consolidar');
      return;
    }
    const snapshot = getClosureSnapshot(period);
    if (!snapshot) {
      toast.warning('Período sin snapshot de cierre — consolidación parcial');
    }
    setActionLoading(exp.id);
    await consolidateExpedient(exp.id, period.id, snapshot!, exp.period_year, exp.period_month);
    setActionLoading(null);
  }, [findPeriodForExpedient, getClosureSnapshot, consolidateExpedient]);

  const handleReconcile = useCallback(async (exp: SSMonthlyExpedient) => {
    const period = findPeriodForExpedient(exp);
    const snapshot = period ? getClosureSnapshot(period) : null;
    setActionLoading(exp.id);
    const result = await reconcileExpedient(exp.id, period?.status || 'unknown', snapshot);
    setActionLoading(null);
    if (result) {
      setSelectedExpedient({ ...exp, reconciliation: result, expedient_status: 'reconciled' });
      setShowReconciliation(true);
    }
  }, [findPeriodForExpedient, getClosureSnapshot, reconcileExpedient]);

  const handleMarkReviewed = useCallback(async (exp: SSMonthlyExpedient) => {
    setActionLoading(exp.id);
    await updateExpedientStatus(exp.id, 'reviewed');
    setActionLoading(null);
  }, [updateExpedientStatus]);

  const handleMarkReady = useCallback(async (exp: SSMonthlyExpedient) => {
    setActionLoading(exp.id);
    await updateExpedientStatus(exp.id, 'ready_internal');
    setActionLoading(null);
  }, [updateExpedientStatus]);

  const handleFinalize = useCallback(async () => {
    if (!selectedExpedient) return;
    setActionLoading(selectedExpedient.id);
    await finalizeExpedientInternal(selectedExpedient.id, finalizeNotes);
    setActionLoading(null);
    setShowFinalizeDialog(false);
    setFinalizeNotes('');
    setSelectedExpedient(null);
  }, [selectedExpedient, finalizeNotes, finalizeExpedientInternal]);

  const handleCancel = useCallback(async () => {
    if (!selectedExpedient || !cancelReason.trim()) return;
    setActionLoading(selectedExpedient.id);
    await cancelExpedient(selectedExpedient.id, cancelReason);
    setActionLoading(null);
    setShowCancelDialog(false);
    setCancelReason('');
    setSelectedExpedient(null);
  }, [selectedExpedient, cancelReason, cancelExpedient]);

  const handleCreateForPeriod = useCallback(async (period: PayrollPeriod) => {
    setActionLoading(period.id);
    await createExpedientForPeriod(period.fiscal_year, period.period_number, period.id);
    setActionLoading(null);
  }, [createExpedientForPeriod]);

  // ── UI helpers ──

  const getStatusBadge = (status: SSExpedientStatus) => {
    const config = SS_EXPEDIENT_STATUS_CONFIG[status];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={cn('gap-1 text-[10px]', config.color)}>{config.label}</Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[250px]">
            {config.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-destructive';
  };

  const formatTraceDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return formatDistanceToNow(new Date(dateStr), { locale: es, addSuffix: true });
    } catch { return dateStr; }
  };

  const periodsWithoutExpedient = useMemo(() =>
    closedPeriods.filter(p =>
      !expedients.some(e =>
        e.period_year === p.fiscal_year && e.period_month === p.period_number
      )
    ),
    [closedPeriods, expedients]
  );

  return (
    <div className="space-y-4">
      {/* Internal-only banner */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded border border-border/50">
        <Shield className="h-3 w-3 shrink-0" />
        <span>
          Expediente interno preparatorio — <strong>"Finalizado (interno)" NO equivale a presentación oficial TGSS/SILTRA</strong>
        </span>
      </div>

      {/* Periods needing SS expedient */}
      {periodsWithoutExpedient.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Períodos cerrados sin expediente SS</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {periodsWithoutExpedient.map(p => (
                    <Button
                      key={p.id} variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => handleCreateForPeriod(p)}
                      disabled={actionLoading === p.id}
                    >
                      {actionLoading === p.id
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <Shield className="h-3 w-3 mr-1" />}
                      {p.period_name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expedient List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : expedients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay expedientes SS mensuales</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cierra un período de nómina para generar el primer expediente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expedients.map(exp => {
            const period = findPeriodForExpedient(exp);
            const readiness = getExpedientReadiness(exp.expedient_status);
            const isActioning = actionLoading === exp.id;
            const isCancelled = exp.expedient_status === 'cancelled';
            const isFinalized = exp.expedient_status === 'finalized_internal';

            return (
              <Card key={exp.id} className={cn('overflow-hidden', isCancelled && 'opacity-60')}>
                <CardContent className="p-0">
                  <Progress value={readiness.percent} className="h-1 rounded-none" />

                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className={cn('font-medium text-sm', isCancelled && 'line-through')}>
                          {formatExpedientLabel(exp.period_year, exp.period_month)}
                        </span>
                        {getStatusBadge(exp.expedient_status)}
                        {exp.filing_reference && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <FileCheck className="h-2.5 w-2.5" />
                            {exp.filing_reference}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Trace button */}
                        {exp.trace && exp.trace.length > 0 && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => { setSelectedExpedient(exp); setShowTraceDialog(true); }}
                          >
                            <History className="h-3 w-3" />
                            {exp.trace.length}
                          </Button>
                        )}
                        {exp.reconciliation && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => { setSelectedExpedient(exp); setShowReconciliation(true); }}
                          >
                            <Eye className="h-3 w-3" />
                            <span className={getScoreColor(exp.reconciliation.score)}>
                              {exp.reconciliation.score}%
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* KPIs row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Trabajadores:</span>
                        <span className="font-medium">{exp.total_workers || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Base CC:</span>
                        <span className="font-medium">
                          {exp.total_base_cc > 0 ? `€${exp.total_base_cc.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Empresa:</span>
                        <span className="font-medium">
                          {exp.total_company > 0 ? `€${exp.total_company.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Obrera:</span>
                        <span className="font-medium">
                          {exp.total_worker > 0 ? `€${exp.total_worker.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold">
                          {exp.total_amount > 0 ? `€${exp.total_amount.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Period reference */}
                    {period && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <Link2 className="h-3 w-3" />
                        Período: {period.period_name}
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {period.status === 'locked' ? '🔒 Bloqueado' : period.status === 'closed' ? '✓ Cerrado' : period.status}
                        </Badge>
                        {exp.snapshot?.closure_snapshot_ref && (
                          <span>· Run ref: {exp.snapshot.closure_snapshot_ref.substring(0, 8)}…</span>
                        )}
                      </div>
                    )}

                    {/* Traceability summary */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                      {exp.consolidated_at && (
                        <span className="flex items-center gap-1">
                          <Link2 className="h-2.5 w-2.5" />
                          Consolidado {formatTraceDate(exp.consolidated_at)}
                        </span>
                      )}
                      {exp.reconciled_at && (
                        <span className="flex items-center gap-1">
                          <ArrowRightLeft className="h-2.5 w-2.5" />
                          Conciliado {formatTraceDate(exp.reconciled_at)}
                        </span>
                      )}
                      {exp.reviewed_at && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-2.5 w-2.5" />
                          Revisado {formatTraceDate(exp.reviewed_at)}
                        </span>
                      )}
                      {exp.finalized_internal_at && (
                        <span className="flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          Finalizado {formatTraceDate(exp.finalized_internal_at)}
                        </span>
                      )}
                      {exp.cancelled_at && (
                        <span className="flex items-center gap-1 text-destructive">
                          <Ban className="h-2.5 w-2.5" />
                          Cancelado {formatTraceDate(exp.cancelled_at)}
                        </span>
                      )}
                    </div>

                    {/* Reconciliation summary (inline) */}
                    {exp.reconciliation && (
                      <div className={cn(
                        'flex items-center gap-2 text-[10px] px-2 py-1 rounded',
                        exp.reconciliation.status === 'balanced'
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : exp.reconciliation.status === 'incomplete'
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-destructive/10 text-destructive'
                      )}>
                        {exp.reconciliation.status === 'balanced' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : exp.reconciliation.status === 'incomplete' ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Conciliación: {exp.reconciliation.passed}/{exp.reconciliation.total_checks} checks
                        {exp.reconciliation.warnings > 0 && ` · ${exp.reconciliation.warnings} avisos`}
                        {exp.reconciliation.failed > 0 && ` · ${exp.reconciliation.failed} errores`}
                      </div>
                    )}

                    {/* Finalized banner */}
                    {isFinalized && (
                      <div className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded bg-green-600/10 text-green-800 border border-green-600/20">
                        <Lock className="h-3 w-3" />
                        <span className="font-medium">Expediente interno finalizado</span>
                        <span className="text-muted-foreground">— No equivale a presentación oficial TGSS/SILTRA</span>
                      </div>
                    )}

                    {/* Actions */}
                    {!isCancelled && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {exp.expedient_status === 'draft' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleConsolidate(exp)} disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                            Consolidar con período
                          </Button>
                        )}
                        {['consolidated', 'draft'].includes(exp.expedient_status) && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleReconcile(exp)} disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightLeft className="h-3 w-3" />}
                            Conciliar
                          </Button>
                        )}
                        {exp.expedient_status === 'reconciled' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleMarkReviewed(exp)} disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            Marcar revisado
                          </Button>
                        )}
                        {exp.expedient_status === 'reviewed' && (
                          <Button size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleMarkReady(exp)} disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Listo (interno)
                          </Button>
                        )}
                        {exp.expedient_status === 'ready_internal' && (
                          <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => { setSelectedExpedient(exp); setShowFinalizeDialog(true); }}
                            disabled={isActioning}>
                            <Lock className="h-3 w-3" />
                            Finalizar (interno)
                          </Button>
                        )}
                        {/* Re-reconcile */}
                        {!['draft', 'ready_internal', 'finalized_internal', 'cancelled'].includes(exp.expedient_status) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleReconcile(exp)} disabled={isActioning}>
                            <RefreshCw className="h-3 w-3" /> Re-conciliar
                          </Button>
                        )}
                        {/* Cancel — available from active non-terminal states */}
                        {!['finalized_internal', 'cancelled'].includes(exp.expedient_status) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => { setSelectedExpedient(exp); setShowCancelDialog(true); }}
                            disabled={isActioning}>
                            <Ban className="h-3 w-3" /> Cancelar
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Cancelled: reactivate */}
                    {isCancelled && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                        onClick={async () => {
                          setActionLoading(exp.id);
                          await updateExpedientStatus(exp.id, 'draft', 'Reactivado');
                          setActionLoading(null);
                        }}
                        disabled={isActioning}>
                        <RefreshCw className="h-3 w-3" /> Reactivar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Reconciliation Detail Dialog ── */}
      <Dialog open={showReconciliation} onOpenChange={setShowReconciliation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Conciliación Nómina ↔ SS
            </DialogTitle>
            <DialogDescription>
              {selectedExpedient && formatExpedientLabel(selectedExpedient.period_year, selectedExpedient.period_month)}
            </DialogDescription>
          </DialogHeader>

          {selectedExpedient?.reconciliation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', getScoreColor(selectedExpedient.reconciliation.score))}>
                    {selectedExpedient.reconciliation.score}%
                  </span>
                  <Badge className={cn(
                    selectedExpedient.reconciliation.status === 'balanced'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : selectedExpedient.reconciliation.status === 'incomplete'
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-destructive/10 text-destructive'
                  )}>
                    {selectedExpedient.reconciliation.status === 'balanced' ? 'Cuadrado'
                      : selectedExpedient.reconciliation.status === 'incomplete' ? 'Incompleto'
                        : 'Discrepancias'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedExpedient.reconciliation.passed}/{selectedExpedient.reconciliation.total_checks} checks
                </span>
              </div>

              <Progress value={selectedExpedient.reconciliation.score} className="h-2" />

              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Check</TableHead>
                      <TableHead className="text-xs w-16">Estado</TableHead>
                      <TableHead className="text-xs">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExpedient.reconciliation.checks.map((check: SSReconciliationCheck) => (
                      <TableRow key={check.id}>
                        <TableCell className="text-xs">{check.label}</TableCell>
                        <TableCell>
                          {check.passed ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : check.severity === 'error' ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {check.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {selectedExpedient.snapshot && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium mb-1">Datos Nómina (cierre)</p>
                      <div className="space-y-0.5 text-muted-foreground">
                        <p>Bruto: €{selectedExpedient.snapshot.payroll_totals.gross.toLocaleString('es-ES')}</p>
                        <p>Neto: €{selectedExpedient.snapshot.payroll_totals.net.toLocaleString('es-ES')}</p>
                        <p>Coste empresa: €{selectedExpedient.snapshot.payroll_totals.employer_cost.toLocaleString('es-ES')}</p>
                        <p>Empleados: {selectedExpedient.snapshot.payroll_totals.employee_count}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Datos SS (cotizaciones)</p>
                      <div className="space-y-0.5 text-muted-foreground">
                        <p>Total empresa: €{selectedExpedient.total_company.toLocaleString('es-ES')}</p>
                        <p>Total obrera: €{selectedExpedient.total_worker.toLocaleString('es-ES')}</p>
                        <p>Total: €{selectedExpedient.total_amount.toLocaleString('es-ES')}</p>
                        <p>Trabajadores: {selectedExpedient.total_workers}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconciliation(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Finalize Internal Dialog ── */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Finalizar expediente (interno)
            </DialogTitle>
            <DialogDescription>
              {selectedExpedient && formatExpedientLabel(selectedExpedient.period_year, selectedExpedient.period_month)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 px-3 py-2 rounded">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Esta acción finaliza el expediente <strong>internamente</strong>. NO equivale a presentación oficial ante TGSS/SILTRA.</span>
            </div>
            <Textarea
              placeholder="Notas de finalización (opcional)..."
              value={finalizeNotes}
              onChange={e => setFinalizeNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancelar</Button>
            <Button onClick={handleFinalize} disabled={!!actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
              Finalizar internamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Cancelar expediente SS
            </DialogTitle>
            <DialogDescription>
              {selectedExpedient && formatExpedientLabel(selectedExpedient.period_year, selectedExpedient.period_month)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Motivo de cancelación <strong>(obligatorio)</strong>:
            </p>
            <Textarea
              placeholder="Escribe el motivo de cancelación..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel}
              disabled={!cancelReason.trim() || !!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
              Cancelar expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Trace / History Dialog ── */}
      <Dialog open={showTraceDialog} onOpenChange={setShowTraceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial del expediente
            </DialogTitle>
            <DialogDescription>
              {selectedExpedient && formatExpedientLabel(selectedExpedient.period_year, selectedExpedient.period_month)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {(selectedExpedient?.trace || []).slice().reverse().map((entry, i) => (
                <div key={i} className="flex gap-3 text-xs border-l-2 border-border pl-3 py-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {SS_EXPEDIENT_STATUS_CONFIG[entry.status_to]?.label || entry.status_to}
                      </Badge>
                      <span className="text-muted-foreground">
                        ← {SS_EXPEDIENT_STATUS_CONFIG[entry.status_from]?.label || entry.status_from}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-muted-foreground mt-0.5">{entry.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTraceDate(entry.performed_at)}
                      {entry.performed_by && (
                        <>
                          <User className="h-2.5 w-2.5 ml-1" />
                          {entry.performed_by.substring(0, 8)}…
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTraceDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
