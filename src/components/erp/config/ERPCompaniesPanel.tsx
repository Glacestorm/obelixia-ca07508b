import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { useERPCompanies } from '@/hooks/erp/useERPCompanies';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN'];
const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },
  { code: 'US', name: 'Estados Unidos' },
];

export function ERPCompaniesPanel() {
  const { companies, groups, isLoading, fetchCompanies, createCompany, updateCompany, deleteCompany } = useERPCompanies();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    country: 'ES',
    currency: 'EUR',
  });

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = async () => {
    if (!form.name) return;
    await createCompany(form);
    setForm({ name: '', legal_name: '', tax_id: '', country: 'ES', currency: 'EUR' });
    setIsCreateOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta empresa?')) {
      await deleteCompany(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Empresas</CardTitle>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Empresa</DialogTitle>
                <DialogDescription>Crea una nueva empresa</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input value={form.legal_name} onChange={(e) => setForm(f => ({ ...f, legal_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>CIF/NIF</Label>
                  <Input value={form.tax_id} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value.toUpperCase() }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select value={form.country} onValueChange={(v) => setForm(f => ({ ...f, country: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
        <CardDescription>Gestión de empresas multi-tenant</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CIF</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay empresas</TableCell></TableRow>
              ) : (
                companies.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.tax_id || '-'}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ERPCompaniesPanel;
