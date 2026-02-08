/**
 * GALIA Dashboard - Convocatorias Tab
 * Lista de convocatorias con estado y presupuesto
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Calendar, Euro, FileText, Plus, ExternalLink } from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import type { GaliaConvocatoria } from '@/hooks/galia/useGaliaConvocatorias';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaConvocatoriasTabProps {
  convocatorias: GaliaConvocatoria[];
  formatCurrency: (value: number) => string;
}

export function GaliaConvocatoriasTab({ 
  convocatorias, 
  formatCurrency 
}: GaliaConvocatoriasTabProps) {
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<GaliaConvocatoria | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  const handleVerDetalle = (conv: GaliaConvocatoria) => {
    setSelectedConvocatoria(conv);
    setShowDetalleModal(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Convocatorias</span>
            <Badge variant="outline" className="text-xs">
              {convocatorias.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {convocatorias.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay convocatorias disponibles</p>
                </div>
              ) : (
                convocatorias.map((conv) => (
                  <div 
                    key={conv.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleVerDetalle(conv)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conv.nombre}</span>
                          <GaliaStatusBadge estado={conv.estado} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conv.codigo} · {format(new Date(conv.fecha_inicio), 'dd/MM/yyyy', { locale: es })} - {format(new Date(conv.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(conv.presupuesto_total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(conv.presupuesto_total - conv.presupuesto_comprometido)} disponible
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(conv.presupuesto_comprometido / conv.presupuesto_total) * 100} 
                        className="h-1.5" 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal Detalle Convocatoria */}
      <Dialog open={showDetalleModal} onOpenChange={setShowDetalleModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalle de Convocatoria
            </DialogTitle>
            <DialogDescription>
              Información completa de la convocatoria seleccionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedConvocatoria && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedConvocatoria.nombre}</h3>
                  <p className="text-sm text-muted-foreground">Código: {selectedConvocatoria.codigo}</p>
                </div>
                <GaliaStatusBadge estado={selectedConvocatoria.estado} />
              </div>

              {selectedConvocatoria.descripcion && (
                <p className="text-sm text-muted-foreground">
                  {selectedConvocatoria.descripcion}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Euro className="h-3 w-3" />
                    Presupuesto Total
                  </div>
                  <p className="font-semibold">{formatCurrency(selectedConvocatoria.presupuesto_total)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Euro className="h-3 w-3" />
                    Comprometido
                  </div>
                  <p className="font-semibold">{formatCurrency(selectedConvocatoria.presupuesto_comprometido)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    Fecha Inicio
                  </div>
                  <p className="font-semibold">{format(new Date(selectedConvocatoria.fecha_inicio), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    Fecha Fin
                  </div>
                  <p className="font-semibold">{format(new Date(selectedConvocatoria.fecha_fin), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Ejecución Presupuestaria</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(selectedConvocatoria.presupuesto_comprometido / selectedConvocatoria.presupuesto_total) * 100} 
                    className="flex-1" 
                  />
                  <span className="text-sm font-medium">
                    {((selectedConvocatoria.presupuesto_comprometido / selectedConvocatoria.presupuesto_total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">% Ayuda Máxima</p>
                  <p className="text-lg font-bold text-primary">{selectedConvocatoria.porcentaje_ayuda_max}%</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Disponible</p>
                  <p className="text-lg font-bold text-accent">
                    {formatCurrency(selectedConvocatoria.presupuesto_total - selectedConvocatoria.presupuesto_comprometido)}
                  </p>
                </div>
              </div>

              {selectedConvocatoria.bases_url && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={selectedConvocatoria.bases_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver Bases de la Convocatoria
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GaliaConvocatoriasTab;
