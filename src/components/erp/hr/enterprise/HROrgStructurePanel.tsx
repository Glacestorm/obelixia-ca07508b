/**
 * HROrgStructurePanel - Organigrama jerárquico
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Network, Plus, ChevronRight, Building2, Users, FolderTree } from 'lucide-react';
import { useHREnterprise, type HROrgUnit } from '@/hooks/admin/hr/useHREnterprise';
import { cn } from '@/lib/utils';

interface Props { companyId: string; }

const UNIT_TYPES = [
  { value: 'division', label: 'División', color: 'bg-blue-500' },
  { value: 'area', label: 'Área', color: 'bg-purple-500' },
  { value: 'department', label: 'Departamento', color: 'bg-green-500' },
  { value: 'section', label: 'Sección', color: 'bg-amber-500' },
  { value: 'team', label: 'Equipo', color: 'bg-cyan-500' },
];

function OrgTree({ units, parentId = null, level = 0 }: { units: HROrgUnit[]; parentId?: string | null; level?: number }) {
  const children = units.filter(u => (u.parent_id || null) === parentId);
  if (children.length === 0) return null;

  return (
    <div className={cn("space-y-1", level > 0 && "ml-6 border-l border-border pl-4")}>
      {children.map((unit) => {
        const typeInfo = UNIT_TYPES.find(t => t.value === unit.unit_type);
        const hasChildren = units.some(u => u.parent_id === unit.id);
        return (
          <div key={unit.id}>
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              {hasChildren ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <div className="w-4" />}
              <div className={cn("w-2 h-2 rounded-full", typeInfo?.color || 'bg-gray-500')} />
              <span className="font-medium text-sm">{unit.name}</span>
              <Badge variant="outline" className="text-xs">{unit.code}</Badge>
              <Badge variant="secondary" className="text-xs">{typeInfo?.label || unit.unit_type}</Badge>
              {unit.erp_hr_legal_entities && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{unit.erp_hr_legal_entities.name}
                </span>
              )}
            </div>
            <OrgTree units={units} parentId={unit.id} level={level + 1} />
          </div>
        );
      })}
    </div>
  );
}

export function HROrgStructurePanel({ companyId }: Props) {
  const { orgUnits, fetchOrgUnits, saveOrgUnit, legalEntities, fetchLegalEntities, loading } = useHREnterprise();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<HROrgUnit>>({});

  useEffect(() => { fetchOrgUnits(companyId); fetchLegalEntities(companyId); }, [companyId]);

  const handleSave = async () => {
    await saveOrgUnit({ ...form, company_id: companyId });
    setDialogOpen(false);
    setForm({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><FolderTree className="h-5 w-5" /> Estructura Organizativa</h3>
          <p className="text-sm text-muted-foreground">Divisiones, áreas, departamentos, secciones y equipos</p>
        </div>
        <Button onClick={() => { setForm({ unit_type: 'department', is_active: true }); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nueva Unidad
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-5 w-5" />
            Organigrama ({orgUnits.length} unidades)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgUnits.length > 0 ? (
            <OrgTree units={orgUnits} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Sin unidades organizativas. Crea una o genera datos demo.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Unidad Organizativa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Código</Label><Input value={form.code || ''} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="TEC-DEV" /></div>
              <div className="space-y-2"><Label>Nombre</Label><Input value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Desarrollo" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.unit_type || 'department'} onValueChange={(v) => setForm(f => ({ ...f, unit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidad padre</Label>
                <Select value={form.parent_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, parent_id: v === 'none' ? undefined : v }))}>
                  <SelectTrigger><SelectValue placeholder="Raíz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Raíz —</SelectItem>
                    {orgUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Entidad Legal</Label>
              <Select value={form.legal_entity_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, legal_entity_id: v === 'none' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Centro de Coste</Label><Input value={form.cost_center || ''} onChange={(e) => setForm(f => ({ ...f, cost_center: e.target.value }))} placeholder="CC-1001" /></div>
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
