/**
 * GALIA Dashboard - Sidebar Panel
 * Actividad reciente y acciones rápidas cuando el asistente no está visible
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, FileText, FileCheck, Users, Settings } from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import type { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';

interface GaliaSidebarPanelProps {
  expedientes: GaliaExpediente[];
}

export function GaliaSidebarPanel({ expedientes }: GaliaSidebarPanelProps) {
  return (
    <div className="space-y-4">
      {/* Actividad Reciente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {expedientes.slice(0, 5).map((exp) => (
                <div key={exp.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {exp.numero_expediente}
                  </span>
                  <GaliaStatusBadge estado={exp.estado} size="sm" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => {
              const event = new CustomEvent('galia-tab-change', { detail: 'expedientes' });
              window.dispatchEvent(event);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Revisar solicitudes pendientes
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => {
              const event = new CustomEvent('galia-tab-change', { detail: 'costes' });
              window.dispatchEvent(event);
            }}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Validar justificaciones
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => {
              const event = new CustomEvent('galia-tab-change', { detail: 'beneficiario360' });
              window.dispatchEvent(event);
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Ver beneficiarios
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => {
              const event = new CustomEvent('galia-tab-change', { detail: 'gestion' });
              window.dispatchEvent(event);
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuración GAL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default GaliaSidebarPanel;
