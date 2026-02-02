/**
 * ERPAdvancedToolsPanel - Herramientas Avanzadas de Migración
 * Conversión masiva, fusión, reasignación y herramientas especializadas
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Wrench,
  RefreshCcw,
  Combine,
  SplitSquareHorizontal,
  Calculator,
  Calendar,
  FileText,
  Users,
  Building2,
  ArrowRightLeft,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Settings,
  Database,
  FileSpreadsheet,
  Zap,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ERPAdvancedToolsPanelProps {
  sessionId?: string;
  companyId?: string;
}

interface ToolExecution {
  id: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  affectedRecords: number;
  startedAt?: Date;
  completedAt?: Date;
}

const ADVANCED_TOOLS = [
  {
    id: 'account_conversion',
    name: 'Conversión Masiva de Cuentas',
    description: 'Cambiar códigos de cuenta según reglas definidas',
    icon: ArrowRightLeft,
    category: 'conversion'
  },
  {
    id: 'merge_duplicates',
    name: 'Fusión de Terceros Duplicados',
    description: 'Unificar clientes/proveedores con datos similares',
    icon: Combine,
    category: 'cleanup'
  },
  {
    id: 'reassign_fiscal_year',
    name: 'Reasignación de Ejercicios',
    description: 'Mover asientos entre ejercicios fiscales',
    icon: Calendar,
    category: 'fiscal'
  },
  {
    id: 'recalculate_balances',
    name: 'Recálculo de Saldos',
    description: 'Recalcular saldos de cuentas y subcuentas',
    icon: Calculator,
    category: 'accounting'
  },
  {
    id: 'generate_opening',
    name: 'Generar Asiento de Apertura',
    description: 'Crear asiento de apertura desde saldos',
    icon: FileText,
    category: 'accounting'
  },
  {
    id: 'split_account',
    name: 'Desagregar Cuenta',
    description: 'Dividir una cuenta en múltiples subcuentas',
    icon: SplitSquareHorizontal,
    category: 'conversion'
  },
  {
    id: 'normalize_data',
    name: 'Normalización de Datos',
    description: 'Estandarizar formatos de fechas, importes y textos',
    icon: Settings,
    category: 'cleanup'
  },
  {
    id: 'validate_integrity',
    name: 'Validación de Integridad',
    description: 'Verificar consistencia referencial de todos los datos',
    icon: Database,
    category: 'validation'
  }
];

export function ERPAdvancedToolsPanel({ sessionId, companyId }: ERPAdvancedToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [toolConfig, setToolConfig] = useState<Record<string, unknown>>({});

  const handleExecuteTool = useCallback(async () => {
    if (!selectedTool) return;

    setIsExecuting(true);
    const executionId = Date.now().toString();
    
    const newExecution: ToolExecution = {
      id: executionId,
      tool: selectedTool,
      status: 'running',
      progress: 0,
      affectedRecords: 0,
      startedAt: new Date()
    };
    
    setExecutions(prev => [newExecution, ...prev]);

    // Simular progreso
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setExecutions(prev => prev.map(e => 
          e.id === executionId 
            ? { ...e, status: 'completed', progress: 100, affectedRecords: Math.floor(Math.random() * 500) + 100, completedAt: new Date() }
            : e
        ));
        setIsExecuting(false);
        toast.success('Herramienta ejecutada correctamente');
      } else {
        setExecutions(prev => prev.map(e => 
          e.id === executionId ? { ...e, progress } : e
        ));
      }
    }, 500);
  }, [selectedTool]);

  const getToolById = (id: string) => ADVANCED_TOOLS.find(t => t.id === id);

  const renderToolConfig = () => {
    switch (selectedTool) {
      case 'account_conversion':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patrón de búsqueda</Label>
              <Input placeholder="Ej: 43000* (todas las subcuentas de 43000)" />
            </div>
            <div className="space-y-2">
              <Label>Reemplazar por</Label>
              <Input placeholder="Ej: 43100* (nuevo código)" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="preview" />
              <Label htmlFor="preview">Solo previsualizar (no aplicar cambios)</Label>
            </div>
          </div>
        );

      case 'merge_duplicates':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de entidad</Label>
              <Select defaultValue="customers">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Clientes</SelectItem>
                  <SelectItem value="suppliers">Proveedores</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Criterio de detección</Label>
              <Select defaultValue="nif">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nif">NIF/CIF similar</SelectItem>
                  <SelectItem value="name">Nombre similar</SelectItem>
                  <SelectItem value="email">Email duplicado</SelectItem>
                  <SelectItem value="combined">Combinado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Umbral de similitud (%)</Label>
              <Input type="number" defaultValue={85} min={50} max={100} />
            </div>
          </div>
        );

      case 'reassign_fiscal_year':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ejercicio origen</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ejercicio destino</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rango de fechas (opcional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" />
                <Input type="date" />
              </div>
            </div>
          </div>
        );

      case 'generate_opening':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ejercicio para apertura</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ejercicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha del asiento</Label>
              <Input type="date" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="include-regularization" defaultChecked />
              <Label htmlFor="include-regularization">Incluir cuentas de regularización</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="close-previous" />
              <Label htmlFor="close-previous">Cerrar ejercicio anterior automáticamente</Label>
            </div>
          </div>
        );

      case 'recalculate_balances':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ámbito del recálculo</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  <SelectItem value="group">Por grupo de cuentas</SelectItem>
                  <SelectItem value="range">Rango específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ejercicio</Label>
              <Select defaultValue="current">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Ejercicio actual</SelectItem>
                  <SelectItem value="all">Todos los ejercicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecciona una herramienta para configurar</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Wrench className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Herramientas Avanzadas</CardTitle>
              <CardDescription>
                Operaciones especializadas para migración y mantenimiento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Lista de herramientas */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Herramientas Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {ADVANCED_TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedTool === tool.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedTool === tool.id ? "bg-primary/20" : "bg-muted"
                      )}>
                        <tool.icon className={cn(
                          "h-4 w-4",
                          selectedTool === tool.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tool.name}</p>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Configuración y ejecución */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {selectedTool ? getToolById(selectedTool)?.name : 'Configuración'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="config" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">Configuración</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-4">
                {renderToolConfig()}
                
                {selectedTool && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      onClick={handleExecuteTool} 
                      disabled={isExecuting}
                      className="flex-1"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Ejecutando...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Ejecutar Herramienta
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedTool(null)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                <ScrollArea className="h-[300px]">
                  {executions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay ejecuciones recientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {executions.map((exec) => {
                        const tool = getToolById(exec.tool);
                        return (
                          <div key={exec.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {tool && <tool.icon className="h-4 w-4 text-muted-foreground" />}
                                <span className="font-medium text-sm">{tool?.name}</span>
                              </div>
                              <Badge variant={
                                exec.status === 'completed' ? 'default' :
                                exec.status === 'running' ? 'secondary' :
                                exec.status === 'failed' ? 'destructive' : 'outline'
                              }>
                                {exec.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {exec.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {exec.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {exec.status}
                              </Badge>
                            </div>
                            {exec.status === 'running' && (
                              <Progress value={exec.progress} className="h-2 mb-2" />
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {exec.startedAt?.toLocaleTimeString('es-ES')}
                                {exec.completedAt && ` - ${exec.completedAt.toLocaleTimeString('es-ES')}`}
                              </span>
                              {exec.affectedRecords > 0 && (
                                <span>{exec.affectedRecords} registros procesados</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ERPAdvancedToolsPanel;
