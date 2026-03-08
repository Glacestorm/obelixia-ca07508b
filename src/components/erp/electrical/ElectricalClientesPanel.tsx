import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Users, Search, RefreshCw, Plus, Pencil, Trash2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { PermissionGate } from './PermissionGate';
import { useEnergyCustomers, EnergyCustomer } from '@/hooks/erp/useEnergyCustomers';

interface Props { companyId: string; }

const CUSTOMER_TYPES = [
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'public', label: 'Administración pública' },
  { value: 'community', label: 'Comunidad de propietarios' },
];

const emptyForm = {
  name: '', tax_id: '', email: '', phone: '', address: '', city: '',
  postal_code: '', province: '', contact_person: '', customer_type: 'residential',
  notes: '', is_active: true,
};

export function ElectricalClientesPanel({ companyId }: Props) {
  const {
    filtered, loading, search, setSearch,
    fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
  } = useEnergyCustomers(companyId);

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (c: EnergyCustomer) => {
    setEditId(c.id);
    setForm({
      name: c.name, tax_id: c.tax_id || '', email: c.email || '', phone: c.phone || '',
      address: c.address || '', city: c.city || '', postal_code: c.postal_code || '',
      province: c.province || '', contact_person: c.contact_person || '',
      customer_type: c.customer_type || 'residential', notes: c.notes || '',
      is_active: c.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      tax_id: form.tax_id.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      postal_code: form.postal_code.trim() || null,
      province: form.province.trim() || null,
      contact_person: form.contact_person.trim() || null,
      customer_type: form.customer_type,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };
    if (editId) await updateCustomer(editId, payload);
    else await createCustomer(payload);
    setSaving(false);
    setShowDialog(false);
  }, [form, editId, createCustomer, updateCustomer]);

  const typeLabel = (t: string | null) => CUSTOMER_TYPES.find(ct => ct.value === t)?.label || t || '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Clientes Energéticos" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" /> Clientes Energéticos
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} clientes registrados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
          <PermissionGate action="edit_cases">
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo cliente</Button>
          </PermissionGate>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, NIF, email, ciudad..." className="pl-9"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Directorio de clientes</CardTitle>
          <CardDescription>Clientes energéticos con CRUD completo vinculados a expedientes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_0.5fr_0.5fr_0.3fr] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Cliente</span><span>NIF/CIF</span><span>Email</span><span>Ciudad</span><span>Tipo</span><span>Exptes.</span><span></span>
              </div>
              {loading && filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando clientes...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay clientes registrados. Crea uno nuevo para vincular a expedientes.
                </div>
              ) : filtered.map(c => (
                <div key={c.id}
                  className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_0.5fr_0.5fr_0.3fr] gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors text-sm items-center cursor-pointer group"
                  onClick={() => openEdit(c)}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{c.name}</span>
                    {!c.is_active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{c.tax_id || '—'}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.email || '—'}</span>
                  <span className="text-xs text-muted-foreground">{c.city || '—'}</span>
                  <Badge variant="secondary" className="text-[10px] w-fit">{typeLabel(c.customer_type)}</Badge>
                  <Badge variant="outline" className="text-xs w-fit">{c.cases_count || 0}</Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <PermissionGate action="edit_cases">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={e => { e.stopPropagation(); deleteCustomer(c.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Customer form dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar cliente' : 'Nuevo cliente energético'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nombre / Razón social *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Industrias García S.L." />
              </div>
              <div className="grid gap-2">
                <Label>NIF / CIF</Label>
                <Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
                  placeholder="Ej: B12345678" className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Persona de contacto</Label>
                <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de cliente</Label>
                <Select value={form.customer_type} onValueChange={v => setForm(f => ({ ...f, customer_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Dirección</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Ciudad</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>CP</Label>
                <Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Provincia</Label>
                <Input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones sobre el cliente..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Cliente activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ElectricalClientesPanel;
