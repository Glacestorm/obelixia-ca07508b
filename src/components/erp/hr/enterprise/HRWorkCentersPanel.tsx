/**
 * HRWorkCentersPanel - CRUD de centros de trabajo
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { MapPin, Plus, Pencil, Trash2, Home } from 'lucide-react';
import { useHREnterprise, type HRWorkCenter } from '@/hooks/admin/hr/useHREnterprise';

interface Props { companyId: string; }

const emptyCenter = (): Partial<HRWorkCenter> => ({
  code: '', name: '', city: '', province: '', country: 'ES', jurisdiction: 'ES', address: '', postal_code: '', cnae_code: '', ss_account_code: '', max_capacity: undefined, is_headquarters: false, is_active: true,
});

export function HRWorkCentersPanel({ companyId }: Props) {
  const { workCenters, fetchWorkCenters, saveWorkCenter, deleteWorkCenter, legalEntities, fetchLegalEntities, loading } = useHREnterprise();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<HRWorkCenter>>(emptyCenter());

  useEffect(() => { fetchWorkCenters(companyId); fetchLegalEntities(companyId); }, [companyId]);

  const handleSave = async () => {
    await saveWorkCenter({ ...form, company_id: companyId });
    setDialogOpen(false);
    setForm(emptyCenter());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" /> Centros de Trabajo</h3>
          <p className="text-sm text-muted-foreground">Ubicaciones físicas con código de cuenta de cotización</p>
        </div>
        <Button onClick={() => { setForm(emptyCenter()); setDialogOpen(true); }} size="sm"><Plus className="h-4 w-4 mr-2" /> Nuevo Centro</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Entidad Legal</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>CCC</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workCenters.map((center) => (
                <TableRow key={center.id}>
                  <TableCell><code className="text-xs">{center.code}</code></TableCell>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell className="text-sm">{(center as any).erp_hr_legal_entities?.name || '-'}</TableCell>
                  <TableCell>{center.city}</TableCell>
                  <TableCell><code className="text-xs">{center.ss_account_code || '-'}</code></TableCell>
                  <TableCell>{center.max_capacity || '-'}</TableCell>
                  <TableCell>{center.is_headquarters && <Home className="h-4 w-4 text-primary" />}</TableCell>
                  <TableCell><Badge variant={center.is_active ? 'default' : 'secondary'}>{center.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setForm(center); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteWorkCenter(center.id, companyId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workCenters.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin centros de trabajo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Centro de Trabajo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Código</Label><Input value={form.code || ''} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAD-HQ" /></div>
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Entidad Legal</Label>
              <Select value={form.legal_entity_id || ''} onValueChange={(v) => setForm(f => ({ ...f, legal_entity_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Ciudad</Label><Input value={form.city || ''} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Provincia</Label><Input value={form.province || ''} onChange={(e) => setForm(f => ({ ...f, province: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={form.address || ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-2"><Label>CCC (Seg. Social)</Label><Input value={form.ss_account_code || ''} onChange={(e) => setForm(f => ({ ...f, ss_account_code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>CNAE</Label><Input value={form.cnae_code || ''} onChange={(e) => setForm(f => ({ ...f, cnae_code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Capacidad máxima</Label><Input type="number" value={form.max_capacity || ''} onChange={(e) => setForm(f => ({ ...f, max_capacity: parseInt(e.target.value) || undefined }))} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.is_headquarters || false} onCheckedChange={(v) => setForm(f => ({ ...f, is_headquarters: v }))} />
              <Label>Es sede central</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.code || !form.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
