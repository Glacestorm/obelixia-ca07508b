/**
 * HRPayrollPeriodManager — CRUD de períodos, estados, apertura/cierre
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Plus, Lock, Unlock, RefreshCw, CheckCircle, AlertTriangle, Play, Eye } from 'lucide-react';
import type { PayrollPeriod, PeriodStatus, PreCloseValidation } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  companyId: string;
  periods: PayrollPeriod[];
  isLoading: boolean;
  onOpenPeriod: (year: number, month: number) => Promise<PayrollPeriod | null>;
  onUpdateStatus: (periodId: string, status: PeriodStatus) => Promise<void>;
  onValidatePreClose: (periodId: string) => Promise<PreCloseValidation[]>;
  onSelectPeriod: (id: string) => void;
  onRefresh: () => void;
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

export function HRPayrollPeriodManager({ companyId, periods, isLoading, onOpenPeriod, onUpdateStatus, onValidatePreClose, onSelectPeriod, onRefresh }: Props) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<PreCloseValidation[]>([]);
  const [validatingPeriodId, setValidatingPeriodId] = useState<string | null>(null);

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
    if (validatingPeriodId && validationResults.every(v => v.passed)) {
      await onUpdateStatus(validatingPeriodId, 'closed');
      setShowValidation(false);
    }
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
          return (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${p.status === 'open' || p.status === 'calculating' ? 'bg-primary/10' : p.status === 'locked' ? 'bg-destructive/10' : 'bg-muted'}`}>
                    {p.status === 'locked' ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.period_name} — {p.period_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.start_date} → {p.end_date}
                      {p.employee_count > 0 && ` · ${p.employee_count} empleados`}
                      {p.total_gross > 0 && ` · Bruto: ${p.total_gross.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelectPeriod(p.id)} title="Ver nóminas">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {p.status === 'open' && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onUpdateStatus(p.id, 'calculating')}>
                      <Play className="h-3 w-3" /> Calcular
                    </Button>
                  )}
                  {(p.status === 'calculated' || p.status === 'reviewing') && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleValidate(p.id)}>
                      <CheckCircle className="h-3 w-3" /> Validar cierre
                    </Button>
                  )}
                  {p.status === 'closed' && (
                    <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={() => onUpdateStatus(p.id, 'locked')}>
                      <Lock className="h-3 w-3" /> Bloquear
                    </Button>
                  )}
                </div>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Validación Pre-Cierre</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {validationResults.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border">
                {v.passed ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                <div>
                  <p className="text-sm font-medium">{v.label}</p>
                  {v.detail && <p className="text-xs text-muted-foreground">{v.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidation(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={!validationResults.every(v => v.passed)}>
              Cerrar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
