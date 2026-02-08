/**
 * GALIA Dashboard - Convocatorias Tab
 * Lista de convocatorias con estado y presupuesto
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import type { GaliaConvocatoria } from '@/hooks/galia/useGaliaConvocatorias';

interface GaliaConvocatoriasTabProps {
  convocatorias: GaliaConvocatoria[];
  formatCurrency: (value: number) => string;
}

export function GaliaConvocatoriasTab({ 
  convocatorias, 
  formatCurrency 
}: GaliaConvocatoriasTabProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Convocatorias</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {convocatorias.map((conv) => (
              <div 
                key={conv.id}
                className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{conv.nombre}</span>
                      <GaliaStatusBadge estado={conv.estado} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conv.codigo} · {new Date(conv.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(conv.fecha_fin).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatCurrency(conv.presupuesto_total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(conv.presupuesto_total - conv.presupuesto_comprometido)} disponible
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GaliaConvocatoriasTab;
