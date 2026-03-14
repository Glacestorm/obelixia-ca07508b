/**
 * HRPayrollPeriodManager — V2-ES.7 Paso 3: cierre formal + resumen ejecutivo
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Calendar, Plus, Lock, Unlock, RefreshCw, CheckCircle,
  AlertTriangle, Play, Eye, Calculator, TrendingUp, Loader2, Send,
  ShieldCheck, RotateCcw, Euro, Users, FileText, Info
} from 'lucide-react';
import type { PayrollPeriod, PeriodStatus, PreCloseValidation } from '@/hooks/erp/hr/usePayrollEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';
import { ActiveRunIndicator } from './ActiveRunIndicator';
import { SSExpedientPeriodBadge } from './SSExpedientPeriodBadge';

interface Props {
  companyId: string;
  periods: PayrollPeriod[];
  isLoading: boolean;
  onOpenPeriod: (year: number, month: number) => Promise<PayrollPeriod | null>;
  onUpdateStatus: (periodId: string, status: PeriodStatus) => Promise<void>;
  onValidatePreClose: (periodId: string) => Promise<PreCloseValidation[]>;
  onSelectPeriod: (id: string) => void;
  onRefresh: () => void;
  onBatchCalculateES?: (periodId: string) => Promise<{ calculated: number; skipped: number; errors: number } | null>;
  onBatchDiff?: (periodId: string) => Promise<{ computed: number; errors: number } | null>;
  onStartApprovalWorkflow?: (periodId: string) => Promise<{ started: number; skipped: number; errors: number } | null>;
  // V2-ES.7 Paso 3 — Period Close
  onClosePeriod?: (periodId: string) => Promise<{ success: boolean; snapshot?: PeriodClosureSnapshot }>;
  onLockPeriod?: (periodId: string) => Promise<boolean>;
  onReopenPeriod?: (periodId: string, reason: string) => Promise<boolean>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  open: { label: 'Abierto', variant: 'default' },
  calculating: { label: 'Calculando', variant: 'secondary' },
  calculated: { label: 'Calculado', variant: 'secondary' },
  reviewing: { label: 'En revisión', variant: 'secondary' },
  closing: { label: 'Cerrando', variant: 'destructive' },
  closed: { label: 'Cerrado', variant: 'destructive' },
  locked: { label: 'Bloqueado', variant: 'destructive' },
};

const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export function HRPayrollPeriodManager({
  companyId, periods, isLoading, onOpenPeriod, onUpdateStatus,
  onValidatePreClose, onSelectPeriod, onRefresh,
  onBatchCalculateES, onBatchDiff, onStartApprovalWorkflow,
  onClosePeriod, onLockPeriod, onReopenPeriod,
}: Props) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<PreCloseValidation[]>([]);
  const [validatingPeriodId, setValidatingPeriodId] = useState<string | null>(null);
  const [batchCalcLoading, setBatchCalcLoading] = useState<string | null>(null);
  const [batchDiffLoading, setBatchDiffLoading] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState<string | null>(null);
  const [lockLoading, setLockLoading] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{ periodId: string; type: string; message: string } | null>(null);
  // Reopen
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenPeriodId, setReopenPeriodId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenLoading, setReopenLoading] = useState(false);

  const handleCreate = async () => {
    await onOpenPeriod(newYear, newMonth);
    setShowNewDialog(false);
  };

  const handleValidate = async (periodId: string) => {
    setValidatingPeriodId(periodId);
    const results = await onValidatePreClose(periodId);
    setValidationResults(results);
    setShowValidation(true);
  };

  const handleClose = async () => {
    if (!validatingPeriodId || !onClosePeriod) return;
    const hasBlockingErrors = validationResults.some(v => !v.passed && v.severity === 'error');
    if (hasBlockingErrors) return;
    setCloseLoading(validatingPeriodId);
    await onClosePeriod(validatingPeriodId);
    setCloseLoading(null);
    setShowValidation(false);
    onRefresh();
  };

  const handleLock = async (periodId: string) => {
    if (!onLockPeriod) return;
    setLockLoading(periodId);
    await onLockPeriod(periodId);
    setLockLoading(null);
    onRefresh();
  };

  const handleReopen = async () => {
    if (!reopenPeriodId || !onReopenPeriod || !reopenReason.trim()) return;
    setReopenLoading(true);
    await onReopenPeriod(reopenPeriodId, reopenReason);
    setReopenLoading(false);
    setShowReopenDialog(false);
    setReopenReason('');
    onRefresh();
  };

  const handleBatchCalc = async (periodId: string) => {
    if (!onBatchCalculateES) return;
    setBatchCalcLoading(periodId);
    setBatchResult(null);
    const result = await onBatchCalculateES(periodId);
    setBatchCalcLoading(null);
    if (result) {
      setBatchResult({
        periodId, type: 'calc',
        message: `Cálculo masivo: ${result.calculated} calculadas, ${result.skipped} existentes, ${result.errors} errores`,
      });
    }
  };

  const handleBatchDiff = async (periodId: string) => {
    if (!onBatchDiff) return;
    setBatchDiffLoading(periodId);
    setBatchResult(null);
    const result = await onBatchDiff(periodId);
    setBatchDiffLoading(null);
    if (result) {
      setBatchResult({
        periodId, type: 'diff',
        message: `Comparativa: ${result.computed} nóminas procesadas${result.errors > 0 ? `, ${result.errors} errores` : ''}`,
      });
    }
  };

  const handleStartApproval = async (periodId: string) => {
    if (!onStartApprovalWorkflow) return;
    setApprovalLoading(periodId);
    setBatchResult(null);
    const result = await onStartApprovalWorkflow(periodId);
    setApprovalLoading(null);
    if (result) {
      setBatchResult({
        periodId, type: 'approval',
        message: `Aprobación: ${result.started} enviadas, ${result.skipped} ya en flujo${result.errors > 0 ? `, ${result.errors} errores` : ''}`,
      });
    }
  };

  // Helper: get closure snapshot from period metadata
  const getClosureSnapshot = (p: PayrollPeriod): PeriodClosureSnapshot | null => {
    return (p.metadata as any)?.closure_snapshot as PeriodClosureSnapshot | null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Períodos de Nómina
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo período
          </Button>
        </div>
      </div>

      {periods.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No hay períodos de nómina. Crea el primero.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {periods.map(p => {
          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
          const isCalcing = batchCalcLoading === p.id;
          const isDiffing = batchDiffLoading === p.id;
          const isApproving = approvalLoading === p.id;
          const isClosing = closeLoading === p.id;
          const isLocking = lockLoading === p.id;
          const result = batchResult?.periodId === p.id ? batchResult : null;
          const isClosed = p.status === 'closed' || p.status === 'locked';
          const closureSnapshot = isClosed ? getClosureSnapshot(p) : null;

          return (
            <Card key={p.id} className={`transition-colors ${isClosed ? 'border-border/60' : 'hover:bg-muted/30'}`}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      p.status === 'locked' ? 'bg-destructive/10' :
                      isClosed ? 'bg-emerald-500/10' :
                      p.status === 'open' || p.status === 'calculating' ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {p.status === 'locked' ? <Lock className="h-4 w-4 text-destructive" /> :
                       p.status === 'closed' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> :
                       <Unlock className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.period_name} — {p.period_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.start_date} → {p.end_date}
                        {p.employee_count > 0 && ` · ${p.employee_count} empleados`}
                        {p.total_gross > 0 && ` · Bruto: ${fmt(p.total_gross)}`}
                      </p>
                      {!isClosed && (
                        <ActiveRunIndicator companyId={companyId} periodId={p.id} variant="compact" className="mt-1" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelectPeriod(p.id)} title="Ver nóminas">
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Actions for open/calculating periods */}
                    {(p.status === 'open' || p.status === 'calculating') && onBatchCalculateES && (
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleBatchCalc(p.id)} disabled={isCalcing}>
                        {isCalcing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
                        Cálculo masivo ES
                      </Button>
                    )}
                    {(p.status === 'calculated' || p.status === 'reviewing') && onBatchDiff && (
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleBatchDiff(p.id)} disabled={isDiffing}>
                        {isDiffing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                        Comparativa
                      </Button>
                    )}
                    {(p.status === 'calculated' || p.status === 'reviewing') && onStartApprovalWorkflow && (
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleStartApproval(p.id)} disabled={isApproving}>
                        {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Enviar a aprobación
                      </Button>
                    )}

                    {/* Pre-close validation */}
                    {(p.status === 'calculated' || p.status === 'reviewing') && (
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleValidate(p.id)}>
                        <CheckCircle className="h-3 w-3" /> Validar cierre
                      </Button>
                    )}

                    {/* Lock (closed → locked) */}
                    {p.status === 'closed' && onLockPeriod && (
                      <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={() => handleLock(p.id)} disabled={isLocking}>
                        {isLocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                        Bloquear
                      </Button>
                    )}

                    {/* Reopen (closed → reviewing, not from locked) */}
                    {p.status === 'closed' && onReopenPeriod && (
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                        setReopenPeriodId(p.id);
                        setReopenReason('');
                        setShowReopenDialog(true);
                      }}>
                        <RotateCcw className="h-3 w-3" /> Reabrir
                      </Button>
                    )}
                  </div>
                </div>

                {/* Executive summary for closed/locked periods */}
                {isClosed && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-foreground">
                        Resumen de cierre
                        {p.status === 'locked' && (
                          <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">Bloqueado</Badge>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center">
                        <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                        <p className="text-lg font-bold">{closureSnapshot?.employee_count || p.employee_count || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">Empleados</p>
                      </div>
                      <div className="text-center">
                        <Euro className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                        <p className="text-sm font-bold">{fmt(closureSnapshot?.totals.gross || p.total_gross || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Bruto</p>
                      </div>
                      <div className="text-center">
                        <Euro className="h-3.5 w-3.5 mx-auto text-emerald-500 mb-0.5" />
                        <p className="text-sm font-bold">{fmt(closureSnapshot?.totals.net || p.total_net || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Neto</p>
                      </div>
                      <div className="text-center">
                        <Euro className="h-3.5 w-3.5 mx-auto text-amber-500 mb-0.5" />
                        <p className="text-sm font-bold">{fmt(closureSnapshot?.totals.employer_cost || p.total_employer_cost || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Coste empresa</p>
                      </div>
                    </div>
                    {closureSnapshot && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        <span>Run #{closureSnapshot.approved_run_number} ({closureSnapshot.run_type})</span>
                        <span>·</span>
                        <span>Incidencias: {closureSnapshot.incidents_summary.validated}/{closureSnapshot.incidents_summary.total}</span>
                        {closureSnapshot.recalculations_count > 0 && (
                          <>
                            <span>·</span>
                            <span>{closureSnapshot.recalculations_count} recálculo(s)</span>
                          </>
                        )}
                        {p.closed_at && (
                          <>
                            <span>·</span>
                            <span>Cerrado: {new Date(p.closed_at).toLocaleDateString('es-ES')}</span>
                          </>
                        )}
                        {p.locked_at && (
                          <>
                            <span>·</span>
                            <span>Bloqueado: {new Date(p.locked_at).toLocaleDateString('es-ES')}</span>
                          </>
                        )}
                      </div>
                    )}
                    {!closureSnapshot && p.total_gross > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>Período cerrado sin snapshot detallado (legacy)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch result feedback */}
                {result && (
                  <div className={`text-xs p-2 rounded-lg border ${result.type === 'calc' ? 'bg-primary/5 border-primary/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                    {result.type === 'calc' ? <Calculator className="h-3 w-3 inline mr-1" /> : <TrendingUp className="h-3 w-3 inline mr-1" />}
                    {result.message}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog: New Period */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Período de Nómina</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Año</label>
              <Input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Mes</label>
              <Select value={String(newMonth)} onValueChange={v => setNewMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2026, i, 1).toLocaleDateString('es-ES', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear y abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pre-close Validation */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Validación Pre-Cierre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {validationResults.map(v => {
              const sev = v.severity || 'info';
              return (
                <div key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  v.passed ? 'border-emerald-200 bg-emerald-500/5' :
                  sev === 'error' ? 'border-destructive/30 bg-destructive/5' :
                  'border-amber-200 bg-amber-500/5'
                }`}>
                  {v.passed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : sev === 'error' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{v.label}</p>
                      {!v.passed && (
                        <Badge variant={sev === 'error' ? 'destructive' : 'outline'} className="text-[10px] px-1 py-0">
                          {sev === 'error' ? 'Bloqueante' : 'Aviso'}
                        </Badge>
                      )}
                    </div>
                    {v.detail && <p className="text-xs text-muted-foreground">{v.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {validationResults.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t">
              <Info className="h-3 w-3" />
              <span>
                {validationResults.filter(v => v.passed).length}/{validationResults.length} checks superados.
                {' '}Un run aprobado no implica período cerrado — el cierre es una operación independiente.
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidation(false)}>Cancelar</Button>
            <Button
              onClick={handleClose}
              disabled={
                validationResults.some(v => !v.passed && v.severity === 'error') ||
                closeLoading === validatingPeriodId
              }
              className="gap-1.5"
            >
              {closeLoading === validatingPeriodId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShieldCheck className="h-3 w-3" />
              )}
              Cerrar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reopen Period */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reabrir período
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reabrir un período cerrado lo devuelve a "En revisión". Esta acción queda registrada en auditoría.
            </p>
            <div>
              <label className="text-sm font-medium">Motivo de reapertura *</label>
              <Textarea
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                placeholder="Indique el motivo de la reapertura (mínimo 5 caracteres)..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleReopen}
              disabled={reopenReason.trim().length < 5 || reopenLoading}
              className="gap-1.5"
            >
              {reopenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}