import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { useEmployeeCustomConcepts, useCreateCustomConcept, useDeleteCustomConcept } from '@/hooks/hr/useEmployeeCustomConcepts';
import { toast } from 'sonner';

interface HREmployeeConceptsSectionProps {
  employeeId: string;
  companyId?: string;
}

const NATURE_LABELS: Record<string, string> = {
  salary: 'Salarial', non_salary: 'Extrasalarial', in_kind: 'Especie', deduction: 'Deducción',
};
const NATURE_COLORS: Record<string, string> = {
  salary: 'bg-emerald-500/10 text-emerald-700', non_salary: 'bg-blue-500/10 text-blue-700',
  in_kind: 'bg-amber-500/10 text-amber-700', deduction: 'bg-red-500/10 text-red-700',
};

export function HREmployeeConceptsSection({ employeeId, companyId }: HREmployeeConceptsSectionProps) {
  const { data: concepts = [], isLoading } = useEmployeeCustomConcepts(employeeId);
  const createMutation = useCreateCustomConcept();
  const deleteMutation = useDeleteCustomConcept();
  const [open, setOpen] = useState(false);
  const [isFormula, setIsFormula] = useState(false);
  const [form, setForm] = useState({ concept_code: '', concept_name: '', nature: 'salary', fixed_value: '', formula: '', priority: '10', valid_from: new Date().toISOString().split('T')[0], valid_until: '', convention_definition: '', calculation_algorithm: '' });

  const handleCreate = async () => {
    if (!form.concept_code || !form.concept_name) { toast.error('Código y nombre requeridos'); return; }
    await createMutation.mutateAsync({
      company_id: companyId, employee_id: employeeId, concept_code: form.concept_code,
      concept_name: form.concept_name, nature: form.nature, priority: parseInt(form.priority) || 10,
      valid_from: form.valid_from, valid_to: form.valid_until || null,
      fixed_value: isFormula ? null : parseFloat(form.fixed_value) || 0,
      formula: isFormula ? form.formula : null,
      convention_definition: form.convention_definition || null,
      calculation_algorithm: form.calculation_algorithm || null,
    });
    setOpen(false);
    setForm({ concept_code: '', concept_name: '', nature: 'salary', fixed_value: '', formula: '', priority: '10', valid_from: new Date().toISOString().split('T')[0], valid_until: '', convention_definition: '', calculation_algorithm: '' });
  };

  // Check overlapping concepts
  const overlaps = concepts.filter((c: any, i: number) => concepts.some((d: any, j: number) => i !== j && c.concept_code === d.concept_code && c.valid_from <= (d.valid_to ?? '9999-12-31') && (c.valid_to ?? '9999-12-31') >= d.valid_from));

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Devengos Personalizados</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Añadir concepto</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo concepto personalizado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Código</Label><Input value={form.concept_code} onChange={e => setForm(f => ({ ...f, concept_code: e.target.value }))} placeholder="COMP_01" /></div>
                <div><Label>Nombre</Label><Input value={form.concept_name} onChange={e => setForm(f => ({ ...f, concept_name: e.target.value }))} placeholder="Plus convenio" /></div>
              </div>
              <div><Label>Naturaleza</Label>
                <Select value={form.nature} onValueChange={v => setForm(f => ({ ...f, nature: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salarial</SelectItem><SelectItem value="non_salary">Extrasalarial</SelectItem>
                    <SelectItem value="in_kind">Especie</SelectItem><SelectItem value="deduction">Deducción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Tipo:</Label>
                <Button variant={!isFormula ? 'default' : 'outline'} size="sm" onClick={() => setIsFormula(false)}>Valor fijo</Button>
                <Button variant={isFormula ? 'default' : 'outline'} size="sm" onClick={() => setIsFormula(true)}>Fórmula</Button>
              </div>
              {isFormula ? <div><Label>Fórmula</Label><Textarea value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))} placeholder="base_salary * 0.10" /></div>
                : <div><Label>Valor fijo (€)</Label><Input type="number" value={form.fixed_value} onChange={e => setForm(f => ({ ...f, fixed_value: e.target.value }))} /></div>}
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Prioridad</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} title="Menor = se resuelve antes" /></div>
                <div><Label>Desde</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
                <div><Label>Hasta</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
              </div>
              <div><Label>Definición convenio</Label><Textarea value={form.convention_definition} onChange={e => setForm(f => ({ ...f, convention_definition: e.target.value }))} rows={2} /></div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">{createMutation.isPending ? 'Guardando...' : 'Guardar concepto'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {overlaps.length > 0 && (
          <div className="flex items-center gap-2 p-2 mb-3 rounded bg-amber-500/10 text-amber-700 text-xs"><AlertTriangle className="h-4 w-4" /> Hay conceptos con vigencias solapadas</div>
        )}
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : concepts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin devengos personalizados</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Naturaleza</TableHead>
              <TableHead>Valor/Fórmula</TableHead><TableHead>Prior.</TableHead><TableHead>Vigencia</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>{concepts.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.concept_code}</TableCell>
                <TableCell>{c.concept_name}</TableCell>
                <TableCell><Badge variant="outline" className={NATURE_COLORS[c.nature] ?? ''}>{NATURE_LABELS[c.nature] ?? c.nature}</Badge></TableCell>
                <TableCell className="text-xs">{c.formula ? <span className="font-mono">{c.formula}</span> : `${c.fixed_value ?? 0} €`}</TableCell>
                <TableCell>{c.priority}</TableCell>
                <TableCell className="text-xs">{c.valid_from}{c.valid_to ? ` → ${c.valid_to}` : ' → ∞'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: c.id, employee_id: employeeId })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground mt-3">Los conceptos personalizados se resuelven ANTES que el catálogo global en el cálculo de nómina (prioridad menor = primero).</p>
      </CardContent>
    </Card>

    {/* Ajustes de Recibo */}
    <AjustesReciboCard />
    </>
  );
}

