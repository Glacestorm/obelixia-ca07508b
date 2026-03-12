/**
 * HRPayrollRecordsList — Listado de nóminas por período + detalle con líneas
 */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Eye, CheckCircle, XCircle, Euro, Plus, Trash2 } from 'lucide-react';
import type { PayrollPeriod, PayrollRecord, PayrollLine, PayrollRecordStatus } from '@/hooks/erp/hr/usePayrollEngine';

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

export function HRPayrollRecordsList({ companyId, periods, selectedPeriodId, onSelectPeriod, records, isLoading, onFetchRecords, onUpdateStatus, onFetchLines, lines, onAddLine, onUpdateLine, onDeleteLine }: Props) {
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    if (selectedPeriodId) onFetchRecords(selectedPeriodId);
  }, [selectedPeriodId]);

  const openDetail = (rec: PayrollRecord) => {
    setDetailRecord(rec);
    onFetchLines(rec.id);
  };

  const earningLines = lines.filter(l => l.line_type === 'earning');
  const deductionLines = lines.filter(l => l.line_type === 'deduction');
  const employerLines = lines.filter(l => l.line_type === 'employer_cost');
  const infoLines = lines.filter(l => l.line_type === 'informative');

  const totalEarnings = earningLines.reduce((s, l) => s + l.amount, 0);
  const totalDeductions = deductionLines.reduce((s, l) => s + l.amount, 0);
  const totalEmployer = employerLines.reduce((s, l) => s + l.amount, 0);

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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => {
                const cfg = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee_first_name} {r.employee_last_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.department_name || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{r.gross_salary.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{r.total_deductions.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</TableCell>
                    <TableCell className="text-right font-mono font-bold">{r.net_salary.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{r.employer_cost.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</TableCell>
                    <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></Button>
                        {r.status === 'draft' && <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => onUpdateStatus(r.id, 'reviewing')}><CheckCircle className="h-4 w-4" /></Button>}
                        {r.status === 'reviewing' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => onUpdateStatus(r.id, 'approved')}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onUpdateStatus(r.id, 'rejected')}><XCircle className="h-4 w-4" /></Button>
                          </>
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

      {/* Detail Sheet */}
      <Sheet open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
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
                  <p className="text-lg font-bold">{detailRecord?.gross_salary.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Neto</p>
                  <p className="text-lg font-bold">{detailRecord?.net_salary.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-emerald-600">Devengos ({earningLines.length})</h4>
                <div className="space-y-1">
                  {earningLines.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <span className="font-medium">{l.concept_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{l.concept_code}</span>
                      </div>
                      <span className="font-mono">{l.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  ))}
                  {earningLines.length === 0 && <p className="text-xs text-muted-foreground">Sin devengos</p>}
                </div>
                <div className="flex justify-end mt-1 text-sm font-semibold">Total: {totalEarnings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
              </div>

              <Separator />

              {/* Deductions */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-destructive">Deducciones ({deductionLines.length})</h4>
                <div className="space-y-1">
                  {deductionLines.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <span className="font-medium">{l.concept_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{l.concept_code}</span>
                      </div>
                      <span className="font-mono text-destructive">-{l.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-1 text-sm font-semibold text-destructive">Total: -{totalDeductions.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
              </div>

              <Separator />

              {/* Employer costs */}
              {employerLines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Costes empresa ({employerLines.length})</h4>
                  <div className="space-y-1">
                    {employerLines.map(l => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <span className="font-medium">{l.concept_name}</span>
                        <span className="font-mono">{l.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-1 text-sm font-semibold">Total: {totalEmployer.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
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
