/**
 * HRLegalEntitiesPanel - CRUD de entidades legales
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useHREnterprise, type HRLegalEntity } from '@/hooks/admin/hr/useHREnterprise';

interface Props { companyId: string; }

const ENTITY_TYPES = [
  { value: 'SA', label: 'Sociedad Anónima' },
  { value: 'SL', label: 'Sociedad Limitada' },
  { value: 'SLU', label: 'S.L. Unipersonal' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'fundacion', label: 'Fundación' },
  { value: 'autonomo', label: 'Autónomo' },
];

const JURISDICTIONS = [
  { value: 'ES', label: '🇪🇸 España' },
  { value: 'AD', label: '🇦🇩 Andorra' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'FR', label: '🇫🇷 Francia' },
  { value: 'DE', label: '🇩🇪 Alemania' },
  { value: 'IT', label: '🇮🇹 Italia' },
  { value: 'UK', label: '🇬🇧 Reino Unido' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'CO', label: '🇨🇴 Colombia' },
];

const emptyEntity = (): Partial<HRLegalEntity> => ({
  name: '', legal_name: '', tax_id: '', entity_type: 'SL', jurisdiction: 'ES', country: 'ES', city: '', address: '', postal_code: '', ss_employer_code: '', cnae_code: '', is_active: true,
});

export function HRLegalEntitiesPanel({ companyId }: Props) {
  const { legalEntities, fetchLegalEntities, saveLegalEntity, deleteLegalEntity, loading } = useHREnterprise();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<HRLegalEntity>>(emptyEntity());

  useEffect(() => { fetchLegalEntities(companyId); }, [companyId]);

  const handleSave = async () => {
    await saveLegalEntity({ ...form, company_id: companyId });
    setDialogOpen(false);
    setForm(emptyEntity());
  };

  const handleEdit = (entity: HRLegalEntity) => {
    setForm(entity);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Entidades Legales
          </h3>
          <p className="text-sm text-muted-foreground">Gestión de sociedades y entidades jurídicas del grupo</p>
        </div>
        <Button onClick={() => { setForm(emptyEntity()); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nueva Entidad
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>CIF/NIF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Jurisdicción</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>CNAE</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legalEntities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  <TableCell className="text-sm">{entity.legal_name}</TableCell>
                  <TableCell><code className="text-xs">{entity.tax_id}</code></TableCell>
                  <TableCell><Badge variant="outline">{entity.entity_type}</Badge></TableCell>
                  <TableCell>{JURISDICTIONS.find(j => j.value === entity.jurisdiction)?.label || entity.jurisdiction}</TableCell>
                  <TableCell className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entity.city}</TableCell>
                  <TableCell><code className="text-xs">{entity.cnae_code}</code></TableCell>
                  <TableCell><Badge variant={entity.is_active ? 'default' : 'secondary'}>{entity.is_active ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(entity)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLegalEntity(entity.id, companyId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {legalEntities.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay entidades legales. Crea una o genera datos demo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar' : 'Nueva'} Entidad Legal</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre corto</Label>
              <Input value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Filial Barcelona" />
            </div>
            <div className="space-y-2">
              <Label>Razón social</Label>
              <Input value={form.legal_name || ''} onChange={(e) => setForm(f => ({ ...f, legal_name: e.target.value }))} placeholder="Mi Empresa S.L." />
            </div>
            <div className="space-y-2">
              <Label>CIF/NIF</Label>
              <Input value={form.tax_id || ''} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} placeholder="B12345678" />
            </div>
            <div className="space-y-2">
              <Label>Tipo societario</Label>
              <Select value={form.entity_type} onValueChange={(v) => setForm(f => ({ ...f, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jurisdicción</Label>
              <Select value={form.jurisdiction} onValueChange={(v) => setForm(f => ({ ...f, jurisdiction: v, country: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JURISDICTIONS.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.city || ''} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.address || ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Código Postal</Label>
              <Input value={form.postal_code || ''} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CCC Patronal (SS)</Label>
              <Input value={form.ss_employer_code || ''} onChange={(e) => setForm(f => ({ ...f, ss_employer_code: e.target.value }))} placeholder="28/1234567/89" />
            </div>
            <div className="space-y-2">
              <Label>CNAE</Label>
              <Input value={form.cnae_code || ''} onChange={(e) => setForm(f => ({ ...f, cnae_code: e.target.value }))} placeholder="6201" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.legal_name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
