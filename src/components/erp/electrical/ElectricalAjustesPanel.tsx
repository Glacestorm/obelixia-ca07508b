import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalAjustesPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Ajustes" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          Ajustes del Módulo
        </h2>
        <p className="text-sm text-muted-foreground">Configuración general: tarifas base, plantillas de informe, catálogo de comercializadoras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo de tarifas</CardTitle>
            <CardDescription>Gestionar tarifas y precios de comercializadoras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Formulario de gestión de catálogo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plantillas de informe</CardTitle>
            <CardDescription>Configurar cabecera, pie de página y branding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Configuración de plantillas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estados de expediente</CardTitle>
            <CardDescription>Personalizar el flujo de estados del expediente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Configuración de workflow</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parámetros generales</CardTitle>
            <CardDescription>IVA, impuesto eléctrico, alquiler de contador por defecto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Formulario de parámetros</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ElectricalAjustesPanel;
