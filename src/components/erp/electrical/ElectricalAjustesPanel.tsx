import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalAjustesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          Ajustes del Módulo
        </h2>
        <p className="text-sm text-muted-foreground">Configuración general del módulo de Consultoría Eléctrica.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parámetros</CardTitle>
          <CardDescription>Tarifas base, márgenes, plantillas de informe y preferencias</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Los ajustes del módulo se implementarán en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalAjustesPanel;
