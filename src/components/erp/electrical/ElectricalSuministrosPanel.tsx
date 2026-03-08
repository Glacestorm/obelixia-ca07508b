import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalSuministrosPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Suministros & CUPS
        </h2>
        <p className="text-sm text-muted-foreground">Gestión de puntos de suministro y códigos CUPS asociados a expedientes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Puntos de suministro</CardTitle>
          <CardDescription>Listado de CUPS vinculados a expedientes activos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La gestión de suministros y CUPS se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSuministrosPanel;
