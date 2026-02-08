/**
 * GaliaEarlyWarningPanel - Panel de Alertas Tempranas
 * Fase 7: Excelencia Operacional
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Radar,
  Activity,
  Shield
} from 'lucide-react';
import { useGaliaEarlyWarning, EarlyWarning, WarningThreshold } from '@/hooks/galia/useGaliaEarlyWarning';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaEarlyWarningPanelProps {
  expedienteId?: string;
  className?: string;
}

export function GaliaEarlyWarningPanel({
  expedienteId,
  className
}: GaliaEarlyWarningPanelProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const {
    isLoading,
    warnings,
    stats,
    getActiveWarnings,
    runDetectionScan,
    acknowledgeWarning,
    resolveWarning,
    markAsFalsePositive,
    getStats,
    subscribeToWarnings,
    unsubscribeFromWarnings
  } = useGaliaEarlyWarning();

  useEffect(() => {
    getActiveWarnings({ expedienteId, unacknowledgedOnly: !showAcknowledged });
    getStats();
    subscribeToWarnings();
    
    return () => unsubscribeFromWarnings();
  }, [getActiveWarnings, getStats, subscribeToWarnings, unsubscribeFromWarnings, expedienteId, showAcknowledged]);

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'budget_overrun': return '💰';
      case 'deadline_risk': return '⏰';
      case 'documentation_gap': return '📄';
      case 'inactivity': return '😴';
      case 'compliance_drift': return '⚖️';
      case 'fraud_indicator': return '🚨';
      default: return '⚠️';
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  const criticalCount = warnings.filter(w => w.severity === 'critical' && !w.acknowledged).length;
  const activeCount = warnings.filter(w => !w.acknowledged).length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 relative">
              <Bell className="h-5 w-5 text-white" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {criticalCount}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Alertas Tempranas</CardTitle>
              <CardDescription>Sistema de detección ML</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runDetectionScan({ expedienteIds: expedienteId ? [expedienteId] : undefined })}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Radar className="h-4 w-4 mr-2" />
            )}
            Escanear
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.activeWarnings}</p>
              <p className="text-xs text-muted-foreground">Activas</p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.criticalWarnings}</p>
              <p className="text-xs text-red-600/80">Críticas</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolvedThisWeek}</p>
              <p className="text-xs text-green-600/80">Resueltas</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{Math.round(stats.averageResolutionTime)}h</p>
              <p className="text-xs text-muted-foreground">Tiempo medio</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="active" className="text-xs">
                Activas ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                Configuración
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Switch
                id="show-acknowledged"
                checked={showAcknowledged}
                onCheckedChange={setShowAcknowledged}
              />
              <Label htmlFor="show-acknowledged" className="text-xs">
                Mostrar confirmadas
              </Label>
            </div>
          </div>

          <TabsContent value="active" className="mt-0">
            <ScrollArea className="h-[350px]">
              {warnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                  <p className="font-medium">Todo bajo control</p>
                  <p className="text-xs mt-1">No hay alertas activas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((warning) => (
                    <WarningCard
                      key={warning.id}
                      warning={warning}
                      getWarningIcon={getWarningIcon}
                      getSeverityStyle={getSeverityStyle}
                      onAcknowledge={() => acknowledgeWarning(warning.id)}
                      onResolve={() => resolveWarning(warning.id, 'Resuelto manualmente')}
                      onMarkFalsePositive={() => markAsFalsePositive(warning.id, 'Falso positivo')}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Umbrales de Detección
                </h4>
                <div className="space-y-3">
                  <ThresholdSetting
                    label="Desviación presupuestaria"
                    value="15%"
                    description="Alerta cuando el gasto supera el presupuesto en este porcentaje"
                  />
                  <ThresholdSetting
                    label="Días sin actividad"
                    value="14 días"
                    description="Alerta cuando un expediente está inactivo"
                  />
                  <ThresholdSetting
                    label="Plazo próximo"
                    value="7 días"
                    description="Alerta antes del vencimiento de plazos"
                  />
                </div>
              </div>
              
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificaciones
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alertas críticas por email</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resumen diario</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Push en tiempo real</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Warning Card Component
function WarningCard({
  warning,
  getWarningIcon,
  getSeverityStyle,
  onAcknowledge,
  onResolve,
  onMarkFalsePositive
}: {
  warning: EarlyWarning;
  getWarningIcon: (type: string) => string;
  getSeverityStyle: (severity: string) => string;
  onAcknowledge: () => void;
  onResolve: () => void;
  onMarkFalsePositive: () => void;
}) {
  return (
    <div className={cn("p-3 rounded-lg", getSeverityStyle(warning.severity))}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{getWarningIcon(warning.warningType)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{warning.title}</span>
            {warning.acknowledged && (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {warning.description}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Confianza: {Math.round(warning.confidence * 100)}%</span>
            {warning.timeToImpact && (
              <span>· Impacto en: {warning.timeToImpact}</span>
            )}
            <span>· {formatDistanceToNow(new Date(warning.detectedAt), { addSuffix: true, locale: es })}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {!warning.acknowledged && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAcknowledge} title="Confirmar">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResolve} title="Resolver">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMarkFalsePositive} title="Falso positivo">
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Threshold Setting Component
function ThresholdSetting({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}

export default GaliaEarlyWarningPanel;
