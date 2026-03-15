/**
 * HRPayrollReconciliationPanel — Panel de reconciliación de nómina piloto
 * Permite registrar discrepancias entre el cálculo interno y la referencia externa.
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle, AlertTriangle, Plus, Scale, FileText, Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReconciliationEntry {
  id: string;
  employee_name: string;
  period: string;
  concept: string;
  internal_value: number;
  external_value: number;
  difference: number;
  status: 'pending' | 'validated' | 'discrepancy' | 'resolved';
  notes: string;
  created_at: string;
}

interface HRPayrollReconciliationPanelProps {
  companyId: string;
}

export function HRPayrollReconciliationPanel({ companyId }: HRPayrollReconciliationPanelProps) {
  const [entries, setEntries] = useState<ReconciliationEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    employee_name: '',
    period: '',
    concept: '',
    internal_value: '',
    external_value: '',
    notes: '',
  });

  // Load from localStorage as lightweight persistence for pilot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`hr_reconciliation_${companyId}`);
      if (saved) setEntries(JSON.parse(saved));
    } catch {}
  }, [companyId]);

  const saveEntries = useCallback((newEntries: ReconciliationEntry[]) => {
    setEntries(newEntries);
    try {
      localStorage.setItem(`hr_reconciliation_${companyId}`, JSON.stringify(newEntries));
    } catch {}
  }, [companyId]);

  const handleAdd = useCallback(() => {
    const internal = parseFloat(form.internal_value) || 0;
    const external = parseFloat(form.external_value) || 0;
    const diff = Math.abs(internal - external);
    const entry: ReconciliationEntry = {
      id: crypto.randomUUID(),
      employee_name: form.employee_name,
      period: form.period,
      concept: form.concept,
      internal_value: internal,
      external_value: external,
      difference: diff,
      status: diff < 0.01 ? 'validated' : 'discrepancy',
      notes: form.notes,
      created_at: new Date().toISOString(),
    };
    saveEntries([entry, ...entries]);
    setShowDialog(false);
    setForm({ employee_name: '', period: '', concept: '', internal_value: '', external_value: '', notes: '' });
    toast.success(diff < 0.01 ? 'Concepto validado ✓' : 'Discrepancia registrada');
  }, [form, entries, saveEntries]);

  const toggleResolved = useCallback((id: string) => {
    saveEntries(entries.map(e =>
      e.id === id ? { ...e, status: e.status === 'resolved' ? 'discrepancy' : 'resolved' } : e
    ));
  }, [entries, saveEntries]);

  const exportCSV = useCallback(() => {
    const headers = 'Empleado,Periodo,Concepto,Interno,Externo,Diferencia,Estado,Notas\n';
    const rows = entries.map(e =>
      `"${e.employee_name}","${e.period}","${e.concept}",${e.internal_value},${e.external_value},${e.difference},${e.status},"${e.notes}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reconciliacion_nomina_${companyId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [entries, companyId]);

  const stats = {
    total: entries.length,
    validated: entries.filter(e => e.status === 'validated').length,
    discrepancies: entries.filter(e => e.status === 'discrepancy').length,
    resolved: entries.filter(e => e.status === 'resolved').length,
  };

  const CONCEPTS = [
    'Salario Base', 'Horas Extra', 'Complemento Antigüedad', 'Plus Transporte',
    'IRPF Retención', 'SS Trabajador', 'SS Empresa', 'Base Cotización CC',
    'Base Cotización CP', 'Neto a Percibir', 'Total Devengado', 'Total Deducciones',
    'Retribución Flexible', 'Stock Options', 'IT Accidente', 'Permiso No Retribuido',
  ];

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Reconciliación de Nómina — Piloto</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contraste entre cálculo interno y sistema/asesoría de referencia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Registrar contraste
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nuevo punto de contraste</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Nombre del empleado"
                      value={form.employee_name}
                      onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
                    />
                    <Input
                      placeholder="Período (ej: 2026-03)"
                      value={form.period}
                      onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    />
                    <Select value={form.concept} onValueChange={v => setForm(f => ({ ...f, concept: v }))}>
                      <SelectTrigger><SelectValue placeholder="Concepto" /></SelectTrigger>
                      <SelectContent>
                        {CONCEPTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number" step="0.01" placeholder="Valor interno (€)"
                        value={form.internal_value}
                        onChange={e => setForm(f => ({ ...f, internal_value: e.target.value }))}
                      />
                      <Input
                        type="number" step="0.01" placeholder="Valor referencia (€)"
                        value={form.external_value}
                        onChange={e => setForm(f => ({ ...f, external_value: e.target.value }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Notas / observaciones"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAdd} disabled={!form.employee_name || !form.concept}>
                      Registrar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {entries.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> {stats.validated} validados
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> {stats.discrepancies} discrepancias
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> {stats.resolved} resueltos
            </span>
            <span className="text-muted-foreground">{stats.total} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Entries table */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Sin registros de contraste. Añade el primer punto de reconciliación para comparar con tu sistema de referencia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[calc(100vh-420px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Empleado</TableHead>
                  <TableHead className="text-xs">Período</TableHead>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs text-right">Interno (€)</TableHead>
                  <TableHead className="text-xs text-right">Referencia (€)</TableHead>
                  <TableHead className="text-xs text-right">Dif (€)</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id} className={cn(
                    entry.status === 'discrepancy' && 'bg-amber-500/5',
                    entry.status === 'resolved' && 'bg-blue-500/5 opacity-70',
                  )}>
                    <TableCell className="text-xs font-medium">{entry.employee_name}</TableCell>
                    <TableCell className="text-xs">{entry.period}</TableCell>
                    <TableCell className="text-xs">{entry.concept}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{entry.internal_value.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{entry.external_value.toFixed(2)}</TableCell>
                    <TableCell className={cn(
                      'text-xs text-right font-mono font-semibold',
                      entry.difference > 0 ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {entry.difference.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        entry.status === 'validated' ? 'default' :
                        entry.status === 'resolved' ? 'secondary' : 'destructive'
                      } className="text-[9px]">
                        {entry.status === 'validated' && '✓ OK'}
                        {entry.status === 'discrepancy' && '⚠ Dif'}
                        {entry.status === 'resolved' && '✔ Resuelto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.status !== 'validated' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleResolved(entry.id)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

export default HRPayrollReconciliationPanel;
