/**
 * ERPRollbackPanel - Panel de Rollback y Recuperación
 * Rollback selectivo por entidad, fecha o completo con dry-run
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  Database,
  FileText,
  Users,
  Building2,
  PlayCircle,
  PauseCircle,
  Shield,
  Eye,
  Undo2,
  History,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface ERPRollbackPanelProps {
  sessionId?: string;
  migrationId?: string;
}

interface RollbackCheckpoint {
  id: string;
  timestamp: string;
  type: 'auto' | 'manual';
  entity_type: string;
  records_count: number;
  status: 'available' | 'expired' | 'used';
  description: string;
}

interface RollbackPreview {
  entities_affected: number;
  records_to_restore: number;
  records_to_delete: number;
  estimated_time_seconds: number;
  warnings: string[];
  can_proceed: boolean;
}

const ENTITY_OPTIONS = [
  { value: 'all', label: 'Todos los datos', icon: Database },
  { value: 'journal_entries', label: 'Asientos contables', icon: FileText },
  { value: 'chart_of_accounts', label: 'Plan de cuentas', icon: Building2 },
  { value: 'customers', label: 'Clientes', icon: Users },
  { value: 'suppliers', label: 'Proveedores', icon: Users },
  { value: 'fixed_assets', label: 'Activos fijos', icon: Building2 },
];

export function ERPRollbackPanel({ sessionId, migrationId }: ERPRollbackPanelProps) {
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDryRun, setIsDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState(0);
  const [preview, setPreview] = useState<RollbackPreview | null>(null);
  
  // Mock checkpoints - en producción vendrían del backend
  const [checkpoints] = useState<RollbackCheckpoint[]>([
    {
      id: 'cp-001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'auto',
      entity_type: 'journal_entries',
      records_count: 1250,
      status: 'available',
      description: 'Checkpoint automático - Asientos importados'
    },
    {
      id: 'cp-002',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'manual',
      entity_type: 'chart_of_accounts',
      records_count: 450,
      status: 'available',
      description: 'Backup manual antes de mapeo'
    },
    {
      id: 'cp-003',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: 'auto',
      entity_type: 'all',
      records_count: 3500,
      status: 'available',
      description: 'Estado inicial pre-migración'
    }
  ]);

  const handlePreviewRollback = useCallback(async () => {
    setIsLoading(true);
    
    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setPreview({
      entities_affected: selectedEntity === 'all' ? 5 : 1,
      records_to_restore: 1250,
      records_to_delete: 1250,
      estimated_time_seconds: 45,
      warnings: selectedEntity === 'all' 
        ? ['Se revertirán TODOS los datos migrados', 'Los asientos posteriores pueden verse afectados']
        : [],
      can_proceed: true
    });
    
    setIsLoading(false);
    toast.success('Preview de rollback generado');
  }, [selectedEntity]);

  const handleExecuteRollback = useCallback(async () => {
    if (!preview?.can_proceed) {
      toast.error('No se puede proceder con el rollback');
      return;
    }

    if (isDryRun) {
      toast.info('Modo Dry-Run: No se aplicarán cambios reales');
      return;
    }

    setIsRollingBack(true);
    setRollbackProgress(0);

    // Simular progreso
    const interval = setInterval(() => {
      setRollbackProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRollingBack(false);
          toast.success('Rollback completado exitosamente');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  }, [preview, isDryRun]);

  const getStatusBadge = (status: RollbackCheckpoint['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-500">Disponible</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      case 'used':
        return <Badge variant="outline">Utilizado</Badge>;
    }
  };

  if (!sessionId && !migrationId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una sesión de migración para gestionar rollbacks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <RotateCcw className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Rollback y Recuperación</CardTitle>
                <CardDescription>
                  Revertir migraciones de forma segura con puntos de control
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="dry-run"
                checked={isDryRun}
                onCheckedChange={setIsDryRun}
              />
              <Label htmlFor="dry-run" className="text-sm">
                Modo Dry-Run (simulación)
              </Label>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="selective" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selective">Rollback Selectivo</TabsTrigger>
          <TabsTrigger value="checkpoints">Puntos de Control</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Rollback Selectivo */}
        <TabsContent value="selective" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Configuración de Rollback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Entidad a revertir</Label>
                  <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona entidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rango de fechas (opcional)</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {dateRange.from 
                            ? format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                            : 'Desde'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {dateRange.to 
                            ? format(dateRange.to, 'dd/MM/yyyy', { locale: es })
                            : 'Hasta'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button 
                  onClick={handlePreviewRollback} 
                  disabled={isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview de Rollback
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista Previa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Entidades afectadas</p>
                        <p className="text-xl font-bold">{preview.entities_affected}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Registros a restaurar</p>
                        <p className="text-xl font-bold">{preview.records_to_restore.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Registros a eliminar</p>
                        <p className="text-xl font-bold text-destructive">{preview.records_to_delete.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Tiempo estimado</p>
                        <p className="text-xl font-bold">{preview.estimated_time_seconds}s</p>
                      </div>
                    </div>

                    {preview.warnings.length > 0 && (
                      <div className="space-y-2">
                        {preview.warnings.map((warning, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}

                    {isRollingBack && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progreso del rollback</span>
                          <span>{rollbackProgress}%</span>
                        </div>
                        <Progress value={rollbackProgress} />
                      </div>
                    )}

                    <Button 
                      onClick={handleExecuteRollback}
                      disabled={!preview.can_proceed || isRollingBack}
                      className="w-full"
                      variant={isDryRun ? "secondary" : "destructive"}
                    >
                      {isRollingBack ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Ejecutando rollback...
                        </>
                      ) : isDryRun ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Simular Rollback (Dry-Run)
                        </>
                      ) : (
                        <>
                          <Undo2 className="h-4 w-4 mr-2" />
                          Ejecutar Rollback
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Configura y genera un preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Puntos de Control */}
        <TabsContent value="checkpoints">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Puntos de Control Disponibles
              </CardTitle>
              <CardDescription>
                Restaura a un estado anterior desde cualquier checkpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        cp.status === 'available' 
                          ? "hover:bg-muted/50 cursor-pointer" 
                          : "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{cp.description}</span>
                            {getStatusBadge(cp.status)}
                            <Badge variant="outline" className="text-xs">
                              {cp.type === 'auto' ? 'Automático' : 'Manual'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(cp.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {cp.records_count.toLocaleString()} registros
                            </span>
                          </div>
                        </div>
                        {cp.status === 'available' && (
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de Rollbacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se han ejecutado rollbacks en esta migración</p>
                <p className="text-sm mt-2">Los rollbacks ejecutados aparecerán aquí</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPRollbackPanel;
