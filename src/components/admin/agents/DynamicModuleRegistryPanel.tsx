/**
 * DynamicModuleRegistryPanel - Panel de Registro Dinámico de Módulos
 * 
 * UI para gestionar el registro automático de módulos y sus agentes.
 * Permite:
 * - Ver módulos registrados y sus agentes
 * - Registrar nuevos módulos manualmente
 * - Auto-descubrir módulos del sistema
 * - Configurar agentes por módulo
 * - Ver el estado de coordinación con el supervisor
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Bot,
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  Layers,
  GitBranch,
  Network,
  Sparkles,
  Activity,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Crown,
  Shield,
  Zap,
  Brain,
  Target,
  Building2,
  Users,
  BarChart3,
  FileText,
  Briefcase,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  useDynamicModuleRegistry, 
  type ModuleDomain, 
  type DynamicModuleDefinition,
  type DynamicAgentDefinition,
  AGENT_TEMPLATES 
} from '@/hooks/admin/agents/dynamicModuleRegistry';

// === ICONOS POR DOMINIO ===
const DOMAIN_ICONS: Record<ModuleDomain, React.ElementType> = {
  crm: Users,
  erp: Building2,
  analytics: BarChart3,
  operations: Briefcase,
  finance: Target,
  hr: Heart,
  compliance: Shield,
  custom: Bot
};

const DOMAIN_COLORS: Record<ModuleDomain, string> = {
  crm: 'from-blue-500 to-cyan-500',
  erp: 'from-purple-500 to-pink-500',
  analytics: 'from-emerald-500 to-teal-500',
  operations: 'from-orange-500 to-amber-500',
  finance: 'from-green-500 to-lime-500',
  hr: 'from-rose-500 to-pink-500',
  compliance: 'from-indigo-500 to-violet-500',
  custom: 'from-gray-500 to-slate-500'
};

const DOMAIN_LABELS: Record<ModuleDomain, string> = {
  crm: 'CRM',
  erp: 'ERP',
  analytics: 'Analytics',
  operations: 'Operaciones',
  finance: 'Finanzas',
  hr: 'RRHH',
  compliance: 'Compliance',
  custom: 'Personalizado'
};

// === COMPONENTE PRINCIPAL ===
export function DynamicModuleRegistryPanel() {
  const {
    modules,
    agents,
    supervisorRegistrations,
    events,
    isLoading,
    registryStats,
    registerModule,
    createCustomAgent,
    toggleAgentStatus,
    updateAgentConfig,
    unregisterModule,
    discoverModules,
    getAgentsByModule
  } = useDynamicModuleRegistry();

  const [activeTab, setActiveTab] = useState('overview');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [selectedModuleForAgent, setSelectedModuleForAgent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar módulos por búsqueda
  const filteredModules = modules.filter(m => 
    m.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.moduleKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Network className="h-5 w-5 text-white" />
            </div>
            Registro Dinámico de Módulos
          </h2>
          <p className="text-muted-foreground mt-1">
            Sistema automático de registro de módulos y agentes coordinados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={discoverModules}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Auto-Descubrir
          </Button>
          
          <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Módulo
              </Button>
            </DialogTrigger>
            <RegisterModuleDialog 
              onRegister={async (data) => {
                await registerModule(data);
                setIsRegisterDialogOpen(false);
              }}
              isLoading={isLoading}
            />
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Módulos"
          value={registryStats.totalModules}
          subtitle={`${registryStats.activeModules} activos`}
          icon={Layers}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Agentes"
          value={registryStats.totalAgents}
          subtitle={`${registryStats.activeAgents} activos`}
          icon={Bot}
          color="from-purple-500 to-pink-500"
        />
        <StatCard
          title="Coordinados"
          value={registryStats.acceptedRegistrations}
          subtitle="con supervisor"
          icon={Crown}
          color="from-amber-500 to-orange-500"
        />
        <StatCard
          title="Pendientes"
          value={registryStats.pendingRegistrations}
          subtitle="por aprobar"
          icon={AlertTriangle}
          color="from-red-500 to-rose-500"
        />
        <StatCard
          title="Confianza"
          value={`${registryStats.avgConfidence}%`}
          subtitle="promedio"
          icon={Target}
          color="from-emerald-500 to-teal-500"
        />
        <StatCard
          title="Eventos"
          value={events.length}
          subtitle="registrados"
          icon={Activity}
          color="from-indigo-500 to-violet-500"
        />
      </div>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            modules={modules}
            agents={agents}
            registryStats={registryStats}
            getAgentsByModule={getAgentsByModule}
          />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <ModulesTab
            modules={filteredModules}
            agents={agents}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            getAgentsByModule={getAgentsByModule}
            onCreateAgent={(moduleId) => {
              setSelectedModuleForAgent(moduleId);
              setIsAgentDialogOpen(true);
            }}
            onUnregister={unregisterModule}
          />
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <AgentsTab
            agents={agents}
            modules={modules}
            supervisorRegistrations={supervisorRegistrations}
            onToggleStatus={toggleAgentStatus}
            onUpdateConfig={updateAgentConfig}
          />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <EventsTab events={events} />
        </TabsContent>
      </Tabs>

      {/* Dialog para crear agente personalizado */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <CreateAgentDialog
          moduleId={selectedModuleForAgent}
          modules={modules}
          onCreateAgent={async (moduleId, data) => {
            await createCustomAgent(moduleId, data);
            setIsAgentDialogOpen(false);
          }}
          isLoading={isLoading}
        />
      </Dialog>
    </div>
  );
}

