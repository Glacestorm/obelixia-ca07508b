import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalClientesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Clientes Energéticos" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Clientes Energéticos
          </h2>
          <p className="text-sm text-muted-foreground">Directorio de particulares y empresas vinculados a expedientes de optimización.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directorio de clientes</CardTitle>
          <CardDescription>Clientes con expedientes de consultoría eléctrica</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Nombre / Razón social</span>
              <span>Tipo</span>
              <span>CIF/NIF</span>
              <span>Expedientes</span>
              <span>Suministros</span>
              <span>Acciones</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay clientes energéticos registrados.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalClientesPanel;
