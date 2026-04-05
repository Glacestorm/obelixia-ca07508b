/**
 * HRMultiEmploymentPanel — Panel principal de pluriempleo/pluriactividad
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, RefreshCw, CheckCircle, Clock, Ban, Plus,
} from 'lucide-react';
import { useHRMultiEmployment, type HRMultiEmployment } from '@/hooks/hr/useHRMultiEmployment';
import { SOLIDARITY_BRACKETS_2026 } from '@/lib/hr/multiEmploymentEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusCfg: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Activo', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  suspended: { label: 'Suspendido', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  terminated: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: Ban },
};

function RecordRow({ r }: { r: HRMultiEmployment }) {
  const cfg = statusCfg[r.status] || statusCfg.active;
  const Icon = cfg.icon;
  const meta = (r as any).metadata ?? {};
  const exclusions: string[] = [];
  if (meta.except_desempleo) exclusions.push('Desempleo');
  if (meta.except_fogasa) exclusions.push('FOGASA');
  if (meta.except_fp) exclusions.push('Form. Prof.');

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium capitalize">{r.multi_type}</span>
          {r.authorization_number && (
            <Badge variant="outline" className="text-[9px]">
              Auth: {r.authorization_number}
            </Badge>
          )}
        </div>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase">Otro empleador</span>
          <span className="font-medium text-foreground">{r.other_employer_name ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">CCC</span>
          <span className="font-medium text-foreground">{r.other_employer_ccc ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Horas propias</span>
          <span className="font-medium text-foreground">{r.own_weekly_hours ?? '—'}h/sem</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Horas otro</span>
          <span className="font-medium text-foreground">{r.other_weekly_hours ?? '—'}h/sem</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {r.base_distribution_own && (
          <Badge variant="secondary" className="text-[9px]">
            Distribución: {(r.base_distribution_own * 100).toFixed(1)}%
          </Badge>
        )}
        {r.solidarity_amount && r.solidarity_amount > 0 && (
          <Badge variant="secondary" className="text-[9px]">
            Solidaridad: {r.solidarity_amount.toFixed(2)} €
          </Badge>
        )}
        {r.reimbursement_right && (
          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">
            Derecho reintegro
          </Badge>
        )}
        {exclusions.map(ex => (
          <Badge key={ex} variant="outline" className="text-[9px] border-orange-500/30 text-orange-600">
            Excl. {ex}
          </Badge>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Vigencia: {r.effective_from} → {r.effective_to ?? 'Indefinida'}
      </p>
    </div>
  );
}

function SolidarityTable() {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Tramos CAS (Cotización Adicional de Solidaridad)</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Tramo</TableHead>
            <TableHead className="text-xs">Rango</TableHead>
            <TableHead className="text-xs text-right">Total %</TableHead>
            <TableHead className="text-xs text-right">Empresa %</TableHead>
            <TableHead className="text-xs text-right">Trabajador %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SOLIDARITY_BRACKETS_2026.map(b => {
            const rangeLabel = b.toMultiplier
              ? `Base máx. → +${((b.toMultiplier - 1) * 100).toFixed(0)}%`
              : `>${((b.fromMultiplier - 1) * 100).toFixed(0)}%`;
            return (
              <TableRow key={b.bracket}>
                <TableCell className="text-xs font-medium">Tramo {b.bracket}</TableCell>
                <TableCell className="text-xs">{rangeLabel}</TableCell>
                <TableCell className="text-xs text-right">{b.rate.toFixed(2)}%</TableCell>
                <TableCell className="text-xs text-right">{b.employerRate.toFixed(2)}%</TableCell>
                <TableCell className="text-xs text-right">{b.employeeRate.toFixed(2)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function HRMultiEmploymentPanel() {
  const { records, isLoading, refetch, create } = useHRMultiEmployment();
  const [showNew, setShowNew] = useState(false);

  // New record form
  const [form, setForm] = useState({
    multi_type: 'pluriempleo',
    other_employer_name: '',
    other_employer_ccc: '',
    own_weekly_hours: '',
    other_weekly_hours: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    // Bases directas
    base_cc: '',
    base_at: '',
    // Distribución
    tope_max_pct: '',
    tope_min_pct: '',
    aplicacion_bases: 'todas',
    // Exclusiones
    except_desempleo: false,
    except_fogasa: false,
    except_fp: false,
  });

  const handleCreate = async () => {
    if (!form.other_employer_name) { toast.error('Nombre del otro empleador requerido'); return; }
    await (create as any)({
      multi_type: form.multi_type,
      other_employer_name: form.other_employer_name,
      other_employer_ccc: form.other_employer_ccc || null,
      own_weekly_hours: form.own_weekly_hours ? Number(form.own_weekly_hours) : null,
      other_weekly_hours: form.other_weekly_hours ? Number(form.other_weekly_hours) : null,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      status: 'active',
      metadata: {
        base_cc: form.base_cc ? Number(form.base_cc) : null,
        base_at: form.base_at ? Number(form.base_at) : null,
        tope_max_pct: form.tope_max_pct ? Number(form.tope_max_pct) : null,
        tope_min_pct: form.tope_min_pct ? Number(form.tope_min_pct) : null,
        aplicacion_bases: form.aplicacion_bases,
        except_desempleo: form.except_desempleo,
        except_fogasa: form.except_fogasa,
        except_fp: form.except_fp,
      },
    });
    setShowNew(false);
    toast.success('Registro de pluriempleo creado');
  };

  const active = records.filter(r => r.status === 'active');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Pluriempleo / Pluriactividad
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo registro</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo registro de pluriempleo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {/* Datos básicos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={form.multi_type} onValueChange={v => setForm(f => ({ ...f, multi_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pluriempleo">Pluriempleo</SelectItem>
                          <SelectItem value="pluriactividad">Pluriactividad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Otro empleador</Label>
                      <Input value={form.other_employer_name} onChange={e => setForm(f => ({ ...f, other_employer_name: e.target.value }))} placeholder="Razón social" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>CCC otro empleador</Label>
                      <Input value={form.other_employer_ccc} onChange={e => setForm(f => ({ ...f, other_employer_ccc: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Horas propias (sem)</Label>
                      <Input type="number" min={0} value={form.own_weekly_hours} onChange={e => setForm(f => ({ ...f, own_weekly_hours: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Horas otro (sem)</Label>
                      <Input type="number" min={0} value={form.other_weekly_hours} onChange={e => setForm(f => ({ ...f, other_weekly_hours: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Desde</Label>
                      <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Hasta</Label>
                      <Input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} />
                    </div>
                  </div>

                  <Separator />

                  {/* Bases directas */}
                  <div>
                    <p className="text-sm font-medium mb-2">Bases directas</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Contingencias comunes (€)</Label>
                        <Input type="number" min={0} step={0.01} value={form.base_cc} onChange={e => setForm(f => ({ ...f, base_cc: e.target.value }))} />
                      </div>
                      <div>
                        <Label>A.T. y E.P. (€)</Label>
                        <Input type="number" min={0} step={0.01} value={form.base_at} onChange={e => setForm(f => ({ ...f, base_at: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* % Distribución sobre */}
                  <div>
                    <p className="text-sm font-medium mb-2">% Distribución sobre</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Tope máximo (%)</Label>
                        <Input type="number" min={0} max={100} step={0.01} value={form.tope_max_pct} onChange={e => setForm(f => ({ ...f, tope_max_pct: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Tope mínimo (%)</Label>
                        <Input type="number" min={0} max={100} step={0.01} value={form.tope_min_pct} onChange={e => setForm(f => ({ ...f, tope_min_pct: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Aplicación sobre bases</Label>
                        <Select value={form.aplicacion_bases} onValueChange={v => setForm(f => ({ ...f, aplicacion_bases: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cc">Contingencias comunes</SelectItem>
                            <SelectItem value="at_ep">AT/EP</SelectItem>
                            <SelectItem value="todas">Todas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tramos CAS */}
                  <SolidarityTable />

                  <Separator />

                  {/* Exclusiones */}
                  <div>
                    <p className="text-sm font-medium mb-2">Exclusiones de la cotización de solidaridad</p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox id="exc_des" checked={form.except_desempleo} onCheckedChange={v => setForm(f => ({ ...f, except_desempleo: !!v }))} />
                        <Label htmlFor="exc_des" className="cursor-pointer text-sm font-normal">Excepto en Desempleo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="exc_fog" checked={form.except_fogasa} onCheckedChange={v => setForm(f => ({ ...f, except_fogasa: !!v }))} />
                        <Label htmlFor="exc_fog" className="cursor-pointer text-sm font-normal">Excepto en FOGASA</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="exc_fp" checked={form.except_fp} onCheckedChange={v => setForm(f => ({ ...f, except_fp: !!v }))} />
                        <Label htmlFor="exc_fp" className="cursor-pointer text-sm font-normal">Excepto en Formación Profesional</Label>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleCreate} className="w-full">Crear registro de pluriempleo</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2 rounded bg-primary/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Activos</p>
            <p className="text-lg font-bold">{active.length}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{records.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[400px]">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay registros de pluriempleo
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => <RecordRow key={r.id} r={r} />)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRMultiEmploymentPanel;
