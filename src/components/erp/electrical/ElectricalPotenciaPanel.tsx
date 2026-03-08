import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalPotenciaPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Análisis" subsection="Potencia" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-purple-500" />
          Análisis de Potencia
        </h2>
        <p className="text-sm text-muted-foreground">Comparativa de potencia contratada vs máxima demandada por periodo. Detecta sobre/infra-dimensionamiento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Potencia contratada vs demandada</CardTitle>
            <CardDescription>P1 (punta) y P2 (valle) de los últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Gráfico comparativo de potencias</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Excesos y penalizaciones</CardTitle>
            <CardDescription>Meses con exceso de potencia y coste asociado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Tabla de excesos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ElectricalPotenciaPanel;
