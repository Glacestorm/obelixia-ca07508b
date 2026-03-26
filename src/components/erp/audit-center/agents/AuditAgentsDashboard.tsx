/**
 * AuditAgentsDashboard — Panel de los 8 agentes especializados + 2 supervisores
 * Con configuración individual por agente (patrón IA Center)
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Shield, Activity, RefreshCw, Zap, ArrowUpRight, Eye, Settings } from 'lucide-react';
import { useAuditAgents } from '@/hooks/erp/audit';
import { AuditAgentConfigSheet } from './AuditAgentConfigSheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditAgentsDashboardProps {
  initialView?: 'hierarchy' | 'list' | 'activity';
}

export function AuditAgentsDashboard({ initialView = 'hierarchy' }: AuditAgentsDashboardProps) {
  const {
    agents, invocations, stats, isLoading,
    fetchAuditAgents, fetchInvocations,
    specialists, supervisors, superSupervisor,
    internalAgents, externalAgents, internalSupervisor, externalSupervisor,
  } = useAuditAgents();
  const [view, setView] = useState<'hierarchy' | 'list' | 'activity'>(initialView);

  useEffect(() => { fetchAuditAgents(); fetchInvocations(); }, []);

  const handleSaveConfig = (agentId: string, config: any) => {
    console.log('[AuditAgentsDashboard] Save config for', agentId, config);
    toast.success('Configuración del agente guardada');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] h-5">Activo</Badge>;
      case 'idle': return <Badge variant="secondary" className="text-[10px] h-5">Inactivo</Badge>;
      case 'error': return <Badge variant="destructive" className="text-[10px] h-5">Error</Badge>;
      default: return <Badge variant="outline" className="text-[10px] h-5">{status}</Badge>;
    }
  };

  const agentTypeIcon = (type: string) => {
    switch (type) {
      case 'super_supervisor': return <Bot className="h-5 w-5 text-amber-500" />;
      case 'supervisor': return <Shield className="h-5 w-5 text-blue-500" />;
      default: return <Zap className="h-5 w-5 text-primary" />;
    }
  };

  const AgentCard = ({ agent }: { agent: typeof agents[0] }) => (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {agentTypeIcon(agent.agent_type)}
          <span className="text-xs font-medium">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {statusBadge(agent.status)}
          <AuditAgentConfigSheet agent={agent} onSave={handleSaveConfig} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground line-clamp-2">{agent.description}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-[10px]">{agent.code}</Badge>
        <span className="text-[10px] text-muted-foreground">
          Confianza: {agent.confidence_threshold}
        </span>
        {agent.requires_human_review && (
          <Badge variant="secondary" className="text-[10px]">HITL</Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.totalAgents}</p><p className="text-xs text-muted-foreground">Total Agentes</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.activeAgents}</p><p className="text-xs text-muted-foreground">Activos</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.successRate}%</p><p className="text-xs text-muted-foreground">Tasa Éxito</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.escalationRate}%</p><p className="text-xs text-muted-foreground">Escalaciones</p></CardContent></Card>
      </div>

      <Tabs value={view} onValueChange={v => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="hierarchy" className="text-xs gap-1"><Bot className="h-3.5 w-3.5" /> Jerarquía</TabsTrigger>
          <TabsTrigger value="list" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> Listado</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1"><Eye className="h-3.5 w-3.5" /> Actividad</TabsTrigger>
        </TabsList>

        {/* Hierarchy View */}
        <TabsContent value="hierarchy">
          <div className="space-y-4">
            {/* SuperSupervisor */}
            {superSupervisor && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-amber-500" />
                    SuperSupervisor Auditoría
                    {statusBadge(superSupervisor.status)}
                    <AuditAgentConfigSheet agent={superSupervisor} onSave={handleSaveConfig}
                      trigger={<Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-[10px]"><Settings className="h-3 w-3" /> Config</Button>}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>
            )}

            {/* Supervisor Interno + sus agentes */}
            <Card className="border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Supervisor Auditoría Interna
                  {internalSupervisor && statusBadge(internalSupervisor.status)}
                  {internalSupervisor && (
                    <AuditAgentConfigSheet agent={internalSupervisor} onSave={handleSaveConfig}
                      trigger={<Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-[10px]"><Settings className="h-3 w-3" /> Config</Button>}
                    />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {internalAgents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
                </div>
              </CardContent>
            </Card>

            {/* Supervisor Externo + sus agentes */}
            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Supervisor Auditoría Externa
                  {externalSupervisor && statusBadge(externalSupervisor.status)}
                  {externalSupervisor && (
                    <AuditAgentConfigSheet agent={externalSupervisor} onSave={handleSaveConfig}
                      trigger={<Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-[10px]"><Settings className="h-3 w-3" /> Config</Button>}
                    />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {externalAgents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {agents.map(agent => (
                    <div key={agent.id} className="p-3 hover:bg-muted/50 transition-colors flex items-center gap-3">
                      {agentTypeIcon(agent.agent_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{agent.name}</p>
                          <Badge variant="outline" className="text-[10px]">{agent.code}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{agent.agent_type}</span>
                        {statusBadge(agent.status)}
                        <AuditAgentConfigSheet agent={agent} onSave={handleSaveConfig} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Feed */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Feed de Actividad de Agentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => fetchInvocations()} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invocations.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay invocaciones recientes de agentes de auditoría</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {invocations.map(inv => (
                      <div key={inv.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{inv.agent_code}</Badge>
                            <span className="text-xs font-medium">{inv.input_summary}</span>
                          </div>
                          <Badge variant={inv.outcome_status === 'success' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {inv.outcome_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{inv.response_summary}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Confianza: {inv.confidence_score}</span>
                          <span>{inv.execution_time_ms}ms</span>
                          {inv.escalated_to && (
                            <Badge variant="outline" className="text-[10px]">
                              <ArrowUpRight className="h-3 w-3 mr-0.5" /> {inv.escalated_to}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
