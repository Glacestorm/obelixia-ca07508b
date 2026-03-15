/**
 * MultiAgentSupervisorPanel - Phase 1A
 * Panel de supervisión multiagente RRHH + Jurídico
 * Catálogo de agentes, chat supervisor, log de invocaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot, Brain, Shield, ShieldCheck, Scale, Activity,
  RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock,
  Send, ArrowUpRight, Sparkles, Network, Eye
} from 'lucide-react';
import { useMultiAgentSupervisor, type AgentRegistryEntry, type AgentInvocation } from '@/hooks/erp/hr/useMultiAgentSupervisor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MultiAgentSupervisorPanelProps {
  companyId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Activo', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: <CheckCircle className="h-3 w-3" /> },
  beta: { label: 'Beta', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: <AlertTriangle className="h-3 w-3" /> },
  disabled: { label: 'Deshabilitado', color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
};

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: 'Éxito', color: 'bg-emerald-500/15 text-emerald-700' },
  failed: { label: 'Fallido', color: 'bg-destructive/15 text-destructive' },
  escalated: { label: 'Escalado', color: 'bg-amber-500/15 text-amber-700' },
  human_review: { label: 'Revisión humana', color: 'bg-violet-500/15 text-violet-700' },
};

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  hr: <Bot className="h-4 w-4 text-primary" />,
  legal: <Scale className="h-4 w-4 text-amber-600" />,
  cross: <Network className="h-4 w-4 text-violet-600" />,
};

export function MultiAgentSupervisorPanel({ companyId }: MultiAgentSupervisorPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'supervisor'; content: string; metadata?: any }>>([]);

  const {
    isLoading,
    registry,
    invocations,
    lastResult,
    error,
    routeQuery,
    getAgentRegistry,
    getRecentInvocations,
    hrAgents,
    legalAgents,
    supervisors,
    escalatedCount,
  } = useMultiAgentSupervisor(companyId);

  useEffect(() => {
    getAgentRegistry();
    getRecentInvocations();
  }, [getAgentRegistry, getRecentInvocations]);

  const handleSendQuery = useCallback(async () => {
    if (!query.trim() || isLoading) return;
    const q = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);

    const result = await routeQuery(q);
    if (result) {
      const agentName = registry.find(a => a.code === result.routing.agent_code)?.name || result.routing.agent_code;
      const wasEscalated = !!result.routing.escalated_to;
      
      let responseText = '';
      if (result.response?.data?.response) {
        responseText = typeof result.response.data.response === 'string' 
          ? result.response.data.response 
          : JSON.stringify(result.response.data.response, null, 2);
      } else if (result.response?.data) {
        responseText = typeof result.response.data === 'string'
          ? result.response.data
          : JSON.stringify(result.response.data, null, 2);
      } else {
        responseText = 'Respuesta procesada correctamente.';
      }

      setChatHistory(prev => [...prev, {
        role: 'supervisor',
        content: responseText,
        metadata: {
          agent: agentName,
          domain: result.routing.domain,
          confidence: result.routing.confidence,
          reasoning: result.routing.reasoning,
          escalated: wasEscalated,
          escalatedTo: result.routing.escalated_to,
          executionTime: result.execution_time_ms,
          outcome: result.outcome_status,
        }
      }]);
    }
  }, [query, isLoading, routeQuery, registry]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Supervisor Multiagente</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fase 1A · {registry.length} agentes · {escalatedCount} escalados a Legal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                <Activity className="h-3 w-3 mr-1" /> Activo
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { getAgentRegistry(); getRecentInvocations(); }}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="text-xs gap-1"><Send className="h-3.5 w-3.5" /> Supervisor</TabsTrigger>
          <TabsTrigger value="agents" className="text-xs gap-1"><Bot className="h-3.5 w-3.5" /> Agentes ({registry.length})</TabsTrigger>
          <TabsTrigger value="log" className="text-xs gap-1"><Eye className="h-3.5 w-3.5" /> Trazabilidad ({invocations.length})</TabsTrigger>
        </TabsList>

        {/* === CHAT SUPERVISOR === */}
        <TabsContent value="chat" className="mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">HR Supervisor listo</p>
                      <p className="text-xs mt-1">
                        Escribe una consulta RRHH. El supervisor la clasificará y enrutará al agente adecuado (Ops, Compliance, o escalará a Legal).
                      </p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border'
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content.substring(0, 2000)}</p>
                        {msg.metadata && (
                          <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="text-[10px] py-0">
                                {DOMAIN_ICONS[msg.metadata.domain]} {msg.metadata.agent}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0">
                                Confianza: {Math.round(msg.metadata.confidence * 100)}%
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px] py-0", OUTCOME_CONFIG[msg.metadata.outcome]?.color)}>
                                {OUTCOME_CONFIG[msg.metadata.outcome]?.label}
                              </Badge>
                              {msg.metadata.escalated && (
                                <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/15 text-amber-700">
                                  <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> Escalado a Legal
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {msg.metadata.reasoning} · {msg.metadata.executionTime}ms
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted border rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Clasificando y enrutando consulta...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu consulta RRHH... (ej: ¿Qué vacaciones le quedan a María? / ¿Es legal despedir durante una IT?)"
                  className="min-h-[60px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button onClick={handleSendQuery} disabled={isLoading || !query.trim()} size="icon" className="h-[60px] w-12">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === AGENT REGISTRY === */}
        <TabsContent value="agents" className="mt-3">
          <div className="space-y-3">
            {/* Supervisors */}
            {supervisors.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Supervisores</h3>
                <div className="grid gap-2">
                  {supervisors.map(agent => (
                    <AgentCard key={agent.code} agent={agent} isSupervisor />
                  ))}
                </div>
              </div>
            )}
            {/* HR Agents */}
            {hrAgents.filter(a => a.agent_type !== 'supervisor').length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agentes RRHH</h3>
                <div className="grid gap-2">
                  {hrAgents.filter(a => a.agent_type !== 'supervisor').map(agent => (
                    <AgentCard key={agent.code} agent={agent} />
                  ))}
                </div>
              </div>
            )}
            {/* Legal Agents */}
            {legalAgents.filter(a => a.agent_type !== 'supervisor').length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agentes Jurídicos</h3>
                <div className="grid gap-2">
                  {legalAgents.filter(a => a.agent_type !== 'supervisor').map(agent => (
                    <AgentCard key={agent.code} agent={agent} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === INVOCATION LOG === */}
        <TabsContent value="log" className="mt-3">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[450px]">
                <div className="space-y-2">
                  {invocations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin invocaciones registradas</p>
                    </div>
                  ) : invocations.map((inv) => (
                    <InvocationRow key={inv.id} invocation={inv} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentCard({ agent, isSupervisor = false }: { agent: AgentRegistryEntry; isSupervisor?: boolean }) {
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.active;
  return (
    <Card className={cn("transition-colors hover:bg-muted/30", isSupervisor && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            isSupervisor ? "bg-gradient-to-br from-primary to-violet-600" : "bg-muted"
          )}>
            {isSupervisor ? <Brain className="h-4 w-4 text-white" /> : DOMAIN_ICONS[agent.module_domain]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{agent.name}</span>
              <Badge variant="outline" className={cn("text-[10px] py-0", status.color)}>
                {status.icon} <span className="ml-1">{status.label}</span>
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0">
                {agent.module_domain.toUpperCase()}
              </Badge>
              {agent.requires_human_review && (
                <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/10 text-amber-700">
                  <Shield className="h-2.5 w-2.5 mr-0.5" /> Revisión humana
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <span>Handler: <code className="bg-muted px-1 rounded">{agent.backend_handler}</code></span>
              <span>Confianza: {Math.round(agent.confidence_threshold * 100)}%</span>
              {agent.supervisor_code && <span>Supervisor: <code className="bg-muted px-1 rounded">{agent.supervisor_code}</code></span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InvocationRow({ invocation }: { invocation: AgentInvocation }) {
  const outcome = OUTCOME_CONFIG[invocation.outcome_status] || OUTCOME_CONFIG.success;
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="shrink-0 mt-0.5">
        {invocation.escalated_to ? (
          <ArrowUpRight className="h-4 w-4 text-amber-600" />
        ) : invocation.outcome_status === 'success' ? (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{invocation.agent_code}</code>
          <Badge variant="outline" className={cn("text-[10px] py-0", outcome.color)}>{outcome.label}</Badge>
          {invocation.confidence_score && (
            <span className="text-[10px] text-muted-foreground">{Math.round(invocation.confidence_score * 100)}%</span>
          )}
          {invocation.escalated_to && (
            <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/15 text-amber-700">
              → {invocation.escalated_to}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {invocation.execution_time_ms}ms · {formatDistanceToNow(new Date(invocation.created_at), { locale: es, addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{invocation.input_summary}</p>
        {invocation.routing_reason && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{invocation.routing_reason}</p>
        )}
      </div>
    </div>
  );
}

export default MultiAgentSupervisorPanel;
