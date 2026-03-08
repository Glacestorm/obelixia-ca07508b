import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalConsumoPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Análisis de Consumo" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Análisis de Consumo
        </h2>
        <p className="text-sm text-muted-foreground">Consumo eléctrico desglosado por periodos tarifarios (P1, P2, P3) con evolución temporal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por periodos</CardTitle>
            <CardDescription>Porcentaje de consumo en P1 (punta), P2 (llano) y P3 (valle)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Gráfico de distribución de consumo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución mensual</CardTitle>
            <CardDescription>Consumo total (kWh) de los últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Gráfico de evolución temporal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de facturas analizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Periodo</span>
              <span>kWh P1</span>
              <span>kWh P2</span>
              <span>kWh P3</span>
              <span>Total kWh</span>
              <span>€/kWh medio</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              Selecciona un expediente para ver el análisis de consumo.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalConsumoPanel;
