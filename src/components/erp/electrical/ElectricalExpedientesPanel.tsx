import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalExpedientesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-yellow-500" />
            Gestión de Expedientes
          </h2>
          <p className="text-sm text-muted-foreground">Alta, edición y seguimiento de expedientes de optimización eléctrica.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Expediente
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes activos</CardTitle>
          <CardDescription>Asociados a la empresa seleccionada</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La lógica de gestión de expedientes se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalExpedientesPanel;
