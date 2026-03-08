/**
 * HRPremiumSettingsPanel — P9.10
 * Centralized configuration panel for all 8 Premium HR modules.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings, Save, RotateCcw, Shield, Brain, Users, Scale,
  Layers, FileText, BarChart3, UserCog, CheckCircle, Inbox
} from 'lucide-react';
import { useHRPremiumSettings, type PremiumModuleKey } from '@/hooks/admin/hr/useHRPremiumSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  companyId?: string;
  className?: string;
}

const MODULE_ICONS: Record<PremiumModuleKey, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  ai_governance: <Brain className="h-4 w-4" />,
  workforce: <Users className="h-4 w-4" />,
  fairness: <Scale className="h-4 w-4" />,
  twin: <Layers className="h-4 w-4" />,
  legal: <FileText className="h-4 w-4" />,
  cnae: <BarChart3 className="h-4 w-4" />,
  role_experience: <UserCog className="h-4 w-4" />,
};

const MODULE_ORDER: PremiumModuleKey[] = [
  'security', 'ai_governance', 'workforce', 'fairness',
  'twin', 'legal', 'cnae', 'role_experience',
];

export function HRPremiumSettingsPanel({ companyId, className }: Props) {
  const {
    settings, isDirty, enabledCount, totalModules, moduleMeta,
    updateModuleSetting, updateGlobalSetting, toggleModule, saveSettings, resetToDefaults,
  } = useHRPremiumSettings(companyId);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para configurar módulos Premium</p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    saveSettings();
    toast.success('Configuración guardada correctamente');
  };

  const handleReset = () => {
    resetToDefaults();
    toast.info('Configuración restaurada a valores por defecto');
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuración Premium HR
          </h2>
          <p className="text-sm text-muted-foreground">
            {enabledCount}/{totalModules} módulos activos
            {isDirty && <Badge variant="outline" className="ml-2 text-[10px]">Sin guardar</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuración Global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-refresh global</Label>
              <p className="text-xs text-muted-foreground">Actualizar datos de todos los módulos automáticamente</p>
            </div>
            <Switch
              checked={settings.globalAutoRefresh}
              onCheckedChange={(v) => updateGlobalSetting('globalAutoRefresh', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificaciones</Label>
              <p className="text-xs text-muted-foreground">Mostrar alertas del motor de alertas premium</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(v) => updateGlobalSetting('notificationsEnabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Layout del dashboard</Label>
              <p className="text-xs text-muted-foreground">Modo de visualización del dashboard ejecutivo</p>
            </div>
            <Select
              value={settings.dashboardLayout}
              onValueChange={(v) => updateGlobalSetting('dashboardLayout', v as 'compact' | 'expanded')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="expanded">Expandido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Per-Module Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Módulos Premium</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {MODULE_ORDER.map((key, idx) => {
                const mod = settings.modules[key];
                const meta = moduleMeta[key];
                return (
                  <div key={key}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg mt-0.5",
                        mod.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {MODULE_ICONS[key]}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{meta.label}</span>
                            {mod.enabled && (
                              <CheckCircle className="h-3 w-3 text-emerald-500 inline ml-1.5" />
                            )}
                          </div>
                          <Switch
                            checked={mod.enabled}
                            onCheckedChange={() => toggleModule(key)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>

                        {mod.enabled && (
                          <div className="flex gap-4 pt-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Umbral alertas</Label>
                              <Select
                                value={mod.alertThreshold}
                                onValueChange={(v) => updateModuleSetting(key, 'alertThreshold', v as any)}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Bajo</SelectItem>
                                  <SelectItem value="medium">Medio</SelectItem>
                                  <SelectItem value="high">Alto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Refresh (s)</Label>
                              <Select
                                value={String(mod.autoRefreshSeconds)}
                                onValueChange={(v) => updateModuleSetting(key, 'autoRefreshSeconds', Number(v))}
                              >
                                <SelectTrigger className="h-7 w-20 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="60">60</SelectItem>
                                  <SelectItem value="120">120</SelectItem>
                                  <SelectItem value="300">300</SelectItem>
                                  <SelectItem value="600">600</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRPremiumSettingsPanel;