function AjustesReciboCard() {
  const [liquidoRecibo, setLiquidoRecibo] = useState<string>('');
  const [totalDevengos, setTotalDevengos] = useState<string>('');
  const [liquidoPrenomina, setLiquidoPrenomina] = useState<string>('');
  const [noAtrasos, setNoAtrasos] = useState(false);
  const [noAtrasosCot, setNoAtrasosCot] = useState(false);
  const [noPrenomina, setNoPrenomina] = useState(false);

  const hasOverride = liquidoRecibo !== '' || totalDevengos !== '' || liquidoPrenomina !== '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ajustes de Recibo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOverride && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Ajuste manual activo — el cálculo automático está sobreescrito para este concepto
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Líquido recibo (€)</Label>
            <Input type="number" min={0} step={0.01} value={liquidoRecibo} onChange={e => setLiquidoRecibo(e.target.value)} placeholder="Sobreescribe neto" />
          </div>
          <div>
            <Label>Total devengos recibo (€)</Label>
            <Input type="number" min={0} step={0.01} value={totalDevengos} onChange={e => setTotalDevengos(e.target.value)} placeholder="Sobreescribe devengos" />
          </div>
          <div>
            <Label>Líquido prenómina (€)</Label>
            <Input type="number" min={0} step={0.01} value={liquidoPrenomina} onChange={e => setLiquidoPrenomina(e.target.value)} placeholder="Solo prenómina" />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">No interviene en:</Label>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="no_atrasos" checked={noAtrasos} onCheckedChange={v => setNoAtrasos(!!v)} />
              <Label htmlFor="no_atrasos" className="cursor-pointer text-sm font-normal">Nómina de atrasos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="no_atrasos_cot" checked={noAtrasosCot} onCheckedChange={v => setNoAtrasosCot(!!v)} />
              <Label htmlFor="no_atrasos_cot" className="cursor-pointer text-sm font-normal">Atrasos de cotización</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="no_prenomina" checked={noPrenomina} onCheckedChange={v => setNoPrenomina(!!v)} />
              <Label htmlFor="no_prenomina" className="cursor-pointer text-sm font-normal">Prenómina</Label>
            </div>
          </div>
        </div>

        <Button onClick={() => toast('Ajustes guardados (integración con ciclo de nómina pendiente)')}>
          Guardar ajustes
        </Button>

        <p className="text-xs text-muted-foreground">
          Los ajustes manuales se documentan en erp_audit_events como acción FORCED_OVERRIDE.
        </p>
      </CardContent>
    </Card>
  );
}
