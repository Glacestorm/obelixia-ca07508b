import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Plus, Lock, Unlock, ChevronDown } from 'lucide-react';
import { useERPFiscalYears } from '@/hooks/erp/useERPFiscalYears';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ERPFiscalYearsPanel() {
  const { fiscalYears, periods, isLoading, fetchFiscalYears, fetchPeriods, createFiscalYear, closeFiscalYear, closePeriod } = useERPFiscalYears();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

  useEffect(() => { fetchFiscalYears(); }, [fetchFiscalYears]);

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) return;
    await createFiscalYear(form);
    setForm({ name: '', start_date: '', end_date: '' });
    setIsCreateOpen(false);
  };

  const handleExpandYear = async (yearId: string) => {
    if (expandedYear === yearId) {
      setExpandedYear(null);
    } else {
      setExpandedYear(yearId);
      await fetchPeriods(yearId);
    }
  };

  const handleYearChange = (year: string) => {
    const y = parseInt(year);
    if (!isNaN(y)) {
      setForm({ name: `Ejercicio ${year}`, start_date: `${year}-01-01`, end_date: `${year}-12-31` });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Ejercicios Fiscales</CardTitle>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Ejercicio Fiscal</DialogTitle>
                <DialogDescription>Crea un nuevo ejercicio con periodos</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input type="number" min="2000" max="2100" placeholder="2026" onChange={(e) => handleYearChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Gestión de ejercicios fiscales y periodos</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : fiscalYears.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay ejercicios fiscales</div>
            ) : (
              fiscalYears.map(fy => (
                <Collapsible key={fy.id} open={expandedYear === fy.id} onOpenChange={() => handleExpandYear(fy.id)}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedYear === fy.id ? 'rotate-180' : ''}`} />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {fy.name}
                              {fy.is_current && <Badge variant="default" className="text-xs">Actual</Badge>}
                              {fy.is_closed && <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Cerrado</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{format(new Date(fy.start_date), 'dd/MM/yyyy', { locale: es })} - {format(new Date(fy.end_date), 'dd/MM/yyyy', { locale: es })}</p>
                          </div>
                        </div>
                        {!fy.is_closed && <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); closeFiscalYear(fy.id); }}><Lock className="h-4 w-4 mr-1" />Cerrar</Button>}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Periodo</TableHead>
                              <TableHead>Inicio</TableHead>
                              <TableHead>Fin</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {periods.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay periodos</TableCell></TableRow>
                            ) : (
                              periods.map(p => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{p.name}</TableCell>
                                  <TableCell>{format(new Date(p.start_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                  <TableCell>{format(new Date(p.end_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                  <TableCell><Badge variant={p.is_closed ? 'secondary' : 'default'}>{p.is_closed ? 'Cerrado' : 'Abierto'}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    {!p.is_closed && <Button variant="ghost" size="sm" onClick={() => closePeriod(p.id)}><Lock className="h-4 w-4 mr-1" />Cerrar</Button>}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ERPFiscalYearsPanel;
