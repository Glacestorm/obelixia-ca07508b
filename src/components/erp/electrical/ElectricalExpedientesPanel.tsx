import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalExpedientesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Expedientes" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-yellow-500" />
            Gestión de Expedientes
          </h2>
          <p className="text-sm text-muted-foreground">Alta, edición y seguimiento de expedientes de optimización eléctrica.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Expediente
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por referencia, cliente o CUPS..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
        <div className="flex gap-2 ml-auto">
          {['Todos', 'Borrador', 'En análisis', 'Completado'].map(f => (
            <Badge key={f} variant={f === 'Todos' ? 'default' : 'outline'} className="cursor-pointer text-xs">{f}</Badge>
          ))}
        </div>
      </div>

      {/* Table placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de expedientes</CardTitle>
          <CardDescription>Expedientes asociados a la empresa activa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Referencia</span>
              <span>Cliente</span>
              <span>CUPS</span>
              <span>Estado</span>
              <span>Prioridad</span>
              <span>Ahorro est.</span>
              <span>Acciones</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay expedientes creados. Haz clic en "Nuevo Expediente" para comenzar.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalExpedientesPanel;
