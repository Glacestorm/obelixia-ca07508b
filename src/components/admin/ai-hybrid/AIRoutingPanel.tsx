/**
 * AI Routing Panel
 * Gestión del enrutador inteligente de IA Híbrida
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Route,
  Server,
  Cloud,
  Zap,
  Shield,
  DollarSign,
  Settings,
  ArrowRight,
  CheckCircle,
  Cpu,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useHybridAI, RoutingMode } from '@/hooks/admin/ai-hybrid';
import { useAIProviders } from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';

interface AIRoutingPanelProps {
  className?: string;
}

const ROUTING_MODE_INFO: Record<RoutingMode, { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  color: string;
}> = {
  local_only: {
    icon: <Lock className="h-5 w-5" />,
    label: 'Solo Local',
    description: 'Nunca envía datos a proveedores externos',
    color: 'from-amber-500 to-orange-600',
  },
  external_only: {
    icon: <Cloud className="h-5 w-5" />,
    label: 'Solo Externo',
    description: 'Usa solo proveedores cloud',
    color: 'from-blue-500 to-cyan-600',
  },
  hybrid_auto: {
    icon: <Sparkles className="h-5 w-5" />,
    label: 'Híbrido Automático',
    description: 'El sistema elige el mejor proveedor según contexto',
    color: 'from-violet-500 to-purple-600',
  },
  hybrid_manual: {
    icon: <Settings className="h-5 w-5" />,
    label: 'Híbrido Manual',
    description: 'Control manual sobre el enrutamiento',
    color: 'from-slate-500 to-slate-600',
  },
};

export function AIRoutingPanel({ className }: AIRoutingPanelProps) {
  const { routingMode, setRoutingMode } = useHybridAI();
  const { providers, getProvidersByType } = useAIProviders();

  const [settings, setSettings] = useState({
    enableFallback: true,
    maxLatencyMs: 5000,
    costThreshold: 0.1,
  });

  const localProviders = getProvidersByType('local');
  const externalProviders = getProvidersByType('external');
  const configuredLocalProviders = localProviders.filter(p => p.is_active);
  const configuredExternalProviders = externalProviders.filter(p => p.is_active);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Enrutador Inteligente
          </h3>
          <p className="text-sm text-muted-foreground">
            Configura cómo se enrutan las solicitudes entre IA local y nube
          </p>
        </div>
      </div>

      {/* Current Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modo de Enrutamiento</CardTitle>
          <CardDescription>
            Selecciona la estrategia principal para distribuir solicitudes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ROUTING_MODE_INFO) as RoutingMode[]).map((mode) => {
              const info = ROUTING_MODE_INFO[mode];
              const isSelected = routingMode === mode;

              return (
                <motion.button
                  key={mode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRoutingMode(mode)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2.5 rounded-lg text-white bg-gradient-to-br',
                      info.color
                    )}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{info.label}</p>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Provider Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              Proveedores Locales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {configuredLocalProviders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Server className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay proveedores locales configurados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {configuredLocalProviders.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              Proveedores Cloud
            </CardTitle>
          </CardHeader>
          <CardContent>
            {configuredExternalProviders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Cloud className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay proveedores cloud configurados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {configuredExternalProviders.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración Avanzada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Habilitar Fallback</Label>
              <p className="text-xs text-muted-foreground">
                Si falla el proveedor principal, usar alternativo
              </p>
            </div>
            <Switch
              checked={settings.enableFallback}
              onCheckedChange={(v) => setSettings(prev => ({ ...prev, enableFallback: v }))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Latencia Máxima</Label>
              <span className="text-sm text-muted-foreground">{settings.maxLatencyMs}ms</span>
            </div>
            <Slider
              value={[settings.maxLatencyMs]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, maxLatencyMs: v }))}
              min={1000}
              max={30000}
              step={500}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Umbral de Costo por Request</Label>
              <span className="text-sm text-muted-foreground">${settings.costThreshold}</span>
            </div>
            <Slider
              value={[settings.costThreshold * 100]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, costThreshold: v / 100 }))}
              min={1}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Si el costo estimado supera este umbral, buscar alternativa más económica
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Routing Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4" />
            Flujo de Enrutamiento
          </CardTitle>
          <CardDescription>
            Visualización del proceso de decisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-primary/10">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Request</span>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Shield className="h-6 w-6 text-violet-600" />
              </div>
              <span className="text-xs font-medium">Clasificación</span>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Route className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-xs font-medium">Router</span>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed">
              <div className="flex gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Server className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Cloud className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <span className="text-xs font-medium">Proveedor IA</span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-2">Modo Actual</h4>
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-lg text-white bg-gradient-to-br',
                ROUTING_MODE_INFO[routingMode].color
              )}>
                {ROUTING_MODE_INFO[routingMode].icon}
              </div>
              <div>
                <p className="text-sm font-medium">{ROUTING_MODE_INFO[routingMode].label}</p>
                <p className="text-xs text-muted-foreground">
                  {ROUTING_MODE_INFO[routingMode].description}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIRoutingPanel;
