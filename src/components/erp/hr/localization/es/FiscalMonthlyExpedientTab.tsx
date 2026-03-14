/**
 * FiscalMonthlyExpedientTab — V2-ES.7 Paso 5
 * Tab integrable en ESLocalizationPlugin para el expediente fiscal mensual interno.
 *
 * NOTA: "Finalizado (interno)" NO equivale a presentación oficial ante AEAT.
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
  Calculator, CheckCircle, AlertTriangle, XCircle,
  RefreshCw, Link2, ArrowRightLeft, Eye,
  Lock, Loader2, Euro, Users, Ban,
  Clock, History, FileText, Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFiscalMonthlyExpedient, type FiscalMonthlyExpedient } from '@/hooks/erp/hr/useFiscalMonthlyExpedient';
import {
  FISCAL_EXPEDIENT_STATUS_CONFIG,
  getFiscalExpedientReadiness,
  formatFiscalExpedientLabel,
  isEndOfTrimester,
  getFiscalTrimester,
  type FiscalExpedientStatus,
  type FiscalReconciliationCheck,
} from '@/engines/erp/hr/fiscalMonthlyExpedientEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FiscalMonthlyExpedientTabProps {
  companyId: string;
  periods: PayrollPeriod[];
}

export function FiscalMonthlyExpedientTab({ companyId, periods }: FiscalMonthlyExpedientTabProps) {
  const {
    expedients, isLoading, fetchExpedients,
    consolidateExpedient, reconcileExpedient,
    updateExpedientStatus, cancelExpedient, finalizeExpedientInternal,
  } = useFiscalMonthlyExpedient(companyId);

  const [selectedExp, setSelectedExp] = useState<FiscalMonthlyExpedient | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showTraceDialog, setShowTraceDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [finalizeNotes, setFinalizeNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchExpedients(); }, [fetchExpedients]);

  const getClosureSnapshot = useCallback((period: PayrollPeriod): PeriodClosureSnapshot | null => {
    return (period.metadata as any)?.closure_snapshot || null;
  }, []);

  const findPeriod = useCallback((exp: FiscalMonthlyExpedient) => {
    return periods.find(p => p.id === exp.period_id) || null;
  }, [periods]);

  // ── Actions ──
  const handleConsolidate = useCallback(async (exp: FiscalMonthlyExpedient) => {
    const period = findPeriod(exp);
    if (!period) return;
    const snapshot = getClosureSnapshot(period);
    setActionLoading(exp.id);
    await consolidateExpedient(exp.id, snapshot, exp.period_year, exp.period_month);
    setActionLoading(null);
  }, [findPeriod, getClosureSnapshot, consolidateExpedient]);

  const handleReconcile = useCallback(async (exp: FiscalMonthlyExpedient) => {
    const period = findPeriod(exp);
    const snapshot = period ? getClosureSnapshot(period) : null;
    setActionLoading(exp.id);
    const result = await reconcileExpedient(exp.id, period?.status || 'unknown', snapshot);
    setActionLoading(null);
    if (result) {
      setSelectedExp({ ...exp, reconciliation: result });
      setShowReconciliation(true);
    }
  }, [findPeriod, getClosureSnapshot, reconcileExpedient]);

  const handleFinalize = useCallback(async () => {
    if (!selectedExp) return;
    setActionLoading(selectedExp.id);
    await finalizeExpedientInternal(selectedExp.id, finalizeNotes);
    setActionLoading(null);
    setShowFinalizeDialog(false);
    setFinalizeNotes('');
  }, [selectedExp, finalizeNotes, finalizeExpedientInternal]);

  const handleCancel = useCallback(async () => {
    if (!selectedExp || !cancelReason.trim()) return;
    setActionLoading(selectedExp.id);
    await cancelExpedient(selectedExp.id, cancelReason);
    setActionLoading(null);
    setShowCancelDialog(false);
    setCancelReason('');
  }, [selectedExp, cancelReason, cancelExpedient]);

  // ── UI helpers ──
  const getStatusBadge = (status: FiscalExpedientStatus) => {
    const config = FISCAL_EXPEDIENT_STATUS_CONFIG[status];
    return (
      <TooltipProvider><Tooltip><TooltipTrigger>
        <Badge className={cn('gap-1 text-[10px]', config.color)}>{config.label}</Badge>
      </TooltipTrigger><TooltipContent side="top" className="text-xs max-w-[250px]">
        {config.description}
      </TooltipContent></Tooltip></TooltipProvider>
    );
  };

  const getScoreColor = (score: number) =>
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-destructive';

  const fmtDate = (d: string | null) => {
    if (!d) return null;
    try { return formatDistanceToNow(new Date(d), { locale: es, addSuffix: true }); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      {/* Internal-only banner */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded border border-border/50">
        <Calculator className="h-3 w-3 shrink-0" />
        <span>
          Expediente fiscal interno preparatorio (Modelo 111/190) — <strong>"Finalizado (interno)" NO equivale a presentación oficial AEAT</strong>
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : expedients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Calculator className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay expedientes fiscales</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cierra un período de nómina para generar el primer expediente fiscal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expedients.map(exp => {
            const period = findPeriod(exp);
            const readiness = getFiscalExpedientReadiness(exp.expedient_status);
            const isActioning = actionLoading === exp.id;
            const isCancelled = exp.expedient_status === 'cancelled';
            const isFinalized = exp.expedient_status === 'finalized_internal';
            const trimester = getFiscalTrimester(exp.period_month);
            const isEndTrimester = isEndOfTrimester(exp.period_month);

            return (
              <Card key={exp.id} className={cn('overflow-hidden', isCancelled && 'opacity-60')}>
                <CardContent className="p-0">
                  <Progress value={readiness.percent} className="h-1 rounded-none" />
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className={cn('font-medium text-sm', isCancelled && 'line-through')}>
                          {formatFiscalExpedientLabel(exp.period_year, exp.period_month)}
                        </span>
                        {getStatusBadge(exp.expedient_status)}
                        {isEndTrimester && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-amber-500/40 text-amber-700">
                            <FileText className="h-2.5 w-2.5" />
                            Fin {trimester.label} · M111
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {exp.trace?.length > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => { setSelectedExp(exp); setShowTraceDialog(true); }}>
                            <History className="h-3 w-3" />{exp.trace.length}
                          </Button>
                        )}
                        {exp.reconciliation && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => { setSelectedExp(exp); setShowReconciliation(true); }}>
                            <Eye className="h-3 w-3" />
                            <span className={getScoreColor(exp.reconciliation.score)}>
                              {exp.reconciliation.score}%
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Perceptores:</span>
                        <span className="font-medium">{exp.total_irpf_workers || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Base IRPF:</span>
                        <span className="font-medium">
                          {exp.total_irpf_base > 0 ? `€${exp.total_irpf_base.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Retención:</span>
                        <span className="font-medium">
                          {exp.total_irpf_retencion > 0 ? `€${exp.total_irpf_retencion.toLocaleString('es-ES')}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tipo medio:</span>
                        <span className="font-medium">
                          {exp.avg_irpf_rate > 0 ? `${exp.avg_irpf_rate}%` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Period reference */}
                    {period && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <Link2 className="h-3 w-3" />
                        Período: {period.period_name}
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {period.status === 'locked' ? '🔒 Bloqueado' : '✓ Cerrado'}
                        </Badge>
                      </div>
                    )}

                    {/* Traceability */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                      {exp.consolidated_at && (
                        <span className="flex items-center gap-1"><Link2 className="h-2.5 w-2.5" />Consolidado {fmtDate(exp.consolidated_at)}</span>
                      )}
                      {exp.reconciled_at && (
                        <span className="flex items-center gap-1"><ArrowRightLeft className="h-2.5 w-2.5" />Conciliado {fmtDate(exp.reconciled_at)}</span>
                      )}
                      {exp.reviewed_at && (
                        <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" />Revisado {fmtDate(exp.reviewed_at)}</span>
                      )}
                      {exp.finalized_internal_at && (
                        <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Finalizado {fmtDate(exp.finalized_internal_at)}</span>
                      )}
                      {exp.cancelled_at && (
                        <span className="flex items-center gap-1 text-destructive"><Ban className="h-2.5 w-2.5" />Cancelado {fmtDate(exp.cancelled_at)}</span>
                      )}
                    </div>

                    {/* Reconciliation inline */}
                    {exp.reconciliation && (
                      <div className={cn(
                        'flex items-center gap-2 text-[10px] px-2 py-1 rounded',
                        exp.reconciliation.status === 'balanced' ? 'bg-emerald-500/10 text-emerald-700'
                          : exp.reconciliation.status === 'incomplete' ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-destructive/10 text-destructive'
                      )}>
                        {exp.reconciliation.status === 'balanced' ? <CheckCircle className="h-3 w-3" />
                          : exp.reconciliation.status === 'incomplete' ? <AlertTriangle className="h-3 w-3" />
                            : <XCircle className="h-3 w-3" />}
                        Conciliación fiscal: {exp.reconciliation.passed}/{exp.reconciliation.total_checks} checks
                        {exp.reconciliation.warnings > 0 && ` · ${exp.reconciliation.warnings} avisos`}
                      </div>
                    )}

                    {isFinalized && (
                      <div className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded bg-green-600/10 text-green-800 border border-green-600/20">
                        <Lock className="h-3 w-3" />
                        <span className="font-medium">Expediente fiscal interno finalizado</span>
                        <span className="text-muted-foreground">— No equivale a presentación oficial AEAT</span>
                      </div>
                    )}

                    {/* Actions */}
                    {!isCancelled && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {exp.expedient_status === 'draft' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleConsolidate(exp)} disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                            Consolidar datos fiscales
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
                            onClick={async () => { setActionLoading(exp.id); await updateExpedientStatus(exp.id, 'reviewed'); setActionLoading(null); }}
                            disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            Marcar revisado
                          </Button>
                        )}
                        {exp.expedient_status === 'reviewed' && (
                          <Button size="sm" className="h-7 text-xs gap-1"
                            onClick={async () => { setActionLoading(exp.id); await updateExpedientStatus(exp.id, 'ready_internal'); setActionLoading(null); }}
                            disabled={isActioning}>
                            {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            Listo (interno)
                          </Button>
                        )}
                        {exp.expedient_status === 'ready_internal' && (
                          <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => { setSelectedExp(exp); setShowFinalizeDialog(true); }}
                            disabled={isActioning}>
                            <Lock className="h-3 w-3" /> Finalizar (interno)
                          </Button>
                        )}
                        {!['draft', 'ready_internal', 'finalized_internal', 'cancelled'].includes(exp.expedient_status) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleReconcile(exp)} disabled={isActioning}>
                            <RefreshCw className="h-3 w-3" /> Re-conciliar
                          </Button>
                        )}
                        {!['finalized_internal', 'cancelled'].includes(exp.expedient_status) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => { setSelectedExp(exp); setShowCancelDialog(true); }}
                            disabled={isActioning}>
                            <Ban className="h-3 w-3" /> Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                    {isCancelled && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                        onClick={async () => { setActionLoading(exp.id); await updateExpedientStatus(exp.id, 'draft', 'Reactivado'); setActionLoading(null); }}
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

      {/* Reconciliation Dialog */}
      <Dialog open={showReconciliation} onOpenChange={setShowReconciliation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> Conciliación Nómina ↔ Fiscal
            </DialogTitle>
            <DialogDescription>
              {selectedExp && formatFiscalExpedientLabel(selectedExp.period_year, selectedExp.period_month)}
            </DialogDescription>
          </DialogHeader>
          {selectedExp?.reconciliation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', getScoreColor(selectedExp.reconciliation.score))}>
                    {selectedExp.reconciliation.score}%
                  </span>
                  <Badge className={cn(
                    selectedExp.reconciliation.status === 'balanced' ? 'bg-emerald-500/10 text-emerald-700'
                      : selectedExp.reconciliation.status === 'incomplete' ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-destructive/10 text-destructive'
                  )}>
                    {selectedExp.reconciliation.status === 'balanced' ? 'Cuadrado'
                      : selectedExp.reconciliation.status === 'incomplete' ? 'Incompleto' : 'Discrepancias'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedExp.reconciliation.passed}/{selectedExp.reconciliation.total_checks} checks
                </span>
              </div>
              <Progress value={selectedExp.reconciliation.score} className="h-2" />
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
                    {selectedExp.reconciliation.checks.map((check: FiscalReconciliationCheck) => (
                      <TableRow key={check.id}>
                        <TableCell className="text-xs">{check.label}</TableCell>
                        <TableCell>
                          {check.passed ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            : check.severity === 'error' ? <XCircle className="h-3.5 w-3.5 text-destructive" />
                              : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{check.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconciliation(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Finalizar expediente fiscal (interno)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 px-3 py-2 rounded">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>NO equivale a presentación oficial ante AEAT.</span>
            </div>
            <Textarea placeholder="Notas (opcional)..." value={finalizeNotes} onChange={e => setFinalizeNotes(e.target.value)} rows={3} />
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

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="h-5 w-5" />Cancelar expediente fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Motivo <strong>(obligatorio)</strong>:</p>
            <Textarea placeholder="Motivo..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || !!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
              Cancelar expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trace Dialog */}
      <Dialog open={showTraceDialog} onOpenChange={setShowTraceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historial fiscal</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {(selectedExp?.trace || []).slice().reverse().map((entry, i) => (
                <div key={i} className="flex gap-3 text-xs border-l-2 border-border pl-3 py-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {FISCAL_EXPEDIENT_STATUS_CONFIG[entry.status_to]?.label || entry.status_to}
                      </Badge>
                      <span className="text-muted-foreground">
                        ← {FISCAL_EXPEDIENT_STATUS_CONFIG[entry.status_from]?.label || entry.status_from}
                      </span>
                    </div>
                    {entry.notes && <p className="text-muted-foreground mt-0.5">{entry.notes}</p>}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />{fmtDate(entry.performed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter><Button variant="outline" onClick={() => setShowTraceDialog(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