// === SUB-COMPONENTES ===

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ 
  modules, 
  agents, 
  registryStats,
  getAgentsByModule 
}: { 
  modules: DynamicModuleDefinition[];
  agents: DynamicAgentDefinition[];
  registryStats: ReturnType<typeof useDynamicModuleRegistry>['registryStats'];
  getAgentsByModule: (id: string) => DynamicAgentDefinition[];
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Distribución por dominio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Distribución por Dominio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(registryStats.domainCounts).map(([domain, count]) => {
              const Icon = DOMAIN_ICONS[domain as ModuleDomain];
              const color = DOMAIN_COLORS[domain as ModuleDomain];
              const percentage = (count / registryStats.totalModules) * 100;
              
              return (
                <div key={domain} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded bg-gradient-to-br", color)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span>{DOMAIN_LABELS[domain as ModuleDomain]}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
            
            {Object.keys(registryStats.domainCounts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay módulos registrados aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Módulos recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Módulos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {modules.slice(0, 5).map(module => {
                const Icon = DOMAIN_ICONS[module.domain];
                const agentCount = getAgentsByModule(module.id).length;
                
                return (
                  <div 
                    key={module.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded bg-gradient-to-br",
                        DOMAIN_COLORS[module.domain]
                      )}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{module.moduleName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {agentCount} agente{agentCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={module.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {module.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                );
              })}
              
              {modules.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay módulos registrados aún
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Agentes activos */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes Coordinados con Supervisor
          </CardTitle>
          <CardDescription>
            Agentes que reportan y se coordinan con el supervisor general
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {agents.filter(a => a.coordinatesWithSupervisor).slice(0, 8).map(agent => {
              const module = modules.find(m => m.id === agent.moduleId);
              
              return (
                <div 
                  key={agent.id}
                  className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                      <Brain className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.agentName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {module?.moduleName || 'Sin módulo'}
                      </p>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      agent.isActive ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Confianza: {Math.round(agent.confidenceThreshold * 100)}%</span>
                    <Badge variant="outline" className="text-[9px] py-0">
                      {agent.executionMode}
                    </Badge>
                  </div>
                </div>
              );
            })}
            
            {agents.filter(a => a.coordinatesWithSupervisor).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                No hay agentes coordinados aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModulesTab({
  modules,
  agents,
  searchQuery,
  setSearchQuery,
  getAgentsByModule,
  onCreateAgent,
  onUnregister
}: {
  modules: DynamicModuleDefinition[];
  agents: DynamicAgentDefinition[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  getAgentsByModule: (id: string) => DynamicAgentDefinition[];
  onCreateAgent: (moduleId: string) => void;
  onUnregister: (moduleId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar módulos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {modules.map(module => {
            const Icon = DOMAIN_ICONS[module.domain];
            const moduleAgents = getAgentsByModule(module.id);
            
            return (
              <motion.div
                key={module.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="overflow-hidden">
                  <div className={cn("h-1 bg-gradient-to-r", DOMAIN_COLORS[module.domain])} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-lg bg-gradient-to-br",
                          DOMAIN_COLORS[module.domain]
                        )}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{module.moduleName}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">{module.moduleKey}</p>
                        </div>
                      </div>
                      <Badge variant={module.isActive ? 'default' : 'secondary'}>
                        {module.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {module.description || 'Sin descripción'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Dominio:</span>
                      <Badge variant="outline">{DOMAIN_LABELS[module.domain]}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Agentes:</span>
                      <span className="font-medium">{moduleAgents.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Versión:</span>
                      <span>{module.version}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => onCreateAgent(module.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agente
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => onUnregister(module.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {modules.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay módulos registrados</p>
            <p className="text-sm text-muted-foreground/70">
              Registra un módulo o usa auto-descubrir
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentsTab({
  agents,
  modules,
  supervisorRegistrations,
  onToggleStatus,
  onUpdateConfig
}: {
  agents: DynamicAgentDefinition[];
  modules: DynamicModuleDefinition[];
  supervisorRegistrations: ReturnType<typeof useDynamicModuleRegistry>['supervisorRegistrations'];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onUpdateConfig: (id: string, updates: Partial<DynamicAgentDefinition>) => void;
}) {
  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-2">
        {agents.map(agent => {
          const module = modules.find(m => m.id === agent.moduleId);
          const registration = supervisorRegistrations.find(r => r.agentId === agent.id);
          
          return (
            <AccordionItem key={agent.id} value={agent.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br",
                    module ? DOMAIN_COLORS[module.domain] : 'from-gray-500 to-slate-500'
                  )}>
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{agent.agentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {module?.moduleName || 'Sin módulo'} • {agent.capabilityLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto mr-4">
                    {agent.coordinatesWithSupervisor && (
                      <Badge variant="outline" className="text-[10px]">
                        <Crown className="h-3 w-3 mr-1" />
                        Coordinado
                      </Badge>
                    )}
                    <Badge 
                      variant={agent.isActive ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {agent.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  {/* Información */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Descripción</Label>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Capacidades</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.capabilities.slice(0, 4).map((cap, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {cap.length > 30 ? cap.substring(0, 30) + '...' : cap}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Confianza:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(agent.confidenceThreshold * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prioridad:</span>
                        <span className="ml-2 font-medium">{agent.priority}/10</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modo:</span>
                        <span className="ml-2 font-medium">{agent.executionMode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Learning:</span>
                        <span className="ml-2 font-medium">
                          {agent.learningEnabled ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Métricas</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="p-2 rounded bg-muted/50 text-center">
                          <p className="text-lg font-bold">{agent.metrics.totalExecutions}</p>
                          <p className="text-[10px] text-muted-foreground">Ejecuciones</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50 text-center">
                          <p className="text-lg font-bold">{agent.metrics.successRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Éxito</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50 text-center">
                          <p className="text-lg font-bold">{agent.metrics.avgResponseTime}ms</p>
                          <p className="text-[10px] text-muted-foreground">Resp. Avg</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50 text-center">
                          <p className="text-lg font-bold">{agent.metrics.learningProgress}%</p>
                          <p className="text-[10px] text-muted-foreground">Aprendizaje</p>
                        </div>
                      </div>
                    </div>

                    {registration && (
                      <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-violet-500" />
                          <div>
                            <p className="text-sm font-medium">Estado con Supervisor</p>
                            <p className="text-xs text-muted-foreground">
                              {registration.status === 'accepted' ? 'Aceptado' : 
                               registration.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={(checked) => onToggleStatus(agent.id, checked)}
                    />
                    <Label className="text-sm">
                      {agent.isActive ? 'Activo' : 'Inactivo'}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Play className="h-3 w-3 mr-1" />
                      Ejecutar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      {agents.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay agentes registrados</p>
          <p className="text-sm text-muted-foreground/70">
            Los agentes se crean automáticamente al registrar módulos
          </p>
        </div>
      )}
    </div>
  );
}

function EventsTab({ events }: { events: ReturnType<typeof useDynamicModuleRegistry>['events'] }) {
  const eventConfig: Record<string, { icon: React.ElementType; color: string }> = {
    module_registered: { icon: Layers, color: 'text-blue-500' },
    agent_created: { icon: Bot, color: 'text-purple-500' },
    agent_activated: { icon: Play, color: 'text-green-500' },
    agent_deactivated: { icon: Pause, color: 'text-amber-500' },
    supervisor_accepted: { icon: CheckCircle, color: 'text-emerald-500' },
    supervisor_rejected: { icon: AlertTriangle, color: 'text-red-500' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Historial de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {events.map(event => {
              const config = eventConfig[event.type] || { icon: Activity, color: 'text-muted-foreground' };
              const Icon = config.icon;
              
              return (
                <div 
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className={cn("p-1.5 rounded", config.color, "bg-current/10")}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.entityType}: {event.entityId.substring(0, 20)}...
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(event.timestamp, { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay eventos registrados
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// === DIALOGS ===

function RegisterModuleDialog({ 
  onRegister, 
  isLoading 
}: { 
  onRegister: (data: Omit<DynamicModuleDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    moduleKey: '',
    moduleName: '',
    domain: 'crm' as ModuleDomain,
    description: '',
    icon: 'Bot',
    color: 'from-blue-500 to-cyan-500',
    version: '1.0.0',
    isActive: true
  });

  const handleSubmit = () => {
    if (!formData.moduleKey || !formData.moduleName) {
      toast.error('Completa los campos requeridos');
      return;
    }
    onRegister(formData);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar Nuevo Módulo</DialogTitle>
        <DialogDescription>
          El módulo se registrará y se creará automáticamente un agente especializado
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Clave del Módulo *</Label>
          <Input
            placeholder="ej: customer-analytics"
            value={formData.moduleKey}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              moduleKey: e.target.value.toLowerCase().replace(/\s+/g, '-')
            }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Nombre del Módulo *</Label>
          <Input
            placeholder="ej: Customer Analytics"
            value={formData.moduleName}
            onChange={(e) => setFormData(prev => ({ ...prev, moduleName: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Dominio</Label>
          <Select
            value={formData.domain}
            onValueChange={(v) => setFormData(prev => ({ 
              ...prev, 
              domain: v as ModuleDomain,
              color: DOMAIN_COLORS[v as ModuleDomain]
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Describe las funcionalidades del módulo..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Activar inmediatamente</Label>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </div>

      <DialogFooter>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-gradient-to-r from-violet-500 to-purple-600"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Registrar Módulo
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CreateAgentDialog({
  moduleId,
  modules,
  onCreateAgent,
  isLoading
}: {
  moduleId: string | null;
  modules: DynamicModuleDefinition[];
  onCreateAgent: (moduleId: string, data: Partial<DynamicAgentDefinition>) => Promise<void>;
  isLoading: boolean;
}) {
  const module = modules.find(m => m.id === moduleId);
  const template = module ? AGENT_TEMPLATES[module.domain] : AGENT_TEMPLATES.custom;

  const [formData, setFormData] = useState<{
    agentName: string;
    description: string;
    capabilities: string[];
    capabilityLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
    confidenceThreshold: number;
    executionMode: 'autonomous' | 'supervised' | 'manual';
    priority: number;
    coordinatesWithSupervisor: boolean;
    learningEnabled: boolean;
  }>({
    agentName: '',
    description: '',
    capabilities: template.defaultCapabilities,
    capabilityLevel: 'intermediate',
    confidenceThreshold: template.defaultConfidenceThreshold,
    executionMode: 'supervised',
    priority: template.defaultPriority,
    coordinatesWithSupervisor: true,
    learningEnabled: true
  });

  const handleSubmit = () => {
    if (!moduleId || !formData.agentName) {
      toast.error('Completa los campos requeridos');
      return;
    }
    onCreateAgent(moduleId, formData);
  };

  if (!module) return null;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Crear Agente Personalizado</DialogTitle>
        <DialogDescription>
          Crear un nuevo agente para el módulo {module.moduleName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <Label>Nombre del Agente *</Label>
          <Input
            placeholder="ej: Agente de Análisis Avanzado"
            value={formData.agentName}
            onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Describe el rol y capacidades del agente..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nivel de Capacidad</Label>
            <Select
              value={formData.capabilityLevel}
              onValueChange={(v) => setFormData(prev => ({ 
                ...prev, 
                capabilityLevel: v as 'basic' | 'intermediate' | 'advanced' | 'expert'
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="intermediate">Intermedio</SelectItem>
                <SelectItem value="advanced">Avanzado</SelectItem>
                <SelectItem value="expert">Experto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modo de Ejecución</Label>
            <Select
              value={formData.executionMode}
              onValueChange={(v) => setFormData(prev => ({ 
                ...prev, 
                executionMode: v as 'autonomous' | 'supervised' | 'manual'
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="supervised">Supervisado</SelectItem>
                <SelectItem value="autonomous">Autónomo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Umbral de Confianza: {Math.round(formData.confidenceThreshold * 100)}%</Label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={formData.confidenceThreshold}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              confidenceThreshold: parseFloat(e.target.value)
            }))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Prioridad: {formData.priority}/10</Label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              priority: parseInt(e.target.value)
            }))}
            className="w-full"
          />
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label>Coordinar con Supervisor General</Label>
            <Switch
              checked={formData.coordinatesWithSupervisor}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                coordinatesWithSupervisor: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Habilitar Aprendizaje</Label>
            <Switch
              checked={formData.learningEnabled}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                learningEnabled: checked 
              }))}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-gradient-to-r from-violet-500 to-purple-600"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Bot className="h-4 w-4 mr-2" />
          )}
          Crear Agente
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default DynamicModuleRegistryPanel;
