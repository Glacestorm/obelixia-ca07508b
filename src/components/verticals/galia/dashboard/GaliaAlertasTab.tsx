/**
 * GALIA Dashboard - Alertas Tab
 * Expedientes de alto riesgo y alertas del sistema
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import type { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';

interface GaliaAlertasTabProps {
  expedientesRiesgo: GaliaExpediente[];
}

export function GaliaAlertasTab({ expedientesRiesgo }: GaliaAlertasTabProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertas y Expedientes de Riesgo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {expedientesRiesgo.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No hay expedientes con riesgo elevado</p>
              </div>
            ) : (
              expedientesRiesgo.map((exp) => (
                <div 
                  key={exp.id}
                  className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{exp.numero_expediente}</p>
                      <p className="text-sm text-muted-foreground">
                        {exp.solicitud?.titulo_proyecto}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          Riesgo: {exp.scoring_riesgo}%
                        </Badge>
                        <GaliaStatusBadge estado={exp.estado} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default GaliaAlertasTab;
