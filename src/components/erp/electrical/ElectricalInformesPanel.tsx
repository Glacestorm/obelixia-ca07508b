import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalInformesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-indigo-500" />
            Informes Finales
          </h2>
          <p className="text-sm text-muted-foreground">Generación de informes de optimización eléctrica para el cliente.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informes generados</CardTitle>
          <CardDescription>Informes PDF con análisis completo y recomendaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La generación de informes se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalInformesPanel;
