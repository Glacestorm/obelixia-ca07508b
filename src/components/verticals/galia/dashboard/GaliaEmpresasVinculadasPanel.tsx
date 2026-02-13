/**
 * GALIA - Panel de Empresas Vinculadas
 * Detección de conflictos de interés y grupos empresariales
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Network, AlertTriangle, Info, ExternalLink } from 'lucide-react';

export function GaliaEmpresasVinculadasPanel() {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Posible Vinculación Detectada</AlertTitle>
        <AlertDescription>
          El administrador solidario coincide con el de la empresa "Construcciones Norte SL" (Beneficiario LEADER 2024).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4" />
              Grafo de Relaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center border border-dashed">
              <p className="text-xs text-muted-foreground">Visualización del grafo de relaciones mercantiles</p>
              {/* Aquí iría el componente de grafo real con D3 o React Flow */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Datos del Registro Mercantil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Administrador:</span>
              <span className="font-medium">Juan Pérez García</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cargos activos:</span>
              <span className="font-medium">3 empresas</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Grupo consolidado:</span>
              <Badge variant="outline" className="text-[10px]">No declarado</Badge>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Ver informe mercantil completo <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GaliaEmpresasVinculadasPanel;
