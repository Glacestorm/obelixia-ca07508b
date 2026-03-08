import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalInformesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Informes" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-rose-500" />
            Informes de Optimización
          </h2>
          <p className="text-sm text-muted-foreground">Generación de informes PDF con análisis completo, recomendaciones y ahorro proyectado.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informes generados</CardTitle>
          <CardDescription>Documentos PDF de optimización entregados o pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>Tipo</span>
              <span>Versión</span>
              <span>Resumen</span>
              <span>Fecha</span>
              <span>PDF</span>
              <span>Acciones</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay informes generados todavía.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalInformesPanel;
