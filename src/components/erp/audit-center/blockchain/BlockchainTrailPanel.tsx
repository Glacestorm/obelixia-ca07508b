/**
 * BlockchainTrailPanel — Verificación de integridad blockchain
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, Shield, AlertCircle, RefreshCw } from 'lucide-react';

export function BlockchainTrailPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Blockchain Audit Trail</h3>
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 bg-amber-500/10">Datos de ejemplo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Trazabilidad inmutable verificada por AUDIT-AGT-008 · No-repudiación garantizada
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled title="Próximamente">
          <RefreshCw className="h-4 w-4" /> Verificar integridad (próximamente)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-muted bg-muted/5">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold text-muted-foreground">N/A</p>
            <p className="text-xs text-muted-foreground">Sin verificaciones reales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Link2 className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Entradas blockchain</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Manipulaciones detectadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Registro de Verificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              El agente AUDIT-AGT-008 ancla automáticamente eventos críticos en blockchain
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Umbral de confianza: 0.95 · Acción autónoma de bloqueo ante discrepancias
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
