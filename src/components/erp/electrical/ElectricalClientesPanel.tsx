import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalClientesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Clientes Energéticos
          </h2>
          <p className="text-sm text-muted-foreground">Gestión de clientes particulares y empresas para consultoría eléctrica.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directorio de clientes</CardTitle>
          <CardDescription>Particulares y empresas vinculados a expedientes de optimización</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La gestión de clientes energéticos se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalClientesPanel;
