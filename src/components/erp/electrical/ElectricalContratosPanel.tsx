import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSignature } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalContratosPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-indigo-500" />
          Contratos de Suministro
        </h2>
        <p className="text-sm text-muted-foreground">Gestión de contratos eléctricos asociados a suministros y expedientes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos activos</CardTitle>
          <CardDescription>Condiciones contractuales, comercializadoras y fechas de vencimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La gestión de contratos se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalContratosPanel;
