import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalFacturasPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Facturas" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Facturas Eléctricas
          </h2>
          <p className="text-sm text-muted-foreground">Subida, validación y análisis de facturas de suministro eléctrico.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Subir factura
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por expediente o periodo..." className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facturas registradas</CardTitle>
          <CardDescription>Desglose de consumo, potencia, impuestos y coste total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>Periodo</span>
              <span>Días</span>
              <span>kWh total</span>
              <span>€ Energía</span>
              <span>€ Potencia</span>
              <span>Total</span>
              <span>Validada</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay facturas registradas. Sube una factura para comenzar el análisis.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalFacturasPanel;
