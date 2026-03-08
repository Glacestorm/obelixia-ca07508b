import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalSeguimientoPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Eye className="h-5 w-5 text-cyan-500" />
          Seguimiento Posterior
        </h2>
        <p className="text-sm text-muted-foreground">Control de implementación de recomendaciones y verificación de ahorros reales.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes en seguimiento</CardTitle>
          <CardDescription>Verificación de ahorro real vs estimado tras la optimización</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            El seguimiento posterior se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSeguimientoPanel;
