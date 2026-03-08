import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gauge } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalPotenciaPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-purple-500" />
          Análisis de Potencia
        </h2>
        <p className="text-sm text-muted-foreground">Comparativa de potencia contratada vs máxima demandada por periodo.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Potencia contratada vs demandada</CardTitle>
          <CardDescription>Identificación de sobre/infra-dimensionamiento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            El análisis de potencia se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalPotenciaPanel;
