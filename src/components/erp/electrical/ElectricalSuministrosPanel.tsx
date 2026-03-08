import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalSuministrosPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Suministros & CUPS" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Suministros & CUPS
          </h2>
          <p className="text-sm text-muted-foreground">Puntos de suministro eléctrico, códigos CUPS, potencias contratadas y distribuidoras.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Suministro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por CUPS o dirección..." className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Puntos de suministro</CardTitle>
          <CardDescription>CUPS vinculados a expedientes activos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>CUPS</span>
              <span>Expediente</span>
              <span>Distribuidora</span>
              <span>Tarifa acceso</span>
              <span>Pot. P1</span>
              <span>Pot. P2</span>
              <span>Acciones</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay suministros registrados.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSuministrosPanel;
