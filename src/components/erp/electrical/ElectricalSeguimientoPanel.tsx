import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';

interface Props { companyId: string; }

export function ElectricalSeguimientoPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Seguimiento" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Eye className="h-5 w-5 text-cyan-500" />
          Seguimiento Posterior
        </h2>
        <p className="text-sm text-muted-foreground">Control de implementación de recomendaciones y verificación de ahorros reales vs estimados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">8</p>
            <p className="text-xs text-muted-foreground">expedientes activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ahorro verificado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">€9.240</p>
            <p className="text-xs text-muted-foreground">acumulado este trimestre</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Precisión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">92%</p>
            <p className="text-xs text-muted-foreground">ahorro real vs estimado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes en seguimiento</CardTitle>
          <CardDescription>Verificación de ahorro real tras la implementación de cambios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>Cliente</span>
              <span>Ahorro estimado</span>
              <span>Ahorro real</span>
              <span>Precisión</span>
              <span>Estado</span>
            </div>
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay expedientes en fase de seguimiento.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSeguimientoPanel;
