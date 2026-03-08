import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalRecomendacionesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Recomendaciones" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Recomendaciones de Tarifa y Potencia
        </h2>
        <p className="text-sm text-muted-foreground">Cálculo automático de la configuración tarifaria y de potencia óptima para cada expediente.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recomendaciones generadas</CardTitle>
          <CardDescription>Resultado del análisis de consumo, potencia y comparación de mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>Comercializadora</span>
              <span>Tarifa</span>
              <span>Pot. P1</span>
              <span>Pot. P2</span>
              <span>Ahorro/mes</span>
              <span>Riesgo</span>
              <span>Confianza</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              Genera recomendaciones desde el análisis de un expediente.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalRecomendacionesPanel;
