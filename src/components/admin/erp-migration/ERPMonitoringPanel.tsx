/**
 * ERPMonitoringPanel - Panel de monitoreo en tiempo real
 * Progreso, logs y métricas de migración
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Terminal,
  BarChart3
} from 'lucide-react';
import { useERPMigration } from '@/hooks/admin/integrations/useERPMigration';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ERPMonitoringPanelProps {
  sessionId?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

export function ERPMonitoringPanel({ sessionId }: ERPMonitoringPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('progress');

  const {
    activeSession,
    isRunning,
    progress,
    runMigration,
    pauseMigration,
    rollbackMigration
  } = useERPMigration();

  // Simulate logs for demo
  useEffect(() => {
    if (!sessionId) return;
    
    // Demo logs
    setLogs([
      { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Sesión de migración cargada' },
      { id: '2', timestamp: new Date().toISOString(), level: 'success', message: 'Conexión establecida' },
    ]);
  }, [sessionId]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una sesión de migración para monitorear
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Monitoreo de Migración
              </CardTitle>
              <CardDescription>
                Control y seguimiento en tiempo real
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button variant="outline" onClick={() => pauseMigration(sessionId)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              ) : (
                <Button onClick={() => runMigration(sessionId)}>
                  <Play className="h-4 w-4 mr-2" />
                  {activeSession?.status === 'paused' ? 'Reanudar' : 'Ejecutar'}
                </Button>
              )}
              <Button 
                variant="destructive" 
                onClick={() => rollbackMigration(sessionId)}
                disabled={!activeSession?.rollback_available}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Rollback
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress and Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completado</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {activeSession && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{activeSession.total_records.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Migrados</p>
                  <p className="font-medium text-green-600">{activeSession.migrated_records.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fallidos</p>
                  <p className="font-medium text-red-600">{activeSession.failed_records}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Omitidos</p>
                  <p className="font-medium text-yellow-600">{activeSession.skipped_records}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tiempos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iniciado</span>
                <span className="font-medium">
                  {activeSession?.started_at 
                    ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true, locale: es })
                    : '-'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={isRunning ? 'default' : 'secondary'}>
                  {isRunning ? 'En ejecución' : activeSession?.status || 'Detenido'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Velocidad</span>
                <span className="font-medium">~150 reg/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiempo estimado</span>
                <span className="font-medium">~5 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs and Charts */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-2">
            <TabsList>
              <TabsTrigger value="progress">
                <BarChart3 className="h-4 w-4 mr-2" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Terminal className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="progress" className="mt-0">
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-50" />
                <span className="ml-4">Gráficas disponibles durante la ejecución</span>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 p-2 rounded text-sm font-mono"
                    >
                      {getLogIcon(log.level)}
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={cn(
                        log.level === 'error' && 'text-destructive',
                        log.level === 'warning' && 'text-yellow-600',
                        log.level === 'success' && 'text-green-600'
                      )}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default ERPMonitoringPanel;
