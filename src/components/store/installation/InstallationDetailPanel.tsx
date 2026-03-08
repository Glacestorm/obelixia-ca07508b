import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Package, Plus, Trash2, RefreshCw, ArrowUpCircle, Shield, Activity,
  CheckCircle2, Clock, AlertTriangle, XCircle, History, Key, Link2, Settings2,
  DollarSign, FileCode, HeartPulse, Brain, Copy, Puzzle
} from 'lucide-react';
import { UsageBillingPanel } from './UsageBillingPanel';
import { ArtifactGeneratorPanel } from './ArtifactGeneratorPanel';
import { SelfHealingPanel } from './SelfHealingPanel';
import { AIUsagePricingPanel } from './AIUsagePricingPanel';
import { DigitalTwinPanel } from './DigitalTwinPanel';
import { MarketplaceExtensionsPanel } from './MarketplaceExtensionsPanel';
import { FederatedMeshPanel } from './FederatedMeshPanel';
import {
  type Installation,
  type InstallationModule,
  type InstallationUpdate,
  ERP_MODULES,
  PLATFORMS,
  checkCompatibility,
  getDependents,
  useInstallationManager,
} from '@/hooks/admin/useInstallationManager';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InstallationDetailPanelProps {
  installation: Installation;
  onClose: () => void;
}

