/**
 * HRPayrollRecordsList — V2-ES.1 Paso 4: review_status, approve/flag, diff, trace
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  FileText, Eye, CheckCircle, XCircle, Euro, Plus,
  Flag, Loader2, MessageSquare, Lock
} from 'lucide-react';
import type { PayrollPeriod, PayrollRecord, PayrollLine, PayrollRecordStatus } from '@/hooks/erp/hr/usePayrollEngine';
import type { DiffVsPrevious, ReviewAction } from '@/hooks/erp/hr/useESPayrollBridge';
import { PayrollReviewBadge } from './PayrollReviewBadge';
import { PayrollDiffPanel } from './PayrollDiffPanel';
import { PayrollTraceLine } from './PayrollTraceLine';
import { ActiveRunIndicator } from './ActiveRunIndicator';

interface Props {
  companyId: string;
  periods: PayrollPeriod[];
  selectedPeriodId: string | null;
  onSelectPeriod: (id: string | null) => void;
  records: PayrollRecord[];
  isLoading: boolean;
  onFetchRecords: (periodId: string) => void;
  onUpdateStatus: (id: string, status: PayrollRecordStatus) => void;
  onFetchLines: (recordId: string) => void;
  lines: PayrollLine[];
  onAddLine: (recordId: string, line: Partial<PayrollLine>) => void;
  onUpdateLine: (lineId: string, updates: Partial<PayrollLine>) => void;
  onDeleteLine: (lineId: string) => void;
  // V2-ES.1 Paso 4
  onReviewRecord?: (recordId: string, action: ReviewAction, notes?: string) => Promise<boolean>;
  onComputeDiff?: (recordId: string, periodId: string) => Promise<DiffVsPrevious | null>;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  calculated: { label: 'Calculada', variant: 'secondary' },
  reviewing: { label: 'En revisión', variant: 'secondary' },
  approved: { label: 'Aprobada', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
  paid: { label: 'Pagada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function HRPayrollRecordsList({
  companyId, periods, selectedPeriodId, onSelectPeriod,
  records, isLoading, onFetchRecords, onUpdateStatus,
  onFetchLines, lines, onAddLine, onUpdateLine, onDeleteLine,
  onReviewRecord, onComputeDiff,
}: Props) {
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [diffData, setDiffData] = useState<DiffVsPrevious | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    if (selectedPeriodId) onFetchRecords(selectedPeriodId);
  }, [selectedPeriodId]);

  const openDetail = useCallback(async (rec: PayrollRecord) => {
    setDetailRecord(rec);
    setDiffData(null);
    onFetchLines(rec.id);

    // Load diff from record if already computed
    const raw = (rec as any).diff_vs_previous;
    if (raw) {
      setDiffData(raw as DiffVsPrevious);
    } else if (onComputeDiff && selectedPeriodId) {
      // Auto-compute diff on open
      setDiffLoading(true);
      const result = await onComputeDiff(rec.id, selectedPeriodId);
      setDiffData(result);
      setDiffLoading(false);
    }
  }, [onFetchLines, onComputeDiff, selectedPeriodId]);

  const handleOpenReview = (recordId: string, action: ReviewAction) => {
    setReviewTarget(recordId);
    setReviewAction(action);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget || !onReviewRecord) return;
    setReviewLoading(true);
    const ok = await onReviewRecord(reviewTarget, reviewAction, reviewNotes || undefined);
    setReviewLoading(false);
    if (ok) {
      setReviewDialogOpen(false);
      if (selectedPeriodId) onFetchRecords(selectedPeriodId);
    }
  };

  const earningLines = lines.filter(l => l.line_type === 'earning');
  const deductionLines = lines.filter(l => l.line_type === 'deduction');
  const employerLines = lines.filter(l => l.line_type === 'employer_cost');

  const totalEarnings = earningLines.reduce((s, l) => s + l.amount, 0);
  const totalDeductions = deductionLines.reduce((s, l) => s + l.amount, 0);
  const totalEmployer = employerLines.reduce((s, l) => s + l.amount, 0);

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2 });

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const isPeriodClosed = selectedPeriod && (selectedPeriod.status === 'closed' || selectedPeriod.status === 'locked');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Nóminas
        </h3>
        <Select value={selectedPeriodId || ''} onValueChange={v => onSelectPeriod(v || null)}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Selecciona período" /></SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.period_name} ({p.status})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Closed/locked banner */}
      {selectedPeriodId && isPeriodClosed && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
          selectedPeriod.status === 'locked'
            ? 'bg-destructive/5 border-destructive/20 text-destructive'
            : 'bg-muted/50 border-border'
        }`}>
          {selectedPeriod.status === 'locked' ? (
            <>
              <Lock className="h-4 w-4 shrink-0" />
              <span className="font-medium">Período bloqueado</span>
              <span className="text-muted-foreground">— No se permiten cambios.</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Período cerrado</span>
              <span className="text-muted-foreground">— Modo solo lectura.</span>
            </>
          )}
          {selectedPeriod.closed_at && (
            <span className="text-xs text-muted-foreground ml-auto">
              Cerrado: {new Date(selectedPeriod.closed_at).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>
      )}

      {/* Active run context banner (only for non-closed periods) */}
      {selectedPeriodId && !isPeriodClosed && (
        <ActiveRunIndicator companyId={companyId} periodId={selectedPeriodId} variant="full" />
      )}

      {!selectedPeriodId && (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Selecciona un período para ver las nóminas</CardContent></Card>
      )}

      {selectedPeriodId && records.length === 0 && !isLoading && (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">No hay nóminas en este período</CardContent></Card>
      )}

      {records.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">Coste Emp.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Revisión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => {
                const cfg = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
                const reviewStatus = (r as any).review_status;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee_first_name} {r.employee_last_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.department_name || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.gross_salary)} €</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{fmt(r.total_deductions)} €</TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmt(r.net_salary)} €</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{fmt(r.employer_cost)} €</TableCell>
                    <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                    <TableCell>
                      <PayrollReviewBadge status={reviewStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(r)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onReviewRecord && (r.status === 'calculated' || r.status === 'reviewing') && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleOpenReview(r.id, 'approve')}
                              title="Aprobar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700"
                              onClick={() => handleOpenReview(r.id, 'flag')}
                              title="Marcar para revisión"
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!onReviewRecord && r.status === 'draft' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => onUpdateStatus(r.id, 'reviewing')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <><CheckCircle className="h-5 w-5 text-emerald-600" /> Aprobar nómina</>
              ) : (
                <><Flag className="h-5 w-5 text-amber-600" /> Marcar nómina</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Notas de revisión (opcional)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Revisión correcta, sin observaciones...' : 'Motivo de la marca...'}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={reviewLoading}>Cancelar</Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewLoading}
              className={reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              {reviewLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {reviewAction === 'approve' ? 'Aprobar' : 'Marcar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
        <SheetContent className="w-[640px] sm:max-w-[640px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              {detailRecord?.employee_first_name} {detailRecord?.employee_last_name}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground">Bruto</p>
                  <p className="text-lg font-bold">{fmt(detailRecord?.gross_salary ?? 0)} €</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Neto</p>
                  <p className="text-lg font-bold">{fmt(detailRecord?.net_salary ?? 0)} €</p>
                </div>
              </div>

              {/* Review status bar */}
              {detailRecord && (
                <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Revisión:</span>
                    <PayrollReviewBadge status={(detailRecord as any).review_status} size="default" />
                  </div>
                  {(detailRecord as any).reviewed_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date((detailRecord as any).reviewed_at).toLocaleString('es-ES')}
                    </span>
                  )}
                </div>
              )}

              {/* Review notes if any */}
              {(detailRecord as any)?.review_notes && (
                <div className="p-2 rounded-lg border bg-amber-500/5 border-amber-500/20 text-sm">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notas de revisión</p>
                  <p className="text-muted-foreground">{(detailRecord as any).review_notes}</p>
                </div>
              )}

              {/* Diff vs previous */}
              {diffLoading ? (
                <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculando comparativa...
                </div>
              ) : (
                <PayrollDiffPanel diff={diffData} />
              )}

              <Separator />

              {/* Earnings with trace */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-emerald-600">Devengos ({earningLines.length})</h4>
                <div className="space-y-1">
                  {earningLines.map(l => (
                    <PayrollTraceLine
                      key={l.id}
                      conceptCode={l.concept_code}
                      conceptName={l.concept_name}
                      amount={l.amount}
                      lineType={l.line_type}
                      trace={(l as any).calculation_trace}
                      incidentRef={(l as any).incident_ref}
                    />
                  ))}
                  {earningLines.length === 0 && <p className="text-xs text-muted-foreground">Sin devengos</p>}
                </div>
                <div className="flex justify-end mt-1 text-sm font-semibold">Total: {fmt(totalEarnings)} €</div>
              </div>

              <Separator />

              {/* Deductions with trace */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-destructive">Deducciones ({deductionLines.length})</h4>
                <div className="space-y-1">
                  {deductionLines.map(l => (
                    <PayrollTraceLine
                      key={l.id}
                      conceptCode={l.concept_code}
                      conceptName={l.concept_name}
                      amount={l.amount}
                      lineType={l.line_type}
                      trace={(l as any).calculation_trace}
                      incidentRef={(l as any).incident_ref}
                    />
                  ))}
                </div>
                <div className="flex justify-end mt-1 text-sm font-semibold text-destructive">Total: -{fmt(totalDeductions)} €</div>
              </div>

              <Separator />

              {/* Employer costs with trace */}
              {employerLines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Costes empresa ({employerLines.length})</h4>
                  <div className="space-y-1">
                    {employerLines.map(l => (
                      <PayrollTraceLine
                        key={l.id}
                        conceptCode={l.concept_code}
                        conceptName={l.concept_name}
                        amount={l.amount}
                        lineType={l.line_type}
                        trace={(l as any).calculation_trace}
                        incidentRef={(l as any).incident_ref}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end mt-1 text-sm font-semibold">Total: {fmt(totalEmployer)} €</div>
                </div>
              )}

              {/* Add line */}
              {detailRecord && (detailRecord.status === 'draft' || detailRecord.status === 'calculated') && (
                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => onAddLine(detailRecord.id, { concept_code: 'MANUAL', concept_name: 'Concepto manual', line_type: 'earning', amount: 0 })}>
                  <Plus className="h-4 w-4" /> Añadir línea
                </Button>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
