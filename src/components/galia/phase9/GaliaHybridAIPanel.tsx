/**
 * GaliaHybridAIPanel - Panel de IA Híbrida para GALIA
 * Fase 9 del Plan Estratégico GALIA 2.0
 * 
 * Enrutamiento inteligente local/cloud con automatización extrema
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, 
  Cloud, 
  Zap, 
  Shield, 
  Activity,
  RefreshCw,
  Settings,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { useGaliaHybridAI, AutomationTask, DataSensitivity } from '@/hooks/galia/useGaliaHybridAI';
import { cn } from '@/lib/utils';

export function GaliaHybridAIPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testTask, setTestTask] = useState<AutomationTask | null>(null);

  const {
    isLoading,
    error,
    config,
    lastResponse,
    routingStats,
    executeTask,
    analyzeDocument,
    assessRisk,
    updateConfig,
    clearCache,
    determineRoute
  } = useGaliaHybridAI();

  // Demo task para testing
  const runDemoTask = useCallback(async (type: AutomationTask['type']) => {
    const task: AutomationTask = {
      id: `demo-${Date.now()}`,
      type,
      input: type === 'document_analysis' 
        ? { content: 'Memoria técnica del proyecto de modernización...', type: 'memoria_tecnica' }
        : type === 'risk_assessment'
        ? { expedienteId: 'EXP-2024-001', solicitante: 'PYME', inversion: 85000 }
        : { data: 'test' },
      sensitivity: 'internal' as DataSensitivity,
      complexity: 'moderate',
      priority: 'medium'
    };

    setTestTask(task);
    await executeTask(task);
  }, [executeTask]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'local': return <Cpu className="h-4 w-4" />;
      case 'cloud': return <Cloud className="h-4 w-4" />;
      case 'hybrid': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'local': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cloud': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'hybrid': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary via-purple-500 to-blue-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                IA Híbrida GALIA
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Fase 9
                </Badge>
              </CardTitle>
              <CardDescription>
                Enrutamiento inteligente local/cloud
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearCache}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="dashboard" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tareas" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Tareas
            </TabsTrigger>
            <TabsTrigger value="routing" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Routing
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="mt-0">
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <Cpu className="h-5 w-5 mx-auto text-green-400 mb-1" />
                  <div className="text-xl font-bold">{routingStats.localRequests}</div>
                  <div className="text-xs text-muted-foreground">Local</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <Cloud className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                  <div className="text-xl font-bold">{routingStats.cloudRequests}</div>
                  <div className="text-xs text-muted-foreground">Cloud</div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
                  <div className="text-xl font-bold">{routingStats.fallbackCount}</div>
                  <div className="text-xs text-muted-foreground">Fallbacks</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <div className="text-xl font-bold">{routingStats.avgLatency.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">ms avg</div>
                </div>
              </div>

              {/* Last Response */}
              {lastResponse && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Última Respuesta</span>
                    <Badge className={getProviderColor(lastResponse.provider)}>
                      {getProviderIcon(lastResponse.provider)}
                      <span className="ml-1 capitalize">{lastResponse.provider}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>
                      <div className="font-mono">{lastResponse.model}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Latencia:</span>
                      <div>{lastResponse.latencyMs}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tokens:</span>
                      <div>{lastResponse.tokens.input + lastResponse.tokens.output}</div>
                    </div>
                  </div>
                  {lastResponse.privacyFlags && lastResponse.privacyFlags.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {lastResponse.privacyFlags.map((flag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Provider Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-sm">Proveedor Local</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    No disponible en Cloud
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requiere Ollama local
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-sm">Proveedor Cloud</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gemini 2.5 Flash/Pro
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAREAS */}
          <TabsContent value="tareas" className="mt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ejecuta tareas automatizadas con enrutamiento inteligente
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => runDemoTask('document_analysis')}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-left">
                    <FileText className="h-4 w-4 mb-1" />
                    <div className="text-xs font-medium">Análisis Documento</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => runDemoTask('risk_assessment')}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-left">
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    <div className="text-xs font-medium">Evaluación Riesgos</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => runDemoTask('compliance_check')}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-left">
                    <Shield className="h-4 w-4 mb-1" />
                    <div className="text-xs font-medium">Verificar Cumplimiento</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => runDemoTask('decision_support')}
                  disabled={isLoading}
                  className="h-auto py-3"
                >
                  <div className="text-left">
                    <Zap className="h-4 w-4 mb-1" />
                    <div className="text-xs font-medium">Soporte Decisión</div>
                  </div>
                </Button>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Procesando...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ROUTING */}
          <TabsContent value="routing" className="mt-0">
            <ScrollArea className="h-[350px]">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Algoritmo de Routing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className="bg-red-500/20 text-red-400 text-xs">Restringido</Badge>
                      <span>→ Local obligatorio (GDPR)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs">Confidencial</Badge>
                      <span>→ Local preferido con fallback</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Interno</Badge>
                      <span>→ Según configuración</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-green-500/20 text-green-400 text-xs">Público</Badge>
                      <span>→ Cloud para máxima eficiencia</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Complejidad de Tarea</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Simple</span>
                      <span className="text-muted-foreground">→ Flash (rápido)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Moderada</span>
                      <span className="text-muted-foreground">→ Flash (balanceado)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compleja</span>
                      <span className="text-muted-foreground">→ Pro (potente)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avanzada</span>
                      <span className="text-muted-foreground">→ Pro (máximo)</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CONFIG */}
          <TabsContent value="config" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Preferir procesamiento local</Label>
                  <p className="text-xs text-muted-foreground">
                    Usa Ollama cuando esté disponible
                  </p>
                </div>
                <Switch
                  checked={config.preferLocal}
                  onCheckedChange={(checked) => updateConfig({ preferLocal: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Fallback automático a cloud</Label>
                  <p className="text-xs text-muted-foreground">
                    Si local falla, usar cloud
                  </p>
                </div>
                <Switch
                  checked={config.fallbackToCloud}
                  onCheckedChange={(checked) => updateConfig({ fallbackToCloud: checked })}
                />
              </div>

              <Separator />

              <div className="p-3 border rounded-lg">
                <Label className="mb-2 block">Modelos Cloud Disponibles</Label>
                <div className="flex flex-wrap gap-1">
                  {config.cloudModels.map((model, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {model.replace('google/', '')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={clearCache}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpiar Caché
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaHybridAIPanel;
