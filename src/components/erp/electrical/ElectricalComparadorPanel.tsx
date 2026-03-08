import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitCompareArrows } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalComparadorPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-purple-500" />
          Comparador de Tarifas
        </h2>
        <p className="text-sm text-muted-foreground">Comparativa entre comercializadoras, tarifas y ofertas del mercado eléctrico.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativas disponibles</CardTitle>
          <CardDescription>Simulación de coste con diferentes tarifas y comercializadoras</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            El comparador de tarifas se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalComparadorPanel;
