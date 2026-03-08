import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalRecomendacionesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Recomendaciones de Tarifa y Potencia
        </h2>
        <p className="text-sm text-muted-foreground">Simulación de tarifa óptima y ajuste de potencia contratada.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motor de recomendaciones</CardTitle>
          <CardDescription>Cálculo automático de la mejor configuración tarifaria</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            El motor de recomendaciones se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalRecomendacionesPanel;
