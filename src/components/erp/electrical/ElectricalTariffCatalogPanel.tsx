import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Pencil, Trash2, BookOpen, Check, X } from 'lucide-react';
import { PermissionGate } from './PermissionGate';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { useEnergyTariffCatalog, EnergyTariff } from '@/hooks/erp/useEnergyTariffCatalog';

interface Props { companyId: string; }

const EMPTY_FORM: Partial<EnergyTariff> = {
  supplier: '',
  tariff_name: '',
  access_tariff: '2.0TD',
  price_p1_energy: null,
  price_p2_energy: null,
  price_p3_energy: null,
  price_p1_power: null,
  price_p2_power: null,
  has_permanence: false,
  notes: '',
  valid_from: null,
  valid_to: null,
  is_active: true,
};

export function ElectricalTariffCatalogPanel({ companyId }: Props) {
  const { tariffs, loading, filters, setFilters, createTariff, updateTariff, deleteTariff, uniqueSuppliers } = useEnergyTariffCatalog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<EnergyTariff | null>(null);
  const [form, setForm] = useState<Partial<EnergyTariff>>(EMPTY_FORM);

  const openCreate = () => {
    setEditingTariff(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: EnergyTariff) => {
    setEditingTariff(t);
    setForm({ ...t });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.supplier || !form.tariff_name) return;
    if (editingTariff) {
      await updateTariff(editingTariff.id, form);
    } else {
      await createTariff(form);
    }
    setDialogOpen(false);
  };

  const formatPrice = (v: number | null) => v != null ? v.toFixed(4) : '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Catálogo de Tarifas" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            Catálogo de Tarifas
          </h2>
          <p className="text-sm text-muted-foreground">
            Tarifas de mercado con precios de energía y potencia. {tariffs.length} tarifas registradas.
          </p>
        </div>
        <PermissionGate action="edit_tariff_catalog">
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva tarifa</Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comercializadora o tarifa..."
            className="pl-9"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select value={filters.supplier} onValueChange={v => setFilters(f => ({ ...f, supplier: v }))}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Comercializadora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.isActive} onValueChange={v => setFilters(f => ({ ...f, isActive: v }))}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Comercializadora</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tarifa</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Acceso</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">€/kWh P1</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">€/kWh P2</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">€/kWh P3</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">€/kW·año P1</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">€/kW·año P2</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Perm.</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Activa</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Cargando tarifas...</td></tr>
                ) : tariffs.length === 0 ? (
                  <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No hay tarifas registradas.</td></tr>
                ) : (
                  tariffs.map(t => (
                    <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{t.supplier}</td>
                      <td className="p-3">{t.tariff_name}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{t.access_tariff || '—'}</Badge></td>
                      <td className="p-3 text-right font-mono text-xs">{formatPrice(t.price_p1_energy)}</td>
                      <td className="p-3 text-right font-mono text-xs">{formatPrice(t.price_p2_energy)}</td>
                      <td className="p-3 text-right font-mono text-xs">{formatPrice(t.price_p3_energy)}</td>
                      <td className="p-3 text-right font-mono text-xs">{t.price_p1_power != null ? t.price_p1_power.toFixed(2) : '—'}</td>
                      <td className="p-3 text-right font-mono text-xs">{t.price_p2_power != null ? t.price_p2_power.toFixed(2) : '—'}</td>
                      <td className="p-3 text-center">{t.has_permanence ? <Badge variant="destructive" className="text-[10px]">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span>}</td>
                      <td className="p-3 text-center">{t.is_active ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTariff(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingTariff ? 'Editar tarifa' : 'Nueva tarifa'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Comercializadora *</Label>
                <Input value={form.supplier || ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre de tarifa *</Label>
                <Input value={form.tariff_name || ''} onChange={e => setForm(f => ({ ...f, tariff_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tarifa de acceso</Label>
                <Select value={form.access_tariff || '2.0TD'} onValueChange={v => setForm(f => ({ ...f, access_tariff: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.0TD">2.0TD</SelectItem>
                    <SelectItem value="3.0TD">3.0TD</SelectItem>
                    <SelectItem value="6.1TD">6.1TD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Precio energía P1 (c€/kWh)</Label>
                <Input type="number" step="0.01" value={form.price_p1_energy ?? ''} onChange={e => setForm(f => ({ ...f, price_p1_energy: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio energía P2 (c€/kWh)</Label>
                <Input type="number" step="0.01" value={form.price_p2_energy ?? ''} onChange={e => setForm(f => ({ ...f, price_p2_energy: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio energía P3 (c€/kWh)</Label>
                <Input type="number" step="0.01" value={form.price_p3_energy ?? ''} onChange={e => setForm(f => ({ ...f, price_p3_energy: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio potencia P1 (€/kW·año)</Label>
                <Input type="number" step="0.01" value={form.price_p1_power ?? ''} onChange={e => setForm(f => ({ ...f, price_p1_power: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio potencia P2 (€/kW·año)</Label>
                <Input type="number" step="0.01" value={form.price_p2_power ?? ''} onChange={e => setForm(f => ({ ...f, price_p2_power: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha inicio validez</Label>
                <Input type="date" value={form.valid_from || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin validez</Label>
                <Input type="date" value={form.valid_to || ''} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value || null }))} />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Switch checked={form.has_permanence ?? false} onCheckedChange={v => setForm(f => ({ ...f, has_permanence: v }))} />
                <Label>Tiene permanencia</Label>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Tarifa activa</Label>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.supplier || !form.tariff_name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ElectricalTariffCatalogPanel;
