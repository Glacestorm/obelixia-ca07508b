/**
 * Panel de gestión de Proveedores - Con Pestañas Completas
 * Similar a CustomersPanel con tabs de Direcciones, Contactos, Pagos y Auditoría
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  MapPin,
  Phone,
  Building2,
  CreditCard,
  History,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useMaestros, Supplier } from '@/hooks/erp/useMaestros';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CustomerAuditFeed } from './CustomerAuditFeed';
import { 
  SupplierAddressesTab,
  SupplierContactsTab,
  SupplierPaymentTab,
  SupplierGeneralForm,
  SupplierFormData,
  SupplierAddress,
  SupplierContact
} from './suppliers';
import { 
  DataTable, 
  Column, 
  SearchFilters,
  StatusBadge,
  StatsCard
} from './shared';

const emptyFormData: SupplierFormData = {
  code: '',
  legal_name: '',
  tax_id: '',
  email: '',
  phone: '',
  notes: '',
  is_active: true
};

export const SuppliersPanel: React.FC = () => {
  const { suppliers, suppliersLoading, createSupplier, updateSupplier, deleteSupplier } = useMaestros();

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState('general');

  const [formData, setFormData] = useState<SupplierFormData>(emptyFormData);
  const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);

  // Stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length
  }), [suppliers]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.legal_name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.tax_id?.toLowerCase().includes(q) ?? false);
      const matchesActive = showInactive || s.is_active;
      return matchesSearch && matchesActive;
    });
  }, [suppliers, search, showInactive]);

  // Load supplier details
  const loadSupplierDetails = useCallback(async (supplierId: string) => {
    const [addressRes, contactRes] = await Promise.all([
      supabase
        .from('supplier_addresses')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_default', { ascending: false }),
      supabase
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_primary', { ascending: false })
    ]);

    setAddresses((addressRes.data as SupplierAddress[]) || []);
    setContacts((contactRes.data as SupplierContact[]) || []);
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierDetails(selectedSupplier.id);
    }
  }, [selectedSupplier?.id, loadSupplierDetails]);

  const openNewDialog = () => {
    setSelectedSupplier(null);
    setFormData(emptyFormData);
    setAddresses([]);
    setContacts([]);
    setActiveDetailTab('general');
    setIsDialogOpen(true);
  };

  const openEditDialog = (supplier: Supplier) => {
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
    setActiveDetailTab('general');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSupplier) {
      await updateSupplier.mutateAsync({ id: selectedSupplier.id, ...formData });
    } else {
      const result = await createSupplier.mutateAsync(formData);
      if (result) {
        setSelectedSupplier(result as Supplier);
      }
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = async (supplier: Supplier) => {
    const label = supplier.tax_id ? `${supplier.legal_name} (${supplier.tax_id})` : supplier.legal_name;
    if (!confirm(`¿Estás seguro de eliminar este proveedor?\n\n${label}`)) return;
    await deleteSupplier.mutateAsync(supplier.id);
  };

  const handleRefreshDetails = useCallback(() => {
    if (selectedSupplier) {
      loadSupplierDetails(selectedSupplier.id);
    }
  }, [selectedSupplier, loadSupplierDetails]);

  // Table columns
  const columns: Column<Supplier>[] = [
    { 
      key: 'code', 
      header: 'Código', 
      sortable: true,
      className: 'w-[100px]',
      accessor: (s) => <span className="font-mono text-sm">{s.code || '-'}</span>
    },
    { 
      key: 'legal_name', 
      header: 'Nombre', 
      sortable: true,
      accessor: (s) => <p className="font-medium">{s.legal_name}</p>
    },
    { 
      key: 'tax_id', 
      header: 'CIF/NIF',
      accessor: (s) => <span className="font-mono text-sm">{s.tax_id || '-'}</span>
    },
    { 
      key: 'email', 
      header: 'Email',
      accessor: (s) => <span className="text-sm">{s.email || '-'}</span>
    },
    { 
      key: 'phone', 
      header: 'Teléfono',
      accessor: (s) => <span className="text-sm">{s.phone || '-'}</span>
    },
    { 
      key: 'is_active', 
      header: 'Estado',
      accessor: (s) => <StatusBadge status={s.is_active} />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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

          {/* Filters */}
          <SearchFilters
            search={search}
            onSearchChange={setSearch}
            placeholder="Buscar por nombre, código o CIF..."
            filters={[
              {
                key: 'showInactive',
                label: 'Mostrar inactivos',
                type: 'switch',
                defaultValue: false
              }
            ]}
            filterValues={{ showInactive }}
            onFilterChange={(key, value) => {
              if (key === 'showInactive') setShowInactive(value as boolean);
            }}
          />
        </CardHeader>

        <CardContent>
          <DataTable
            data={filteredSuppliers}
            columns={columns}
            loading={suppliersLoading}
            emptyIcon={<Truck className="h-12 w-12" />}
            emptyMessage="No hay proveedores"
            emptyDescription={search ? 'que coincidan con la búsqueda' : 'Crea tu primer proveedor'}
            onRowClick={openEditDialog}
            rowActions={(s) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(s);
                  }}
                >
                  <Building2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
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

          <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
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
              <SupplierGeneralForm
                formData={formData}
                onChange={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setIsDialogOpen(false)}
                isEditing={!!selectedSupplier}
                isPending={createSupplier.isPending || updateSupplier.isPending}
              />
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
