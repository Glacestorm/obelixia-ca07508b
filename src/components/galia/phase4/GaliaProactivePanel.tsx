/**
 * GaliaProactivePanel - Panel de asistente proactivo
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Scale, 
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
  Mail,
  Sparkles
} from 'lucide-react';
import { useGaliaProactiveAssistant, Deadline, Alert, RegulatoryChange } from '@/hooks/galia/useGaliaProactiveAssistant';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaProactivePanelProps {
  className?: string;
  role?: 'ciudadano' | 'tecnico' | 'gestor';
  userId?: string;
  expedienteId?: string;
  autoRefresh?: boolean;
}

export function GaliaProactivePanel({ 
  className, 
  role = 'tecnico',
  userId,
  expedienteId,
  autoRefresh = true 
}: GaliaProactivePanelProps) {
  const [activeTab, setActiveTab] = useState('alerts');

  const {
    isLoading,
    error,
    deadlines,
    missingDocs,
    regulatoryChanges,
    alerts,
    digest,
    checkDeadlines,
    checkMissingDocs,
    checkRegulatoryChanges,
    fetchAlerts,
    generateDigest,
    startAutoRefresh,
    stopAutoRefresh,
  } = useGaliaProactiveAssistant();

  useEffect(() => {
    // Initial data fetch
    fetchAlerts(role, userId, expedienteId);
    checkDeadlines(role, expedienteId);
    
    if (autoRefresh) {
      startAutoRefresh(role, 300000); // 5 min
    }
    
    return () => stopAutoRefresh();
  }, [role, userId, expedienteId, autoRefresh]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchAlerts(role, userId, expedienteId),
      checkDeadlines(role, expedienteId),
      checkMissingDocs(role, expedienteId),
      checkRegulatoryChanges(),
    ]);
  }, [role, userId, expedienteId, fetchAlerts, checkDeadlines, checkMissingDocs, checkRegulatoryChanges]);

  const handleGenerateDigest = useCallback(async () => {
    await generateDigest(role, userId);
  }, [role, userId, generateDigest]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica':
      case 'critico': return 'bg-red-100 text-red-700 border-red-300';
      case 'alta':
      case 'alto': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'media':
      case 'medio': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'plazo': return <Clock className="h-4 w-4" />;
      case 'documento': return <FileText className="h-4 w-4" />;
      case 'normativa': return <Scale className="h-4 w-4" />;
      case 'pre_aprobacion': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Asistente Proactivo
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">Alertas y recordatorios inteligentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts?.contadores && (
              <>
                {alerts.contadores.criticas > 0 && (
                  <Badge className="bg-red-100 text-red-700">{alerts.contadores.criticas} críticas</Badge>
                )}
                <Badge variant="outline">{alerts.contadores.noLeidas} sin leer</Badge>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="alerts" className="text-xs">
              Alertas
              {alerts?.contadores?.noLeidas ? (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                  {alerts.contadores.noLeidas}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="text-xs">Plazos</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">Documentos</TabsTrigger>
            <TabsTrigger value="regulatory" className="text-xs">Normativa</TabsTrigger>
          </TabsList>

          {/* Alertas */}
          <TabsContent value="alerts">
            <ScrollArea className="h-[350px]">
              {alerts?.alertas && alerts.alertas.length > 0 ? (
                <div className="space-y-2">
                  {alerts.alertas.map((alert: Alert) => (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        !alert.leida && "bg-muted/50",
                        getPriorityColor(alert.prioridad)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getAlertIcon(alert.tipo)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.mensaje}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.fechaCreacion), { locale: es, addSuffix: true })}
                            </span>
                            {alert.accion && (
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                <a href={alert.accion.url}>
                                  {alert.accion.label}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay alertas pendientes</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Plazos */}
          <TabsContent value="deadlines">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => checkDeadlines(role, expedienteId)} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                Actualizar
              </Button>
            </div>

            <ScrollArea className="h-[320px]">
              {deadlines?.deadlines && deadlines.deadlines.length > 0 ? (
                <div className="space-y-2">
                  {deadlines.deadlines.map((deadline: Deadline) => (
                    <div 
                      key={deadline.id} 
                      className={cn(
                        "p-3 rounded-lg border",
                        getPriorityColor(deadline.prioridad)
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{deadline.tipo}</span>
                        <Badge variant="outline" className={cn(
                          deadline.diasRestantes <= 3 && "bg-red-100 text-red-700",
                          deadline.diasRestantes > 3 && deadline.diasRestantes <= 7 && "bg-yellow-100 text-yellow-700"
                        )}>
                          {deadline.diasRestantes} días
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{deadline.descripcion}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(deadline.fechaVencimiento).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs mt-2 font-medium">{deadline.accionRequerida}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay plazos próximos</p>
                </div>
              )}
            </ScrollArea>

            {deadlines?.resumen && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
                <span>Total: {deadlines.resumen.totalPlazos} plazos</span>
                {deadlines.resumen.criticos > 0 && (
                  <Badge className="bg-red-100 text-red-700">{deadlines.resumen.criticos} críticos</Badge>
                )}
              </div>
            )}
          </TabsContent>

          {/* Documentos faltantes */}
          <TabsContent value="docs">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => checkMissingDocs(role, expedienteId)} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                Verificar
              </Button>
            </div>

            <ScrollArea className="h-[320px]">
              {missingDocs?.documentosFaltantes && missingDocs.documentosFaltantes.length > 0 ? (
                <div className="space-y-2">
                  {missingDocs.documentosFaltantes.map((doc, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start gap-3">
                        <FileText className={cn(
                          "h-5 w-5 mt-0.5",
                          doc.obligatorio ? "text-red-500" : "text-muted-foreground"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{doc.documento}</span>
                            {doc.obligatorio && <Badge variant="destructive" className="text-[10px]">Obligatorio</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{doc.instrucciones}</p>
                          {doc.fechaLimite && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Límite: {new Date(doc.fechaLimite).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Documentación completa</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Cambios normativos */}
          <TabsContent value="regulatory">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={checkRegulatoryChanges} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                Consultar
              </Button>
            </div>

            <ScrollArea className="h-[320px]">
              {regulatoryChanges?.cambiosNormativos && regulatoryChanges.cambiosNormativos.length > 0 ? (
                <div className="space-y-3">
                  {regulatoryChanges.cambiosNormativos.map((change: RegulatoryChange) => (
                    <div key={change.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-primary" />
                          <Badge variant="outline" className="text-xs">{change.fuente}</Badge>
                        </div>
                        <Badge className={cn(
                          change.impacto === 'alto' && "bg-red-100 text-red-700",
                          change.impacto === 'medio' && "bg-yellow-100 text-yellow-700",
                          change.impacto === 'bajo' && "bg-gray-100 text-gray-700"
                        )}>
                          Impacto {change.impacto}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{change.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">{change.resumen}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(change.fechaPublicacion).toLocaleDateString()}
                        </span>
                        {change.enlace && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                            <a href={change.enlace} target="_blank" rel="noopener noreferrer">
                              Ver documento
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                      {change.expedientesAfectados > 0 && (
                        <div className="mt-2 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {change.expedientesAfectados} expediente(s) afectado(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin cambios normativos recientes</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Digest button */}
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleGenerateDigest} disabled={isLoading} className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Generar Digest Diario
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaProactivePanel;
