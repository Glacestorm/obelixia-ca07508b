/**
 * SSMonthlyExpedientTab — V2-ES.7 Paso 4
 * Tab integrable en HRSocialSecurityPanel para el expediente interno SS mensual.
 * Muestra: estado del expediente, referencia al período cerrado, conciliación,
 * totales consolidados, y acciones de lifecycle.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, Clock,
  RefreshCw, FileCheck, Link2, ArrowRightLeft, Eye,
  Lock, Unlock, Loader2, ChevronRight, Euro, Users, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSSMonthlyExpedient, type SSMonthlyExpedient } from '@/hooks/erp/hr/useSSMonthlyExpedient';
import {
  SS_EXPEDIENT_STATUS_CONFIG,
  getExpedientReadiness,
  formatExpedientLabel,
  type SSExpedientStatus,
  type SSReconciliationResult,
  type SSReconciliationCheck,
} from '@/engines/erp/hr/ssMonthlyExpedientEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';

interface SSMonthlyExpedientTabProps {
  companyId: string;
  periods: PayrollPeriod[];
}

export function SSMonthlyExpedientTab({ companyId, periods }: SSMonthlyExpedientTabProps) {
  const {
    expedients, isLoading, fetchExpedients,
    consolidateExpedient, reconcileExpedient,
    updateExpedientStatus, createExpedientForPeriod,
  } = useSSMonthlyExpedient(companyId);

  const [selectedExpedient, setSelectedExpedient] = useState<SSMonthlyExpedient | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchExpedients(); }, [fetchExpedients]);

  // Get closed/locked periods
  const closedPeriods = useMemo(() =>
    periods.filter(p => p.status === 'closed' || p.status === 'locked'),
    [periods]
  );

  // Find matching period for an expedient
  const findPeriodForExpedient = useCallback((exp: SSMonthlyExpedient): PayrollPeriod | null => {
    if (exp.period_id) return periods.find(p => p.id === exp.period_id) || null;
    return periods.find(p =>
      p.fiscal_year === exp.period_year && p.period_number === exp.period_month
    ) || null;
  }, [periods]);

  // Get closure snapshot from period metadata
  const getClosureSnapshot = useCallback((period: PayrollPeriod): PeriodClosureSnapshot | null => {
    return (period.metadata as any)?.closure_snapshot || null;
  }, []);

  // ── Actions ──

  const handleConsolidate = useCallback(async (exp: SSMonthlyExpedient) => {
    const period = findPeriodForExpedient(exp);
    if (!period) {
      toast.error('No se encontró un período cerrado para este mes');
      return;
    }
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
    const result = await reconcileExpedient(
      exp.id,
      period?.status || 'unknown',
      snapshot,
    );
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
    await updateExpedientStatus(exp.id, 'ready');
    setActionLoading(null);
  }, [updateExpedientStatus]);

  const handleCreateForPeriod = useCallback(async (period: PayrollPeriod) => {
    setActionLoading(period.id);
    await createExpedientForPeriod(period.fiscal_year, period.period_number, period.id);
    setActionLoading(null);
  }, [createExpedientForPeriod]);

  // ── Status Badge ──
  const getStatusBadge = (status: SSExpedientStatus) => {
    const config = SS_EXPEDIENT_STATUS_CONFIG[status];
    return <Badge className={cn('gap-1 text-[10px]', config.color)}>{config.label}</Badge>;
  };

  // ── Reconciliation Score Color ──
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-destructive';
  };

  // ── Periods without SS expedient ──
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
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleCreateForPeriod(p)}
                      disabled={actionLoading === p.id}
                    >
                      {actionLoading === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Shield className="h-3 w-3 mr-1" />
                      )}
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

            return (
              <Card key={exp.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Progress bar */}
                  <Progress value={readiness.percent} className="h-1 rounded-none" />

                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">
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
                        {exp.reconciliation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
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

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {exp.expedient_status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleConsolidate(exp)}
                          disabled={isActioning}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                          Consolidar con período
                        </Button>
                      )}
                      {['consolidated', 'draft'].includes(exp.expedient_status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleReconcile(exp)}
                          disabled={isActioning}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightLeft className="h-3 w-3" />}
                          Conciliar
                        </Button>
                      )}
                      {exp.expedient_status === 'reconciled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleMarkReviewed(exp)}
                          disabled={isActioning}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          Marcar revisado
                        </Button>
                      )}
                      {exp.expedient_status === 'reviewed' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleMarkReady(exp)}
                          disabled={isActioning}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                          Marcar listo
                        </Button>
                      )}
                      {exp.expedient_status === 'ready' && (
                        <Badge className="bg-green-500/10 text-green-700 gap-1">
                          <Lock className="h-3 w-3" />
                          Listo para presentación
                        </Badge>
                      )}
                      {/* Re-reconcile for any active status */}
                      {!['draft', 'ready', 'submitted'].includes(exp.expedient_status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleReconcile(exp)}
                          disabled={isActioning}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Re-conciliar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reconciliation Detail Dialog */}
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
              {/* Score */}
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

              <Progress
                value={selectedExpedient.reconciliation.score}
                className="h-2"
              />

              {/* Checks table */}
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

              {/* Payroll vs SS comparison */}
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
            <Button variant="outline" onClick={() => setShowReconciliation(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
