import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Server, Monitor, Copy, Check, ChevronRight, ChevronLeft,
  Shield, RefreshCw, Activity, Package, Cloud, Container, Cpu,
  HardDrive, Boxes, AlertTriangle, CheckCircle2, Clock, Sparkles, Eye
} from 'lucide-react';
import StoreNavbar from '@/components/store/StoreNavbar';
import UnifiedFooter from '@/components/layout/UnifiedFooter';
import {
  useInstallationManager,
  ERP_MODULES,
  PLATFORMS,
  type PlatformType,
  type ERPModuleDefinition,
} from '@/hooks/admin/useInstallationManager';
import { InstallationDetailPanel } from './InstallationDetailPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type WizardStep = 'platform' | 'modules' | 'config' | 'generate' | 'status';

export function InstallationWizardPage() {
  const [step, setStep] = useState<WizardStep>('platform');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(['core']));
  const [deploymentType, setDeploymentType] = useState('on_premise');
  const [environment, setEnvironment] = useState('production');
  const [installationName, setInstallationName] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('wizard');
  const [viewingInstallation, setViewingInstallation] = useState<any | null>(null);

  const {
    isLoading,
    installations,
    generatedScript,
    fetchInstallations,
    registerInstance,
    generateScript,
    setGeneratedScript,
  } = useInstallationManager();

  useEffect(() => {
    fetchInstallations();
  }, [fetchInstallations]);

  // Module dependency resolution
  const toggleModule = useCallback((moduleKey: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (moduleKey === 'core') return next; // Core is always selected

      if (next.has(moduleKey)) {
        next.delete(moduleKey);
        // Remove modules that depend on this one
        ERP_MODULES.forEach(m => {
          if (m.dependencies.includes(moduleKey)) {
            next.delete(m.key);
          }
        });
      } else {
        next.add(moduleKey);
        // Auto-add dependencies
        const mod = ERP_MODULES.find(m => m.key === moduleKey);
        mod?.dependencies.forEach(dep => next.add(dep));
      }
      return next;
    });
  }, []);

  const handleGenerateScript = useCallback(async () => {
    if (!selectedPlatform) return;
    const modules = ERP_MODULES.filter(m => selectedModules.has(m.key));
    await generateScript({
      platform: selectedPlatform,
      deployment_type: deploymentType,
      modules: modules.map(m => ({ key: m.key, name: m.name })),
    });
  }, [selectedPlatform, selectedModules, deploymentType, generateScript]);

  const handleRegister = useCallback(async () => {
    if (!selectedPlatform || !installationName) {
      toast.error('Completa todos los campos');
      return;
    }
    const modules = ERP_MODULES.filter(m => selectedModules.has(m.key));
    await registerInstance({
      installation_name: installationName,
      platform: selectedPlatform,
      deployment_type: deploymentType,
      environment,
      modules: modules.map(m => ({
        key: m.key,
        name: m.name,
        version: m.version,
        dependencies: m.dependencies,
      })),
    });
    setStep('generate');
  }, [selectedPlatform, installationName, selectedModules, deploymentType, environment, registerInstance]);

  const handleCopy = useCallback(() => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript);
      setCopied(true);
      toast.success('Script copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedScript]);

  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'platform', label: 'Plataforma', icon: <Monitor className="h-4 w-4" /> },
    { key: 'modules', label: 'Módulos', icon: <Package className="h-4 w-4" /> },
    { key: 'config', label: 'Configuración', icon: <Server className="h-4 w-4" /> },
    { key: 'generate', label: 'Instalación', icon: <Download className="h-4 w-4" /> },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);

  const platformCategories = [
    { key: 'containers', label: 'Contenedores', icon: <Container className="h-4 w-4" /> },
    { key: 'native', label: 'Nativo', icon: <Cpu className="h-4 w-4" /> },
    { key: 'virtualization', label: 'Virtualización', icon: <HardDrive className="h-4 w-4" /> },
    { key: 'cloud', label: 'Cloud', icon: <Cloud className="h-4 w-4" /> },
  ];

  const moduleCategories = [
    { key: 'core', label: 'Core' },
    { key: 'finance', label: 'Finanzas' },
    { key: 'operations', label: 'Operaciones' },
    { key: 'commercial', label: 'Comercial' },
    { key: 'governance', label: 'Gobierno' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <StoreNavbar />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Fase 1 — Instalación Enterprise
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">
            Centro de Instalación
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Configura y despliega tu ERP en cualquier plataforma. Selecciona módulos individuales y genera scripts de instalación personalizados.
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="wizard" className="gap-2">
              <Download className="h-4 w-4" />
              Nueva Instalación
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <Activity className="h-4 w-4" />
              Mis Instalaciones ({installations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <button
                    onClick={() => i <= stepIndex && setStep(s.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                      step === s.key
                        ? "bg-primary text-primary-foreground"
                        : i < stepIndex
                          ? "bg-primary/20 text-primary cursor-pointer"
                          : "bg-slate-800 text-slate-500"
                    )}
                  >
                    {s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  )}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: Platform Selection */}
              {step === 'platform' && (
                <motion.div
                  key="platform"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="max-w-4xl mx-auto"
                >
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-primary" />
                        Selecciona tu Plataforma
                      </CardTitle>
                      <CardDescription>¿Dónde desplegarás tu ERP?</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {platformCategories.map(cat => {
                          const platforms = PLATFORMS.filter(p => p.category === cat.key);
                          return (
                            <div key={cat.key}>
                              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                {cat.icon} {cat.label}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {platforms.map(p => (
                                  <button
                                    key={p.key}
                                    onClick={() => setSelectedPlatform(p.key)}
                                    className={cn(
                                      "p-4 rounded-lg border text-left transition-all hover:scale-[1.02]",
                                      selectedPlatform === p.key
                                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                                    )}
                                  >
                                    <div className="text-2xl mb-2">{p.icon}</div>
                                    <div className="font-medium text-white text-sm">{p.name}</div>
                                    <div className="text-xs text-slate-400 mt-1">{p.description}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end mt-6">
                        <Button
                          onClick={() => setStep('modules')}
                          disabled={!selectedPlatform}
                          className="gap-2"
                        >
                          Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 2: Module Selection */}
              {step === 'modules' && (
                <motion.div
                  key="modules"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="max-w-4xl mx-auto"
                >
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Selecciona los Módulos
                      </CardTitle>
                      <CardDescription>
                        Instala solo lo que necesitas. Podrás añadir más módulos después.
                        <span className="ml-2 text-primary">{selectedModules.size} seleccionados</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {moduleCategories.map(cat => {
                          const mods = ERP_MODULES.filter(m => m.category === cat.key);
                          if (!mods.length) return null;
                          return (
                            <div key={cat.key}>
                              <h3 className="text-sm font-medium text-slate-400 mb-3">{cat.label}</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mods.map(mod => {
                                  const isSelected = selectedModules.has(mod.key);
                                  const isCore = mod.key === 'core';
                                  const missingDeps = mod.dependencies.filter(d => !selectedModules.has(d));

                                  return (
                                    <button
                                      key={mod.key}
                                      onClick={() => toggleModule(mod.key)}
                                      disabled={isCore}
                                      className={cn(
                                        "p-4 rounded-lg border text-left transition-all",
                                        isCore
                                          ? "border-primary/50 bg-primary/10 opacity-80"
                                          : isSelected
                                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                                      )}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xl">{mod.icon}</span>
                                          <div>
                                            <div className="font-medium text-white text-sm flex items-center gap-2">
                                              {mod.name}
                                              <Badge variant="outline" className="text-[10px] py-0">
                                                v{mod.version}
                                              </Badge>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">{mod.description}</div>
                                          </div>
                                        </div>
                                        <Checkbox
                                          checked={isSelected}
                                          disabled={isCore}
                                          className="mt-1"
                                        />
                                      </div>
                                      {mod.dependencies.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {mod.dependencies.map(dep => (
                                            <Badge
                                              key={dep}
                                              variant="outline"
                                              className={cn(
                                                "text-[10px]",
                                                selectedModules.has(dep) ? "text-green-400 border-green-400/30" : "text-amber-400 border-amber-400/30"
                                              )}
                                            >
                                              {selectedModules.has(dep) ? '✓' : '!'} {dep}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setStep('platform')} className="gap-2">
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button onClick={() => setStep('config')} className="gap-2">
                          Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 3: Configuration */}
              {step === 'config' && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="max-w-2xl mx-auto"
                >
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Server className="h-5 w-5 text-primary" />
                        Configuración
                      </CardTitle>
                      <CardDescription>Configura los detalles de tu instalación</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Nombre de la Instalación *</Label>
                        <Input
                          value={installationName}
                          onChange={(e) => setInstallationName(e.target.value)}
                          placeholder="Ej: Producción Madrid, Staging Barcelona..."
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Tipo de Despliegue</Label>
                          <Select value={deploymentType} onValueChange={setDeploymentType}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="on_premise">On-Premise</SelectItem>
                              <SelectItem value="hybrid">Híbrido</SelectItem>
                              <SelectItem value="saas">SaaS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300">Entorno</Label>
                          <Select value={environment} onValueChange={setEnvironment}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">Producción</SelectItem>
                              <SelectItem value="staging">Staging</SelectItem>
                              <SelectItem value="development">Desarrollo</SelectItem>
                              <SelectItem value="testing">Testing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator className="bg-slate-700" />

                      {/* Summary */}
                      <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-medium text-slate-300">Resumen</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-400">Plataforma:</div>
                          <div className="text-white">{PLATFORMS.find(p => p.key === selectedPlatform)?.name}</div>
                          <div className="text-slate-400">Módulos:</div>
                          <div className="text-white">{selectedModules.size}</div>
                          <div className="text-slate-400">Entorno:</div>
                          <div className="text-white capitalize">{environment}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from(selectedModules).map(key => {
                            const mod = ERP_MODULES.find(m => m.key === key);
                            return mod ? (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {mod.icon} {mod.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setStep('modules')} className="gap-2">
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button onClick={handleRegister} disabled={isLoading || !installationName} className="gap-2">
                          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          Generar Instalación
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 4: Generated Script */}
              {step === 'generate' && (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="max-w-4xl mx-auto"
                >
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Script de Instalación Generado
                      </CardTitle>
                      <CardDescription>
                        Copia y ejecuta este script en tu servidor destino
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="absolute top-2 right-2 z-10 gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'Copiado' : 'Copiar'}
                        </Button>
                        <ScrollArea className="h-[500px]">
                          <pre className="bg-slate-950 rounded-lg p-4 text-sm text-green-400 font-mono whitespace-pre overflow-x-auto">
                            {generatedScript || 'Generando script...'}
                          </pre>
                        </ScrollArea>
                      </div>

                      <div className="flex items-center gap-3 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-300">
                          Asegúrate de cambiar las contraseñas por defecto antes de ejecutar en producción. Este script requiere permisos de administrador.
                        </p>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => {
                          setStep('platform');
                          setGeneratedScript(null);
                        }} className="gap-2">
                          <RefreshCw className="h-4 w-4" /> Nueva Instalación
                        </Button>
                        <Button onClick={() => setActiveTab('status')} className="gap-2">
                          <Activity className="h-4 w-4" /> Ver Mis Instalaciones
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Installations Status Tab */}
          <TabsContent value="status">
            <div className="max-w-5xl mx-auto">
              {viewingInstallation ? (
                <InstallationDetailPanel
                  installation={viewingInstallation}
                  onClose={() => { setViewingInstallation(null); fetchInstallations(); }}
                />
              ) : (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Mis Instalaciones
                        </CardTitle>
                        <CardDescription>Gestiona módulos, versiones, licencias y configuración</CardDescription>
                      </div>
                      <Button onClick={fetchInstallations} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {installations.length === 0 ? (
                      <div className="text-center py-12">
                        <Boxes className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 mb-4">No tienes instalaciones registradas</p>
                        <Button onClick={() => { setActiveTab('wizard'); setStep('platform'); }}>
                          Crear Primera Instalación
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {installations.map((inst) => {
                          const platform = PLATFORMS.find(p => p.key === inst.platform);
                          return (
                            <button
                              key={inst.id}
                              onClick={() => setViewingInstallation(inst)}
                              className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600 transition-colors text-left"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-2xl">{platform?.icon || '🖥️'}</span>
                                <div>
                                  <div className="font-medium text-white text-sm">{inst.installation_name}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{platform?.name || inst.platform}</span>
                                    <span>•</span>
                                    <span>v{inst.core_version}</span>
                                    <span>•</span>
                                    <span className="capitalize">{inst.environment}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {inst.license_id && <Shield className="h-4 w-4 text-green-400" />}
                                <Badge
                                  variant={inst.status === 'active' ? 'default' : 'secondary'}
                                  className={cn(
                                    inst.status === 'active' && 'bg-green-500/20 text-green-400',
                                    inst.status === 'installing' && 'bg-amber-500/20 text-amber-400',
                                    inst.status === 'maintenance' && 'bg-blue-500/20 text-blue-400',
                                  )}
                                >
                                  {inst.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {inst.status === 'installing' && <Clock className="h-3 w-3 mr-1" />}
                                  {inst.status}
                                </Badge>
                                <Eye className="h-4 w-4 text-slate-500" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <UnifiedFooter />
    </div>
  );
}
