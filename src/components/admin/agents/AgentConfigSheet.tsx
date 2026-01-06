import { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Settings,
  Zap,
  Brain,
  Shield,
  Clock,
  Target,
  Activity,
  Save,
  RotateCcw,
  Sparkles,
  Bell,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AgentConfig {
  isActive: boolean;
  autonomyLevel: number;
  confidenceThreshold: number;
  maxActionsPerHour: number;
  executionMode: 'manual' | 'semi-auto' | 'autonomous';
  notificationsEnabled: boolean;
  escalationEnabled: boolean;
  customPrompt: string;
  capabilities: Record<string, boolean>;
  schedule: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
  thresholds: {
    warningLevel: number;
    criticalLevel: number;
    autoEscalateAfter: number;
  };
}

interface AgentInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  domain?: string;
}

interface AgentConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentInfo | null;
  agentType: 'crm' | 'erp';
}

const DEFAULT_CONFIG: AgentConfig = {
  isActive: true,
  autonomyLevel: 70,
  confidenceThreshold: 80,
  maxActionsPerHour: 50,
  executionMode: 'semi-auto',
  notificationsEnabled: true,
  escalationEnabled: true,
  customPrompt: '',
  capabilities: {},
  schedule: {
    enabled: false,
    startHour: 9,
    endHour: 18,
    daysOfWeek: [1, 2, 3, 4, 5],
  },
  thresholds: {
    warningLevel: 70,
    criticalLevel: 90,
    autoEscalateAfter: 30,
  },
};

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function AgentConfigSheet({
  open,
  onOpenChange,
  agent,
  agentType,
}: AgentConfigSheetProps) {
  const [config, setConfig] = useState<AgentConfig>(() => {
    const defaultCapabilities: Record<string, boolean> = {};
    agent?.capabilities?.forEach((cap) => {
      defaultCapabilities[cap] = true;
    });
    return { ...DEFAULT_CONFIG, capabilities: defaultCapabilities };
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateConfig = useCallback(<K extends keyof AgentConfig>(
    key: K,
    value: AgentConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Simular guardado
      await new Promise((r) => setTimeout(r, 800));
      toast.success(`Configuración de ${agent?.name} guardada correctamente`);
      setHasChanges(false);
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  }, [agent?.name, onOpenChange]);

  const handleReset = useCallback(() => {
    const defaultCapabilities: Record<string, boolean> = {};
    agent?.capabilities?.forEach((cap) => {
      defaultCapabilities[cap] = true;
    });
    setConfig({ ...DEFAULT_CONFIG, capabilities: defaultCapabilities });
    setHasChanges(false);
    toast.info('Configuración restablecida');
  }, [agent?.capabilities]);

  const toggleDayOfWeek = useCallback((day: number) => {
    setConfig((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: prev.schedule.daysOfWeek.includes(day)
          ? prev.schedule.daysOfWeek.filter((d) => d !== day)
          : [...prev.schedule.daysOfWeek, day].sort(),
      },
    }));
    setHasChanges(true);
  }, []);

  const toggleCapability = useCallback((capability: string) => {
    setConfig((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: !prev.capabilities[capability],
      },
    }));
    setHasChanges(true);
  }, []);

  if (!agent) return null;

  const gradientClass =
    agentType === 'crm'
      ? 'from-emerald-500 to-teal-600'
      : 'from-violet-500 to-purple-600';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg bg-gradient-to-br text-white',
                gradientClass
              )}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2">
                Configurar {agent.name}
                {hasChanges && (
                  <Badge variant="secondary" className="text-[10px]">
                    Sin guardar
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {agent.description || `Agente ${agentType.toUpperCase()} especializado`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="general" className="text-xs gap-1">
                <Settings className="h-3 w-3" />
                General
              </TabsTrigger>
              <TabsTrigger value="autonomy" className="text-xs gap-1">
                <Brain className="h-3 w-3" />
                Autonomía
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Horario
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Avanzado
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Estado del Agente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Agente Activo</Label>
                      <p className="text-xs text-muted-foreground">
                        Habilitar o deshabilitar el agente
                      </p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(v) => updateConfig('isActive', v)}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm">Modo de Ejecución</Label>
                    <Select
                      value={config.executionMode}
                      onValueChange={(v: AgentConfig['executionMode']) =>
                        updateConfig('executionMode', v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Manual - Requiere aprobación
                          </div>
                        </SelectItem>
                        <SelectItem value="semi-auto">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-3 w-3" />
                            Semi-automático - Aprueba bajo confianza
                          </div>
                        </SelectItem>
                        <SelectItem value="autonomous">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3" />
                            Autónomo - Ejecuta sin intervención
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Notificaciones Push</Label>
                      <p className="text-xs text-muted-foreground">
                        Recibir alertas del agente
                      </p>
                    </div>
                    <Switch
                      checked={config.notificationsEnabled}
                      onCheckedChange={(v) =>
                        updateConfig('notificationsEnabled', v)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Escalado Automático</Label>
                      <p className="text-xs text-muted-foreground">
                        Escalar problemas críticos
                      </p>
                    </div>
                    <Switch
                      checked={config.escalationEnabled}
                      onCheckedChange={(v) =>
                        updateConfig('escalationEnabled', v)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Capacidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      {agent.capabilities.map((cap) => (
                        <div
                          key={cap}
                          className="flex items-center justify-between py-1"
                        >
                          <Label className="text-sm truncate flex-1">{cap}</Label>
                          <Switch
                            checked={config.capabilities[cap] ?? true}
                            onCheckedChange={() => toggleCapability(cap)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Autonomy Tab */}
            <TabsContent value="autonomy" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Nivel de Autonomía
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm">Autonomía General</Label>
                      <span className="text-sm font-medium">
                        {config.autonomyLevel}%
                      </span>
                    </div>
                    <Slider
                      value={[config.autonomyLevel]}
                      onValueChange={([v]) => updateConfig('autonomyLevel', v)}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      {config.autonomyLevel < 30
                        ? 'Conservador: Requiere mucha supervisión'
                        : config.autonomyLevel < 70
                        ? 'Equilibrado: Decisiones moderadas autónomas'
                        : 'Agresivo: Alta autonomía en decisiones'}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm">Umbral de Confianza</Label>
                      <span className="text-sm font-medium">
                        {config.confidenceThreshold}%
                      </span>
                    </div>
                    <Slider
                      value={[config.confidenceThreshold]}
                      onValueChange={([v]) =>
                        updateConfig('confidenceThreshold', v)
                      }
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Solo ejecutar acciones con confianza superior al umbral
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm">Acciones por Hora</Label>
                    <Input
                      type="number"
                      value={config.maxActionsPerHour}
                      onChange={(e) =>
                        updateConfig('maxActionsPerHour', parseInt(e.target.value) || 0)
                      }
                      min={1}
                      max={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      Límite de acciones autónomas por hora
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Programación Horaria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Habilitar Horario</Label>
                      <p className="text-xs text-muted-foreground">
                        Limitar operación a horarios específicos
                      </p>
                    </div>
                    <Switch
                      checked={config.schedule.enabled}
                      onCheckedChange={(v) =>
                        updateConfig('schedule', { ...config.schedule, enabled: v })
                      }
                    />
                  </div>

                  {config.schedule.enabled && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Hora Inicio</Label>
                          <Select
                            value={String(config.schedule.startHour)}
                            onValueChange={(v) =>
                              updateConfig('schedule', {
                                ...config.schedule,
                                startHour: parseInt(v),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {String(i).padStart(2, '0')}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Hora Fin</Label>
                          <Select
                            value={String(config.schedule.endHour)}
                            onValueChange={(v) =>
                              updateConfig('schedule', {
                                ...config.schedule,
                                endHour: parseInt(v),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {String(i).padStart(2, '0')}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm">Días de la Semana</Label>
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map((day, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={
                                config.schedule.daysOfWeek.includes(index)
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              className="flex-1 text-xs px-1"
                              onClick={() => toggleDayOfWeek(index)}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Umbrales de Alerta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Nivel de Advertencia
                      </Label>
                      <span className="text-sm font-medium">
                        {config.thresholds.warningLevel}%
                      </span>
                    </div>
                    <Slider
                      value={[config.thresholds.warningLevel]}
                      onValueChange={([v]) =>
                        updateConfig('thresholds', {
                          ...config.thresholds,
                          warningLevel: v,
                        })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        Nivel Crítico
                      </Label>
                      <span className="text-sm font-medium">
                        {config.thresholds.criticalLevel}%
                      </span>
                    </div>
                    <Slider
                      value={[config.thresholds.criticalLevel]}
                      onValueChange={([v]) =>
                        updateConfig('thresholds', {
                          ...config.thresholds,
                          criticalLevel: v,
                        })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm">Auto-escalar después de (min)</Label>
                    <Input
                      type="number"
                      value={config.thresholds.autoEscalateAfter}
                      onChange={(e) =>
                        updateConfig('thresholds', {
                          ...config.thresholds,
                          autoEscalateAfter: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                      max={120}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Prompt Personalizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Instrucciones adicionales para el agente..."
                    value={config.customPrompt}
                    onChange={(e) => updateConfig('customPrompt', e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Instrucciones personalizadas que se añadirán al comportamiento
                    base del agente
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AgentConfigSheet;
