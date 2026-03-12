/**
 * HRPayrollConceptsCatalog — Catálogo global/local de conceptos salariales
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Pencil, Globe, MapPin, Search } from 'lucide-react';
import type { PayrollConceptTemplate, PayrollLineType, PayrollLineCategory } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  companyId: string;
  concepts: PayrollConceptTemplate[];
  onFetch: () => void;
  onUpsert: (c: Partial<PayrollConceptTemplate>) => Promise<PayrollConceptTemplate | null>;
}

const LINE_TYPES: { value: PayrollLineType; label: string }[] = [
  { value: 'earning', label: 'Devengo' },
  { value: 'deduction', label: 'Deducción' },
  { value: 'employer_cost', label: 'Coste empresa' },
  { value: 'informative', label: 'Informativo' },
];

const CATEGORIES: { value: PayrollLineCategory; label: string }[] = [
  { value: 'fixed', label: 'Fijo' },
  { value: 'variable', label: 'Variable' },
  { value: 'overtime', label: 'Horas extra' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Comisión' },
  { value: 'allowance', label: 'Dietas' },
  { value: 'flexible_remuneration', label: 'Retrib. flexible' },
  { value: 'advance', label: 'Anticipo' },
  { value: 'regularization', label: 'Regularización' },
  { value: 'withholding', label: 'Retención' },
  { value: 'social_contribution', label: 'Cotización social' },
  { value: 'other', label: 'Otro' },
];

const emptyForm: Partial<PayrollConceptTemplate> = {
  code: '', name: '', line_type: 'earning', category: 'fixed',
  taxable: true, contributable: true, is_active: true, sort_order: 0,
};

export function HRPayrollConceptsCatalog({ companyId, concepts, onFetch, onUpsert }: Props) {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PayrollConceptTemplate>>(emptyForm);

  useEffect(() => { onFetch(); }, []);

  const filtered = concepts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (countryFilter === 'global' && c.country_code) return false;
    if (countryFilter !== 'all' && countryFilter !== 'global' && c.country_code !== countryFilter) return false;
    return true;
  });

  const handleSave = async () => {
    await onUpsert(form);
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleEdit = (c: PayrollConceptTemplate) => {
    setForm(c);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Catálogo de Conceptos
        </h3>
        <Button size="sm" onClick={() => { setForm(emptyForm); setShowForm(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo concepto
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código o nombre..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="global">🌐 Global</SelectItem>
            <SelectItem value="ES">🇪🇸 España</SelectItem>
            <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
            <SelectItem value="FR">🇫🇷 Francia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-center">Tributa</TableHead>
              <TableHead className="text-center">Cotiza</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{LINE_TYPES.find(t => t.value === c.line_type)?.label}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{CATEGORIES.find(cat => cat.value === c.category)?.label}</TableCell>
                <TableCell>{c.country_code ? <Badge variant="secondary" className="gap-1 text-xs"><MapPin className="h-3 w-3" />{c.country_code}</Badge> : <Badge variant="outline" className="gap-1 text-xs"><Globe className="h-3 w-3" />Global</Badge>}</TableCell>
                <TableCell className="text-center">{c.taxable ? '✓' : '—'}</TableCell>
                <TableCell className="text-center">{c.contributable ? '✓' : '—'}</TableCell>
                <TableCell className="text-center">{c.is_active ? <Badge variant="default" className="text-xs">Sí</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin conceptos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Editar Concepto' : 'Nuevo Concepto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SAL_BASE" /></div>
              <div><Label>Nombre</Label><Input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Salario base" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo línea</Label>
                <Select value={form.line_type || 'earning'} onValueChange={v => setForm(p => ({ ...p, line_type: v as PayrollLineType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={form.category || 'fixed'} onValueChange={v => setForm(p => ({ ...p, category: v as PayrollLineCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>País (vacío = global)</Label>
                <Select value={form.country_code || '_global'} onValueChange={v => setForm(p => ({ ...p, country_code: v === '_global' ? undefined : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_global">🌐 Global</SelectItem>
                    <SelectItem value="ES">🇪🇸 España</SelectItem>
                    <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                    <SelectItem value="FR">🇫🇷 Francia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Importe defecto</Label><Input type="number" value={form.default_amount || ''} onChange={e => setForm(p => ({ ...p, default_amount: Number(e.target.value) || undefined }))} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.taxable ?? true} onCheckedChange={v => setForm(p => ({ ...p, taxable: v }))} /><Label>Sujeto a impuestos</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.contributable ?? true} onCheckedChange={v => setForm(p => ({ ...p, contributable: v }))} /><Label>Sujeto a cotización</Label></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><Label>Activo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.code || !form.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
