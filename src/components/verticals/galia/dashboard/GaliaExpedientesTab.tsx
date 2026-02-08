/**
 * GALIA Dashboard - Expedientes Tab
 * Lista de expedientes con búsqueda, panel de detalle e insights IA
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertTriangle, Brain } from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import { GaliaExpedienteDetailPanel } from './GaliaExpedienteDetailPanel';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';

// Lazy load AI panel
const GaliaAIInsightsPanel = lazy(() => import('./GaliaAIInsightsPanel'));

const AIPanelSkeleton = () => (
  <Card>
    <CardContent className="py-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </CardContent>
  </Card>
);

interface GaliaExpedientesTabProps {
  expedientes: GaliaExpediente[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedExpediente: GaliaExpediente | null;
  onSelectExpediente: (exp: GaliaExpediente | null) => void;
  onCambiarEstado: (nuevoEstado: GaliaExpediente['estado']) => Promise<void>;
  workflowEstadoFilter?: string;
  formatCurrency: (value: number) => string;
}

export function GaliaExpedientesTab({
  expedientes,
  searchTerm,
  onSearchChange,
  selectedExpediente,
  onSelectExpediente,
  onCambiarEstado,
  workflowEstadoFilter,
  formatCurrency
}: GaliaExpedientesTabProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);

  const filteredExpedientes = expedientes.filter(e => 
    !searchTerm || 
    e.numero_expediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.solicitud?.titulo_proyecto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Layout dinámico basado en paneles activos
  const getGridCols = () => {
    if (selectedExpediente && showAIPanel) return "grid-cols-1 lg:grid-cols-3";
    if (selectedExpediente || showAIPanel) return "grid-cols-1 lg:grid-cols-2";
    return "grid-cols-1";
  };

  return (
    <div className={cn("grid gap-4", getGridCols())}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Expedientes {workflowEstadoFilter && <Badge variant="secondary" className="ml-2">{workflowEstadoFilter}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-48 lg:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar expediente..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              {selectedExpediente && (
                <Button
                  variant={showAIPanel ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="gap-1"
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">IA</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredExpedientes.slice(0, 20).map((expediente) => (
                <div 
                  key={expediente.id}
                  onClick={() => {
                    onSelectExpediente(
                      selectedExpediente?.id === expediente.id ? null : expediente
                    );
                    if (selectedExpediente?.id === expediente.id) {
                      setShowAIPanel(false);
                    }
                  }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedExpediente?.id === expediente.id 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {expediente.numero_expediente}
                        </span>
                        <GaliaStatusBadge estado={expediente.estado} size="sm" />
                        {expediente.scoring_riesgo && expediente.scoring_riesgo >= 70 && (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {expediente.solicitud?.titulo_proyecto || 'Sin título'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expediente.solicitud?.beneficiario?.nombre} · {expediente.solicitud?.beneficiario?.nif}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {expediente.importe_concedido && (
                        <p className="font-semibold text-green-600">
                          {formatCurrency(expediente.importe_concedido)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(expediente.fecha_apertura), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Panel de detalle */}
      {selectedExpediente && (
        <GaliaExpedienteDetailPanel
          expediente={selectedExpediente}
          onClose={() => {
            onSelectExpediente(null);
            setShowAIPanel(false);
          }}
          onCambiarEstado={onCambiarEstado}
        />
      )}

      {/* Panel de Insights IA */}
      {selectedExpediente && showAIPanel && (
        <Suspense fallback={<AIPanelSkeleton />}>
          <GaliaAIInsightsPanel
            expediente={selectedExpediente}
            onClose={() => setShowAIPanel(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default GaliaExpedientesTab;
