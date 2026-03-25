import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Bot,
  Shield,
  Eye,
  LayoutGrid,
  List,
  Layers,
  RefreshCw,
  CheckCircle,
  PauseCircle,
  AlertCircle,
  XCircle,
  Brain,
  Cpu,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SemaphoreIndicator } from './SemaphoreIndicator';
import type { AgentRegistryItem } from '@/hooks/erp/ai-center/useAICommandCenter';

interface AgentCatalogPanelProps {
  agents: AgentRegistryItem[];
  loading: boolean;
  onRefresh: () => void;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  active: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', label: 'Activo' },
  paused: { icon: PauseCircle, color: 'text-yellow-600 dark:text-yellow-400', label: 'Pausado' },
  error: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', label: 'Error' },
  inactive: { icon: XCircle, color: 'text-muted-foreground', label: 'Inactivo' },
};

const domainConfig: Record<string, { color: string; label: string }> = {
  hr: { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20', label: 'RRHH' },
  legal: { color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20', label: 'Jurídico' },
  crm: { color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', label: 'CRM' },
  erp: { color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20', label: 'ERP' },
  cross: { color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20', label: 'Cross-Domain' },
  general: { color: 'bg-muted text-muted-foreground border-border', label: 'General' },
};

const typeIcons: Record<string, React.ElementType> = {
  supervisor: Shield,
  specialist: Brain,
  worker: Cpu,
  assistant: Bot,
};

export function AgentCatalogPanel({ agents, loading, onRefresh }: AgentCatalogPanelProps) {
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'hierarchy'>('grid');
  const [selectedAgent, setSelectedAgent] = useState<AgentRegistryItem | null>(null);

  const domains = useMemo(() => {
    const set = new Set(agents.map(a => a.module_domain));
    return Array.from(set).sort();
  }, [agents]);

  const types = useMemo(() => {
    const set = new Set(agents.map(a => a.agent_type));
    return Array.from(set).sort();
  }, [agents]);

  const filtered = useMemo(() => {
    return agents.filter(agent => {
      const matchSearch = search === '' ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.code.toLowerCase().includes(search.toLowerCase()) ||
        (agent.description || '').toLowerCase().includes(search.toLowerCase());
      const matchDomain = filterDomain === 'all' || agent.module_domain === filterDomain;
      const matchType = filterType === 'all' || agent.agent_type === filterType;
      const matchStatus = filterStatus === 'all' || agent.status === filterStatus;
      return matchSearch && matchDomain && matchType && matchStatus;
    });
  }, [agents, search, filterDomain, filterType, filterStatus]);

  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    supervisors: agents.filter(a => a.agent_type === 'supervisor').length,
    humanReview: agents.filter(a => a.requires_human_review).length,
  }), [agents]);

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Agentes</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-lg font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Shield className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-muted-foreground">Supervisores</p>
                <p className="text-lg font-bold">{stats.supervisors}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Users className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Revisión Humana</p>
                <p className="text-lg font-bold">{stats.humanReview}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código o descripción..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="w-full md:w-[140px] h-9">
                  <SelectValue placeholder="Dominio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {domains.map(d => (
                    <SelectItem key={d} value={d}>{domainConfig[d]?.label || d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[140px] h-9">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[130px] h-9">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('hierarchy')}
                  title="Vista jerárquica por dominio"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} de {agents.length} agentes
        </p>

        {/* Agent Grid/List */}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No se encontraron agentes con esos filtros</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(agent => {
              const status = statusConfig[agent.status] || statusConfig.inactive;
              const StatusIcon = status.icon;
              const TypeIcon = typeIcons[agent.agent_type] || Bot;
              const domain = domainConfig[agent.module_domain] || domainConfig.general;

              return (
                <Card
                  key={agent.id}
                  className="hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <TypeIcon className="h-4 w-4 text-primary" />
                        </div>
                        <StatusIcon className={cn('h-4 w-4', status.color)} />
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', domain.color)}>
                        {domain.label}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {agent.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{agent.code}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {agent.description || 'Sin descripción'}
                    </p>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Confianza: ≥{agent.confidence_threshold}%</span>
                      <span className="capitalize">{agent.execution_type}</span>
                      {agent.requires_human_review && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1">
                          <Eye className="h-2.5 w-2.5 mr-0.5" /> HITL
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-border">
                  {filtered.map(agent => {
                    const status = statusConfig[agent.status] || statusConfig.inactive;
                    const StatusIcon = status.icon;
                    const domain = domainConfig[agent.module_domain] || domainConfig.general;

                    return (
                      <div
                        key={agent.id}
                        className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer flex items-center gap-3"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <StatusIcon className={cn('h-4 w-4 shrink-0', status.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{agent.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{agent.code}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', domain.color)}>
                          {domain.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0 capitalize">{agent.agent_type}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">≥{agent.confidence_threshold}%</span>
                        {agent.requires_human_review && (
                          <Eye className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          /* Hierarchy view - grouped by domain */
          <div className="space-y-4">
            {Object.entries(
              filtered.reduce<Record<string, AgentRegistryItem[]>>((acc, agent) => {
                const d = agent.module_domain || 'general';
                if (!acc[d]) acc[d] = [];
                acc[d].push(agent);
                return acc;
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([domainKey, domainAgents]) => {
              const domain = domainConfig[domainKey] || domainConfig.general;
              const supervisors = domainAgents.filter(a => a.agent_type === 'supervisor');
              const specialists = domainAgents.filter(a => a.agent_type === 'specialist');
              const workers = domainAgents.filter(a => a.agent_type !== 'supervisor' && a.agent_type !== 'specialist');

              return (
                <Card key={domainKey}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', domain.color)}>
                          {domain.label}
                        </Badge>
                        <span className="text-muted-foreground font-normal text-xs">
                          {domainAgents.length} agentes
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{domainAgents.filter(a => a.status === 'active').length} activos</span>
                        <span>·</span>
                        <span>{domainAgents.filter(a => a.requires_human_review).length} HITL</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Supervisors */}
                    {supervisors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Supervisores
                        </p>
                        <div className="grid gap-2">
                          {supervisors.map(agent => {
                            const status = statusConfig[agent.status] || statusConfig.inactive;
                            const StatusIcon = status.icon;
                            return (
                              <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg border bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setSelectedAgent(agent)}>
                                <Shield className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-sm font-medium flex-1 truncate">{agent.name}</span>
                                <StatusIcon className={cn('h-3.5 w-3.5', status.color)} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Specialists */}
                    {specialists.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                          <Brain className="h-3 w-3" /> Especialistas
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {specialists.map(agent => {
                            const status = statusConfig[agent.status] || statusConfig.inactive;
                            const StatusIcon = status.icon;
                            return (
                              <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedAgent(agent)}>
                                <StatusIcon className={cn('h-3 w-3 shrink-0', status.color)} />
                                <span className="text-xs truncate flex-1">{agent.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono">{agent.code}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Workers */}
                    {workers.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                          <Cpu className="h-3 w-3" /> Workers / Asistentes
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                          {workers.map(agent => {
                            const status = statusConfig[agent.status] || statusConfig.inactive;
                            const StatusIcon = status.icon;
                            return (
                              <div key={agent.id} className="flex items-center gap-2 p-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedAgent(agent)}>
                                <StatusIcon className={cn('h-3 w-3 shrink-0', status.color)} />
                                <span className="text-[11px] truncate">{agent.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Detail Sheet */}
      <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedAgent && <AgentDetailView agent={selectedAgent} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AgentDetailView({ agent }: { agent: AgentRegistryItem }) {
  const status = statusConfig[agent.status] || statusConfig.inactive;
  const StatusIcon = status.icon;
  const TypeIcon = typeIcons[agent.agent_type] || Bot;
  const domain = domainConfig[agent.module_domain] || domainConfig.general;

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <TypeIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-lg">{agent.name}</SheetTitle>
            <p className="text-xs text-muted-foreground font-mono">{agent.code}</p>
          </div>
        </div>
      </SheetHeader>

      {/* Status & Domain */}
      <div className="flex flex-wrap gap-2">
        <Badge className={cn('gap-1', status.color, 'bg-transparent border')}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
        <Badge variant="outline" className={cn(domain.color)}>
          {domain.label}
        </Badge>
        <Badge variant="secondary" className="capitalize">{agent.agent_type}</Badge>
        <Badge variant="secondary" className="capitalize">{agent.execution_type}</Badge>
      </div>

      {/* Description */}
      {agent.description && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descripción</h4>
          <p className="text-sm">{agent.description}</p>
        </div>
      )}

      {/* Specialization */}
      {agent.specialization && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Especialización</h4>
          <p className="text-sm">{agent.specialization}</p>
        </div>
      )}

      <Separator />

      {/* Configuration */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Configuración</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Umbral de Confianza</p>
            <p className="text-lg font-bold text-primary">{agent.confidence_threshold}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Revisión Humana</p>
            <div className="flex items-center gap-1.5 mt-1">
              {agent.requires_human_review ? (
                <>
                  <Eye className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Obligatoria</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Autónomo</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Metadata */}
      <div className="text-[10px] text-muted-foreground space-y-1">
        <p>ID: {agent.id}</p>
        <p>Tipo de ejecución: {agent.execution_type}</p>
      </div>
    </div>
  );
}

export default AgentCatalogPanel;
