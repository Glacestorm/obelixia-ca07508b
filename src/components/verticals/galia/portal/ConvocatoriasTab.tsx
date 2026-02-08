/**
 * GALIA Portal - Pestaña de Convocatorias
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, FileText, Calendar, Euro, CheckCircle, 
  Building2, ExternalLink, RefreshCw 
} from 'lucide-react';
import { GaliaConvocatoria } from '@/hooks/galia/useGaliaConvocatorias';
import { formatCurrency } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConvocatoriasTabProps {
  convocatorias: GaliaConvocatoria[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRefresh: () => void;
}

export function ConvocatoriasTab({
  convocatorias,
  isLoading,
  searchTerm,
  onSearchChange,
  onRefresh,
}: ConvocatoriasTabProps) {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'abierta':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Abierta</Badge>;
      case 'publicada':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Próximamente</Badge>;
      case 'cerrada':
      case 'resuelta':
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30">Cerrada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const filteredConvocatorias = convocatorias.filter(c => 
    !searchTerm || 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, código o tipo de proyecto..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4">
          {filteredConvocatorias.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay convocatorias disponibles con esos criterios</p>
              </CardContent>
            </Card>
          ) : (
            filteredConvocatorias.map((conv) => (
              <Card key={conv.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{conv.nombre}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building2 className="h-4 w-4" />
                            Código: {conv.codigo}
                          </div>
                        </div>
                        {getEstadoBadge(conv.estado)}
                      </div>

                      {conv.descripcion && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {conv.descripcion}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Hasta {format(new Date(conv.fecha_fin), 'dd/MM/yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(conv.presupuesto_total - conv.presupuesto_comprometido)} disponibles</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{conv.porcentaje_ayuda_max}% intensidad máx.</span>
                        </div>
                        <div>
                          <Button size="sm" className="gap-2">
                            Ver detalles
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Ejecución presupuestaria</span>
                          <span>{((conv.presupuesto_comprometido / conv.presupuesto_total) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={(conv.presupuesto_comprometido / conv.presupuesto_total) * 100} 
                          className="h-1.5" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ConvocatoriasTab;