export function InstallationDetailPanel({ installation, onClose }: InstallationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('modules');
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);

  const {
    isLoading,
    installationModules,
    installationUpdates,
    fetchInstallationDetails,
    addModule,
    removeModule,
    checkUpdates,
    applyUpdate,
    updateChannel,
    linkLicense,
  } = useInstallationManager();

  useEffect(() => {
    fetchInstallationDetails(installation.id);
    loadLicenses();
  }, [installation.id]);

  const loadLicenses = async () => {
    const { data } = await supabase.from('licenses').select('id, licensee_email, license_type, status, expires_at').eq('status', 'active').limit(20);
    setAvailableLicenses(data || []);
  };

  const activeModuleKeys = new Set(
    installationModules.filter(m => m.status === 'active' || m.status === 'installing').map(m => m.module_key)
  );

  const availableModules = ERP_MODULES.filter(m => !activeModuleKeys.has(m.key));

  const handleAddModule = async (mod: typeof ERP_MODULES[0]) => {
    const compat = checkCompatibility(installationModules, mod, installation.core_version);
    if (!compat.compatible) {
      toast.error(`Incompatible: ${compat.issues.join(', ')}`);
      return;
    }
    await addModule(installation.id, mod);
    setAddModuleOpen(false);
  };

  const handleRemoveModule = async (moduleKey: string) => {
    const dependents = getDependents(moduleKey);
    const activeDependents = dependents.filter(d => activeModuleKeys.has(d));
    if (activeDependents.length > 0) {
      const names = activeDependents.map(d => ERP_MODULES.find(m => m.key === d)?.name).join(', ');
      toast.error(`No se puede deshabilitar: ${names} depende de este módulo`);
      return;
    }
    if (moduleKey === 'core') {
      toast.error('El módulo Core no se puede deshabilitar');
      return;
    }
    await removeModule(installation.id, moduleKey);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'installing': case 'updating': case 'applying': return <Clock className="h-4 w-4 text-amber-400 animate-pulse" />;
      case 'error': case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'disabled': return <XCircle className="h-4 w-4 text-slate-500" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const healthBadge = (health: string) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-500/20 text-green-400',
      degraded: 'bg-amber-500/20 text-amber-400',
      unhealthy: 'bg-red-500/20 text-red-400',
      unknown: 'bg-slate-500/20 text-slate-400',
    };
    return <Badge className={cn('text-[10px]', colors[health] || colors.unknown)}>{health}</Badge>;
  };

  const platform = PLATFORMS.find(p => p.key === installation.platform);

  return (
    <Card className="bg-slate-900/80 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{platform?.icon || '🖥️'}</span>
            <div>
              <CardTitle className="text-white text-lg">{installation.installation_name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{platform?.name}</span>
                <span>•</span>
                <span>Core v{installation.core_version}</span>
                <span>•</span>
                <Badge variant="outline" className="text-[10px] capitalize">{installation.environment}</Badge>
                <Badge
                  className={cn(
                    'text-[10px]',
                    installation.update_channel === 'stable' && 'bg-green-500/20 text-green-400',
                    installation.update_channel === 'beta' && 'bg-amber-500/20 text-amber-400',
                    installation.update_channel === 'canary' && 'bg-red-500/20 text-red-400',
                  )}
                >
                  {installation.update_channel}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-10 mb-4">
            <TabsTrigger value="modules" className="text-xs gap-1"><Package className="h-3 w-3" /> Módulos</TabsTrigger>
            <TabsTrigger value="extensions" className="text-xs gap-1"><Puzzle className="h-3 w-3" /> Extensions</TabsTrigger>
            <TabsTrigger value="health" className="text-xs gap-1"><HeartPulse className="h-3 w-3" /> Salud</TabsTrigger>
            <TabsTrigger value="twin" className="text-xs gap-1"><Copy className="h-3 w-3" /> Twin</TabsTrigger>
            <TabsTrigger value="updates" className="text-xs gap-1"><ArrowUpCircle className="h-3 w-3" /> Versiones</TabsTrigger>
            <TabsTrigger value="license" className="text-xs gap-1"><Key className="h-3 w-3" /> Licencia</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Consumo</TabsTrigger>
            <TabsTrigger value="ai-pricing" className="text-xs gap-1"><Brain className="h-3 w-3" /> IA</TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs gap-1"><FileCode className="h-3 w-3" /> Artefactos</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1"><Settings2 className="h-3 w-3" /> Config</TabsTrigger>
          </TabsList>

          {/* === MODULES TAB === */}
          <TabsContent value="modules">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">
                Módulos Instalados ({installationModules.filter(m => m.status !== 'disabled').length})
              </h3>
              <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-3 w-3" /> Añadir Módulo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Añadir Módulo a {installation.installation_name}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {availableModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Todos los módulos están instalados</p>
                      ) : (
                        availableModules.map(mod => {
                          const compat = checkCompatibility(installationModules, mod, installation.core_version);
                          return (
                            <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{mod.icon}</span>
                                <div>
                                  <div className="font-medium text-sm text-white">{mod.name}</div>
                                  <div className="text-xs text-slate-400">{mod.description}</div>
                                  {!compat.compatible && (
                                    <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {compat.issues[0]}
                                    </div>
                                  )}
                                  {mod.dependencies.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {mod.dependencies.map(dep => (
                                        <Badge key={dep} variant="outline" className={cn(
                                          'text-[10px]',
                                          activeModuleKeys.has(dep) ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'
                                        )}>
                                          {activeModuleKeys.has(dep) ? '✓' : '!'} {dep}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={compat.compatible ? 'default' : 'outline'}
                                disabled={!compat.compatible || isLoading}
                                onClick={() => handleAddModule(mod)}
                              >
                                {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {installationModules.map(mod => {
                  const def = ERP_MODULES.find(m => m.key === mod.module_key);
                  const hasUpdate = def && def.latestVersion !== mod.module_version;
                  return (
                    <div key={mod.id} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      mod.status === 'disabled' ? "border-slate-800 bg-slate-900/30 opacity-50" : "border-slate-700 bg-slate-800/30"
                    )}>
                      <div className="flex items-center gap-3">
                        {statusIcon(mod.status)}
                        <span className="text-lg">{def?.icon || '📦'}</span>
                        <div>
                          <div className="font-medium text-sm text-white flex items-center gap-2">
                            {mod.module_name}
                            <Badge variant="outline" className="text-[10px]">v{mod.module_version}</Badge>
                            {hasUpdate && (
                              <Badge className="bg-primary/20 text-primary text-[10px]">
                                v{def.latestVersion} disponible
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {healthBadge(mod.health_status)}
                            <span className="text-[10px] text-slate-500 capitalize">{mod.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasUpdate && mod.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            disabled={isLoading}
                            onClick={() => applyUpdate(installation.id, mod.module_key, def!.latestVersion)}
                          >
                            <ArrowUpCircle className="h-3 w-3" /> Actualizar
                          </Button>
                        )}
                        {mod.module_key !== 'core' && mod.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            disabled={isLoading}
                            onClick={() => handleRemoveModule(mod.module_key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === EXTENSIONS MARKETPLACE TAB === */}
          <TabsContent value="extensions">
            <MarketplaceExtensionsPanel installationId={installation.id} />
          </TabsContent>

          {/* === HEALTH / SELF-HEALING TAB === */}
          <TabsContent value="health">
            <SelfHealingPanel installation={installation} />
          </TabsContent>

          {/* === DIGITAL TWIN TAB === */}
          <TabsContent value="twin">
            <DigitalTwinPanel
              installationId={installation.id}
              installationData={{
                installation_name: installation.installation_name,
                core_version: installation.core_version,
                platform: installation.platform,
                environment: installation.environment,
                update_channel: installation.update_channel,
              }}
            />
          </TabsContent>

          {/* === UPDATES/VERSIONS TAB === */}
          <TabsContent value="updates">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de Actualizaciones
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => checkUpdates(installation.id)}
              >
                <RefreshCw className="h-3 w-3" /> Buscar Updates
              </Button>
            </div>

            {/* Version Timeline */}
            <ScrollArea className="h-[350px]">
              {installationUpdates.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin historial de actualizaciones</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-700" />
                  {installationUpdates.map((upd, i) => (
                    <div key={upd.id} className="relative">
                      <div className={cn(
                        "absolute -left-6 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center",
                        upd.status === 'completed' ? "border-green-500 bg-green-500/20" :
                        upd.status === 'failed' ? "border-red-500 bg-red-500/20" :
                        upd.status === 'rolled_back' ? "border-amber-500 bg-amber-500/20" :
                        "border-slate-500 bg-slate-800"
                      )}>
                        {statusIcon(upd.status)}
                      </div>
                      <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/30 ml-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{upd.update_type}</Badge>
                            {upd.module_key && (
                              <span className="text-xs text-slate-400">{upd.module_key}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {upd.completed_at ? new Date(upd.completed_at).toLocaleDateString() : 'En progreso'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="text-xs text-red-400">v{upd.from_version}</code>
                          <span className="text-slate-500">→</span>
                          <code className="text-xs text-green-400">v{upd.to_version}</code>
                          {upd.rollback_version && (
                            <Badge variant="outline" className="text-[10px] text-amber-400">
                              Rollback: v{upd.rollback_version}
                            </Badge>
                          )}
                        </div>
                        {upd.error_message && (
                          <p className="text-xs text-red-400 mt-1">{upd.error_message}</p>
                        )}
                        {upd.changelog && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{upd.changelog}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* === LICENSE TAB === */}
          <TabsContent value="license">
            <div className="space-y-4">
              {installation.license_id ? (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    <h3 className="font-medium text-green-300">Licencia Activa</h3>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p>ID: <code className="text-xs bg-slate-800 px-1 rounded">{installation.license_id}</code></p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1 text-red-400"
                    onClick={() => linkLicense(installation.id, '')}
                  >
                    <Link2 className="h-3 w-3" /> Desvincular
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <h3 className="font-medium text-amber-300">Sin Licencia Vinculada</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Vincula una licencia para activar validación, entitlements y facturación por uso.
                  </p>

                  {availableLicenses.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Licencias Disponibles</Label>
                      <div className="space-y-1">
                        {availableLicenses.map(lic => (
                          <div key={lic.id} className="flex items-center justify-between p-2 rounded border border-slate-700 bg-slate-800/50">
                            <div>
                              <span className="text-xs text-white">{lic.licensee_email}</span>
                              <Badge variant="outline" className="ml-2 text-[10px] capitalize">{lic.license_type}</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={() => linkLicense(installation.id, lic.id)}
                            >
                              <Link2 className="h-3 w-3" /> Vincular
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No hay licencias activas disponibles. Genera una desde el panel de licencias.</p>
                  )}
                </div>
              )}

              {/* Module Entitlements */}
              <div className="p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Entitlements por Módulo
                </h3>
                <div className="space-y-1">
                  {installationModules.filter(m => m.status === 'active').map(mod => {
                    const def = ERP_MODULES.find(m => m.key === mod.module_key);
                    return (
                      <div key={mod.id} className="flex items-center justify-between p-2 rounded bg-slate-800/30">
                        <div className="flex items-center gap-2">
                          <span>{def?.icon}</span>
                          <span className="text-xs text-white">{mod.module_name}</span>
                        </div>
                        <Badge className={cn(
                          'text-[10px]',
                          installation.license_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                        )}>
                          {installation.license_id ? 'Licenciado' : 'Sin licencia'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === BILLING TAB === */}
          <TabsContent value="billing">
            <UsageBillingPanel installation={installation} />
          </TabsContent>

          {/* === AI PRICING TAB === */}
          <TabsContent value="ai-pricing">
            <AIUsagePricingPanel installation={installation} />
          </TabsContent>

          {/* === ARTIFACTS TAB === */}
          <TabsContent value="artifacts">
            <ArtifactGeneratorPanel
              installation={installation}
              modules={installationModules.filter(m => m.status === 'active').map(m => ({
                module_key: m.module_key,
                module_name: m.module_name,
              }))}
            />
          </TabsContent>

          {/* === SETTINGS TAB === */}
          <TabsContent value="settings">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-300">Canal de Actualización</Label>
                  <Select
                    value={installation.update_channel}
                    onValueChange={(ch) => updateChannel(installation.id, ch)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">🟢 Stable — Producción</SelectItem>
                      <SelectItem value="beta">🟡 Beta — Pre-release</SelectItem>
                      <SelectItem value="canary">🔴 Canary — Experimental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-300">Entorno</Label>
                  <div className="p-2 rounded bg-slate-800 border border-slate-600">
                    <span className="text-sm text-white capitalize">{installation.environment}</span>
                  </div>
                </div>
              </div>

              {/* Installation Key */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Installation Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-slate-800 border border-slate-600 text-xs text-slate-400 overflow-x-auto">
                    {installation.installation_key}
                  </code>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase">Plataforma</span>
                  <p className="text-white mt-0.5">{platform?.name} ({installation.platform})</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase">Despliegue</span>
                  <p className="text-white mt-0.5 capitalize">{installation.deployment_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase">Último Heartbeat</span>
                  <p className="text-white mt-0.5">
                    {installation.last_heartbeat_at
                      ? new Date(installation.last_heartbeat_at).toLocaleString()
                      : 'Nunca'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase">Instalado</span>
                  <p className="text-white mt-0.5">
                    {installation.installed_at
                      ? new Date(installation.installed_at).toLocaleString()
                      : new Date(installation.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
