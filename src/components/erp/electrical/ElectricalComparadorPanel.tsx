import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitCompareArrows } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalComparadorPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Comparador de Tarifas" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-purple-500" />
          Comparador de Tarifas
        </h2>
        <p className="text-sm text-muted-foreground">Simulación de coste con diferentes comercializadoras y tarifas del mercado eléctrico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarifa actual</CardTitle>
            <CardDescription>Coste con la configuración vigente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Resumen tarifa actual</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mejor alternativa</CardTitle>
            <CardDescription>Opción con mayor ahorro estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-emerald-500/5 border-emerald-500/20">
              <p className="text-sm text-muted-foreground">Tarifa recomendada</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ahorro proyectado</CardTitle>
            <CardDescription>Diferencia anual estimada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Cálculo de ahorro</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de tarifas</CardTitle>
          <CardDescription>Tarifas disponibles en el mercado eléctrico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Comercializadora</span>
              <span>Tarifa</span>
              <span>€/kWh P1</span>
              <span>€/kWh P2</span>
              <span>€/kWh P3</span>
              <span>€/kW P1</span>
              <span>Permanencia</span>
              <span>Estado</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              Configura el catálogo de tarifas en Ajustes para usar el comparador.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalComparadorPanel;
