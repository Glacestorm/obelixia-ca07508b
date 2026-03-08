import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSignature, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalContratosPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Contratos" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-indigo-500" />
          Contratos de Suministro
        </h2>
        <p className="text-sm text-muted-foreground">Contratos eléctricos activos, vencimientos, permanencias y condiciones.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contrato..." className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos activos</CardTitle>
          <CardDescription>Condiciones contractuales, comercializadoras y fechas de vencimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>Comercializadora</span>
              <span>Tarifa</span>
              <span>Inicio</span>
              <span>Fin</span>
              <span>Permanencia</span>
              <span>Documento</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay contratos registrados.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalContratosPanel;
