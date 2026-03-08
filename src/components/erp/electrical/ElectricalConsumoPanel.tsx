import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalConsumoPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Análisis de Consumo
        </h2>
        <p className="text-sm text-muted-foreground">Análisis de consumo eléctrico desglosado por periodos tarifarios (P1-P6).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumo por periodos</CardTitle>
          <CardDescription>Evolución y distribución del consumo energético</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Los gráficos de análisis de consumo se implementarán en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalConsumoPanel;
