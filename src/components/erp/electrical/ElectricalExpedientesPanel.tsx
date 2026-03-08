import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, Plus, Search, RefreshCw, Trash2, Eye } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { useEnergyCases, EnergyCase } from '@/hooks/erp/useEnergyCases';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  analysis: { label: 'En análisis', variant: 'secondary' },
  proposal: { label: 'Propuesta', variant: 'default' },
  implementation: { label: 'Implementación', variant: 'default' },
  completed: { label: 'Completado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground' },
  medium: { label: 'Media', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  critical: { label: 'Crítica', color: 'text-destructive' },
};

export function ElectricalExpedientesPanel({ companyId }: Props) {
  const {
    cases, loading, filters, setFilters,
    fetchCases, createCase, deleteCase,
    uniqueSuppliers,
  } = useEnergyCases(companyId);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', cups: '', current_supplier: '', current_tariff: '', priority: 'medium', status: 'draft' });

  const handleCreate = useCallback(async () => {
    if (!newForm.title.trim()) return;
    const result = await createCase(newForm);
    if (result) {
      setShowNewDialog(false);
      setNewForm({ title: '', cups: '', current_supplier: '', current_tariff: '', priority: 'medium', status: 'draft' });
    }
  }, [newForm, createCase]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  const formatCurrency = (v: number | null) => {
    if (v == null) return '—';
    return `${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Expedientes" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-yellow-500" />
            Gestión de Expedientes
          </h2>
          <p className="text-sm text-muted-foreground">Alta, edición y seguimiento de expedientes de optimización eléctrica.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchCases()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Expediente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, CUPS, comercializadora..."
            className="pl-9"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={v => setFilters(f => ({ ...f, priority: v }))}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITY_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {uniqueSuppliers.length > 0 && (
          <Select value={filters.supplier} onValueChange={v => setFilters(f => ({ ...f, supplier: v }))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Comercializadora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{cases.length} expedientes</span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Listado de expedientes</CardTitle>
          <CardDescription>Expedientes asociados a la empresa activa</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_0.8fr_1fr_0.7fr] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Título</span>
                <span>CUPS</span>
                <span>Comercializadora</span>
                <span>Tarifa</span>
                <span>Estado</span>
                <span>Prioridad</span>
                <span>Ahorro est./mes</span>
                <span>Fin contrato</span>
              </div>
              {loading && cases.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando expedientes...</div>
              ) : cases.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay expedientes. Haz clic en "Nuevo Expediente" para comenzar.
                </div>
              ) : (
                cases.map(c => {
                  const status = STATUS_MAP[c.status] || { label: c.status, variant: 'outline' as const };
                  const priority = PRIORITY_MAP[c.priority] || { label: c.priority, color: '' };
                  return (
                    <div key={c.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_0.8fr_1fr_0.7fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors items-center text-sm group">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className="text-muted-foreground truncate font-mono text-xs">{c.cups || '—'}</span>
                      <span className="truncate">{c.current_supplier || '—'}</span>
                      <span className="truncate text-muted-foreground">{c.current_tariff || '—'}</span>
                      <Badge variant={status.variant} className="text-[10px] w-fit">{status.label}</Badge>
                      <span className={cn("text-xs font-medium", priority.color)}>{priority.label}</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(c.estimated_monthly_savings)}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatDate(c.contract_end_date)}</span>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteCase(c.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Case Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Expediente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Optimización factura Nave Industrial" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>CUPS</Label>
                <Input value={newForm.cups} onChange={e => setNewForm(f => ({ ...f, cups: e.target.value }))} placeholder="ES0021..." />
              </div>
              <div className="grid gap-2">
                <Label>Comercializadora actual</Label>
                <Input value={newForm.current_supplier} onChange={e => setNewForm(f => ({ ...f, current_supplier: e.target.value }))} placeholder="Ej: Iberdrola" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tarifa actual</Label>
                <Input value={newForm.current_tariff} onChange={e => setNewForm(f => ({ ...f, current_tariff: e.target.value }))} placeholder="Ej: 2.0TD" />
              </div>
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select value={newForm.priority} onValueChange={v => setNewForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newForm.title.trim()}>Crear Expediente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ElectricalExpedientesPanel;
