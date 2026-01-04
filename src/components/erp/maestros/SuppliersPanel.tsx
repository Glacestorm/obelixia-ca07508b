/**
 * Panel de gestión de Proveedores - Refactorizado con Tabs completos
 * Similar a CustomersPanel: General, Direcciones, Contactos, Pagos, Auditoría
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Truck, 
  Building2, 
  MapPin, 
  Phone, 
  CreditCard, 
  History,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useMaestros, Supplier } from '@/hooks/erp/useMaestros';
import { supabase } from '@/integrations/supabase/client';
import { DataTable, Column } from './shared/DataTable';
import { SearchFilters, FilterOption } from './shared/SearchFilters';
import { StatusBadge } from './shared/StatusBadge';
import { StatsCard } from './shared/StatsCard';
import { CustomerAuditFeed } from './CustomerAuditFeed';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ========== TYPES ==========
interface SupplierAddress {
  id: string;
  supplier_id: string;
  address_type: 'billing' | 'shipping' | 'other';
  line1: string;
  line2?: string;
  city: string;
  postal_code?: string;
  region?: string;
  country: string;
  is_default: boolean;
}

interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary: boolean;
}

interface SupplierPayment {
  supplier_id: string;
  payment_terms_id?: string;
  notes?: string;
}

const INITIAL_FORM = {
  code: '',
  legal_name: '',
  tax_id: '',
  email: '',
  phone: '',
  notes: '',
  is_active: true
};

// ========== SUB-COMPONENTS ==========

// Addresses Tab
const SupplierAddressesTab: React.FC<{
  supplierId: string;
  addresses: SupplierAddress[];
  onRefresh: () => void;
}> = ({ supplierId, addresses, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    address_type: 'billing' as 'billing' | 'shipping' | 'other',
    line1: '', line2: '', city: '', postal_code: '', region: '', country: 'ES', is_default: false
  });

  const handleSave = async () => {
    const { error } = await supabase.from('supplier_addresses').insert({ 
      supplier_id: supplierId, ...form 
    });
    if (error) { toast.error('Error al crear dirección'); return; }
    toast.success('Dirección creada');
    setIsAdding(false);
    setForm({ address_type: 'billing', line1: '', line2: '', city: '', postal_code: '', region: '', country: 'ES', is_default: false });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    await supabase.from('supplier_addresses').delete().eq('id', id);
    toast.success('Dirección eliminada');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Direcciones ({addresses.length})</h4>
        <Button size="sm" onClick={() => setIsAdding(true)}><Plus className="h-4 w-4 mr-1" />Nueva</Button>
      </div>

      {isAdding && (
        <Card className="p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select 
                className="w-full mt-1 p-2 border rounded text-sm"
                value={form.address_type}
                onChange={(e) => setForm({ ...form, address_type: e.target.value as any })}
              >
                <option value="billing">Facturación</option>
                <option value="shipping">Envío</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Dirección línea 1 *</Label>
            <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Ciudad *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>CP</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
            <div><Label>Región</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_default} onCheckedChange={(c) => setForm({ ...form, is_default: c })} />
            <Label>Dirección por defecto</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.line1 || !form.city}>Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {addresses.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay direcciones registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <Card key={addr.id} className="p-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{addr.line1}</span>
                  {addr.is_default && <StatusBadge status="active" activeLabel="Principal" size="sm" />}
                </div>
                <p className="text-xs text-muted-foreground">{addr.city}, {addr.postal_code} - {addr.country}</p>
                <p className="text-xs text-muted-foreground capitalize">{addr.address_type}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(addr.id)} className="text-destructive h-7 w-7">
                <XCircle className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Contacts Tab
const SupplierContactsTab: React.FC<{
  supplierId: string;
  contacts: SupplierContact[];
  onRefresh: () => void;
}> = ({ supplierId, contacts, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', is_primary: false });

  const handleSave = async () => {
    const { error } = await supabase.from('supplier_contacts').insert({ supplier_id: supplierId, ...form });
    if (error) { toast.error('Error al crear contacto'); return; }
    toast.success('Contacto creado');
    setIsAdding(false);
    setForm({ name: '', email: '', phone: '', role: '', is_primary: false });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    await supabase.from('supplier_contacts').delete().eq('id', id);
    toast.success('Contacto eliminado');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Contactos ({contacts.length})</h4>
        <Button size="sm" onClick={() => setIsAdding(true)}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
      </div>

      {isAdding && (
        <Card className="p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Cargo</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_primary} onCheckedChange={(c) => setForm({ ...form, is_primary: c })} />
            <Label>Contacto principal</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.name}>Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {contacts.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-muted-foreground">
          <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay contactos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="p-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  {c.is_primary && <StatusBadge status="active" activeLabel="Principal" size="sm" />}
                </div>
                {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                <p className="text-xs text-muted-foreground">{c.email} {c.phone && `| ${c.phone}`}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive h-7 w-7">
                <XCircle className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Payment Tab
const SupplierPaymentTab: React.FC<{ supplierId: string }> = ({ supplierId }) => {
  const { paymentTerms } = useMaestros();
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ payment_terms_id: '', notes: '' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('supplier_payment')
        .select('*')
        .eq('supplier_id', supplierId)
        .single();
      if (data) {
        setPayment(data);
        setForm({ payment_terms_id: data.payment_terms_id || '', notes: data.notes || '' });
      }
      setLoading(false);
    };
    load();
  }, [supplierId]);

  const handleSave = async () => {
    const payload = { supplier_id: supplierId, ...form, payment_terms_id: form.payment_terms_id || null };
    const { error } = payment
      ? await supabase.from('supplier_payment').update(payload).eq('supplier_id', supplierId)
      : await supabase.from('supplier_payment').insert(payload);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Condiciones guardadas');
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Condiciones de Pago</Label>
        <select 
          className="w-full p-2 border rounded text-sm"
          value={form.payment_terms_id}
          onChange={(e) => setForm({ ...form, payment_terms_id: e.target.value })}
        >
          <option value="">Sin especificar</option>
          {paymentTerms.map((pt) => (
            <option key={pt.id} value={pt.id}>{pt.name} ({pt.days} días)</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
      <Button onClick={handleSave}>Guardar Cambios</Button>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
export const SuppliersPanel: React.FC = () => {
  const { suppliers, suppliersLoading, createSupplier, updateSupplier, deleteSupplier } = useMaestros();
  
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState('general');
  
  // Related data
  const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);

  // Stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length
  }), [suppliers]);

  // Memoized filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        s.legal_name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.tax_id?.toLowerCase().includes(q));
      const matchesActive = showInactive || s.is_active;
      return matchesSearch && matchesActive;
    });
  }, [suppliers, search, showInactive]);

  // Load supplier details
  const loadSupplierDetails = useCallback(async (supplierId: string) => {
    const [addrRes, contactRes] = await Promise.all([
      supabase.from('supplier_addresses').select('*').eq('supplier_id', supplierId).order('is_default', { ascending: false }),
      supabase.from('supplier_contacts').select('*').eq('supplier_id', supplierId).order('is_primary', { ascending: false })
    ]);
    setAddresses((addrRes.data as SupplierAddress[]) || []);
    setContacts((contactRes.data as SupplierContact[]) || []);
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierDetails(selectedSupplier.id);
    }
  }, [selectedSupplier?.id, loadSupplierDetails]);

  // Filter configuration
  const filters: FilterOption[] = useMemo(() => [
    { key: 'showInactive', label: 'Mostrar inactivos', type: 'switch', defaultValue: false }
  ], []);

  const filterValues = useMemo(() => ({ showInactive }), [showInactive]);

  const handleFilterChange = useCallback((key: string, value: string | boolean) => {
    if (key === 'showInactive') setShowInactive(value as boolean);
  }, []);

  // Table columns
  const columns: Column<Supplier>[] = useMemo(() => [
    { key: 'code', header: 'Código', accessor: (row) => <span className="font-mono text-sm">{row.code}</span>, sortable: true },
    { key: 'legal_name', header: 'Nombre', accessor: (row) => <span className="font-medium">{row.legal_name}</span>, sortable: true },
    { key: 'tax_id', header: 'CIF/NIF', accessor: (row) => <span className="font-mono text-sm">{row.tax_id || '-'}</span>, sortable: true },
    { key: 'email', header: 'Email', accessor: (row) => <span className="text-sm">{row.email || '-'}</span> },
    { key: 'phone', header: 'Teléfono', accessor: (row) => <span className="text-sm">{row.phone || '-'}</span> },
    { key: 'is_active', header: 'Estado', accessor: (row) => <StatusBadge status={row.is_active} /> }
  ], []);

  // Dialog handlers
  const openNewDialog = useCallback(() => {
    setSelectedSupplier(null);
    setFormData(INITIAL_FORM);
    setAddresses([]);
    setContacts([]);
    setActiveTab('general');
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      code: supplier.code,
      legal_name: supplier.legal_name,
      tax_id: supplier.tax_id || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active
    });
    setActiveTab('general');
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplier) {
      await updateSupplier.mutateAsync({ id: selectedSupplier.id, ...formData });
    } else {
      const result = await createSupplier.mutateAsync(formData);
      if (result) setSelectedSupplier(result as Supplier);
    }
    setIsDialogOpen(false);
  }, [selectedSupplier, formData, updateSupplier, createSupplier]);

  const handleDelete = useCallback(async (supplier: Supplier) => {
    if (!confirm(`¿Eliminar el proveedor "${supplier.legal_name}"?`)) return;
    await deleteSupplier.mutateAsync(supplier.id);
  }, [deleteSupplier]);

  const handleRefreshDetails = useCallback(() => {
    if (selectedSupplier) loadSupplierDetails(selectedSupplier.id);
  }, [selectedSupplier, loadSupplierDetails]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Proveedores
            </CardTitle>
            <Button onClick={openNewDialog} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatsCard label="Total" value={stats.total} icon={<Truck className="h-4 w-4" />} />
            <StatsCard label="Activos" value={stats.active} icon={<CheckCircle className="h-4 w-4" />} iconBgColor="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600" />
            <StatsCard label="Inactivos" value={stats.inactive} icon={<XCircle className="h-4 w-4" />} iconBgColor="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600" />
          </div>
          
          <SearchFilters
            search={search}
            onSearchChange={setSearch}
            placeholder="Buscar por nombre, código o CIF..."
            filters={filters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
          />
        </CardHeader>

        <CardContent>
          <DataTable
            data={filteredSuppliers}
            columns={columns}
            loading={suppliersLoading}
            emptyIcon={<Truck className="h-12 w-12" />}
            emptyMessage="No hay proveedores"
            emptyDescription={search ? 'que coincidan con la búsqueda' : undefined}
            onRowDoubleClick={openEditDialog}
            rowActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)} className="h-7 w-7">
                  <Building2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} className="h-7 w-7 text-destructive">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
            exportFilename="proveedores"
          />
        </CardContent>
      </Card>

      {/* Dialog with Tabs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? `Editar Proveedor: ${selectedSupplier.code}` : 'Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier 
                ? 'Modifica los datos del proveedor, direcciones, contactos y pagos'
                : 'Introduce los datos del nuevo proveedor'
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="gap-1" disabled={!selectedSupplier}>
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Direcciones</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-1" disabled={!selectedSupplier}>
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contactos</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-1" disabled={!selectedSupplier}>
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Pagos</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1" disabled={!selectedSupplier}>
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Auditoría</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="PROV001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">CIF/NIF</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.toUpperCase() })}
                      placeholder="B12345678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Razón Social *</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Proveedor S.L."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@proveedor.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+34 912 345 678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observaciones..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Proveedor activo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                    {selectedSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="addresses" className="mt-4">
              {selectedSupplier && (
                <SupplierAddressesTab
                  supplierId={selectedSupplier.id}
                  addresses={addresses}
                  onRefresh={handleRefreshDetails}
                />
              )}
            </TabsContent>

            <TabsContent value="contacts" className="mt-4">
              {selectedSupplier && (
                <SupplierContactsTab
                  supplierId={selectedSupplier.id}
                  contacts={contacts}
                  onRefresh={handleRefreshDetails}
                />
              )}
            </TabsContent>

            <TabsContent value="payment" className="mt-4">
              {selectedSupplier && (
                <SupplierPaymentTab supplierId={selectedSupplier.id} />
              )}
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              {selectedSupplier && (
                <CustomerAuditFeed entityId={selectedSupplier.id} entityType="supplier" />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SuppliersPanel;
