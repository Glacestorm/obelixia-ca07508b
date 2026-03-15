/**
 * SupervisorDomainView - Domain-specific views for RRHH, Legal, Cross-Module
 * Used inside the global SupervisorAgentsDashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Bot, Brain, Shield, Scale, Activity, CheckCircle, AlertTriangle,
  ArrowUpRight, Clock, Network, Eye, Lock, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RegistryAgent, InvocationRecord } from '@/hooks/admin/agents/useSupervisorDomainData';

interface DomainViewProps {
  agents: RegistryAgent[];
  invocations: InvocationRecord[];
  domain: 'hr' | 'legal' | 'cross';
  title: string;
  icon: React.ReactNode;
  accentColor: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  beta: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  disabled: 'bg-muted text-muted-foreground',
};

const OUTCOME_COLORS: Record<string, { label: string; color: string }> = {
  success: { label: 'Éxito', color: 'bg-emerald-500/15 text-emerald-700' },
  failed: { label: 'Fallido', color: 'bg-destructive/15 text-destructive' },
  escalated: { label: 'Escalado', color: 'bg-amber-500/15 text-amber-700' },
  human_review: { label: 'Revisión', color: 'bg-violet-500/15 text-violet-700' },
};

export function SupervisorDomainView({ agents, invocations, domain, title, icon, accentColor }: DomainViewProps) {
  const supervisors = agents.filter(a => a.agent_type === 'supervisor');
  const specialists = agents.filter(a => a.agent_type !== 'supervisor');
  const escalated = invocations.filter(i => i.escalated_to);
  const humanReview = invocations.filter(i => i.outcome_status === 'human_review');
  const successCount = invocations.filter(i => i.outcome_status === 'success').length;
  const successRate = invocations.length > 0 ? Math.round((successCount / invocations.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Domain KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bot className={cn("h-4 w-4", accentColor)} />
              <div>
                <p className="text-lg font-bold">{agents.length}</p>
                <p className="text-[10px] text-muted-foreground">Agentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{invocations.length}</p>
                <p className="text-[10px] text-muted-foreground">Invocaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{successRate}%</p>
                <p className="text-[10px] text-muted-foreground">Tasa éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{escalated.length}</p>
                <p className="text-[10px] text-muted-foreground">Escalados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-lg font-bold">{humanReview.length}</p>
                <p className="text-[10px] text-muted-foreground">Rev. humana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-3">
          {supervisors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Supervisores</h4>
              {supervisors.map(agent => (
                <AgentMiniCard key={agent.code} agent={agent} isSupervisor />
              ))}
            </div>
          )}
          {specialists.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Especialistas</h4>
              <div className="space-y-2">
                {specialists.map(agent => (
                  <AgentMiniCard key={agent.code} agent={agent} />
                ))}
              </div>
            </div>
          )}
          {agents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin agentes registrados en este dominio</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Invocations */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Actividad reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {invocations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin actividad registrada</p>
                    </div>
                  ) : invocations.slice(0, 30).map(inv => (
                    <InvocationMiniRow key={inv.id} inv={inv} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AgentMiniCard({ agent, isSupervisor = false }: { agent: RegistryAgent; isSupervisor?: boolean }) {
  const statusClass = STATUS_COLORS[agent.status] || STATUS_COLORS.active;
  return (
    <Card className={cn("transition-colors hover:bg-muted/30 mb-2", isSupervisor && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", isSupervisor ? "bg-gradient-to-br from-primary to-violet-600" : "bg-muted")}>
            {isSupervisor ? <Brain className="h-4 w-4 text-white" /> :
              agent.module_domain === 'hr' ? <Bot className="h-4 w-4 text-primary" /> :
              agent.module_domain === 'legal' ? <Scale className="h-4 w-4 text-amber-600" /> :
              <Network className="h-4 w-4 text-violet-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{agent.name}</span>
              <Badge variant="outline" className={cn("text-[10px] py-0", statusClass)}>
                {agent.status}
              </Badge>
              {agent.requires_human_review && (
                <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/10 text-amber-700">
                  <Shield className="h-2.5 w-2.5 mr-0.5" /> Rev. humana
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{agent.description}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span>Confianza: {Math.round(agent.confidence_threshold * 100)}%</span>
              <span>Handler: <code className="bg-muted px-1 rounded">{agent.backend_handler}</code></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InvocationMiniRow({ inv }: { inv: InvocationRecord }) {
  const outcome = OUTCOME_COLORS[inv.outcome_status] || OUTCOME_COLORS.success;
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="shrink-0 mt-0.5">
        {inv.escalated_to ? <ArrowUpRight className="h-4 w-4 text-amber-600" /> :
         inv.outcome_status === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> :
         inv.outcome_status === 'human_review' ? <Lock className="h-4 w-4 text-violet-600" /> :
         <AlertTriangle className="h-4 w-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.agent_code}</code>
          <Badge variant="outline" className={cn("text-[10px] py-0", outcome.color)}>{outcome.label}</Badge>
          {inv.confidence_score > 0 && (
            <span className="text-[10px] text-muted-foreground">{Math.round(inv.confidence_score * 100)}%</span>
          )}
          {inv.escalated_to && (
            <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/15 text-amber-700">
              → {inv.escalated_to}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {inv.execution_time_ms}ms · {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inv.input_summary}</p>
        {inv.routing_reason && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{inv.routing_reason}</p>
        )}
      </div>
    </div>
  );
}

// Conflicts & Human Review view
export function SupervisorConflictsView({ 
  escalated, 
  humanReview 
}: { 
  escalated: InvocationRecord[]; 
  humanReview: InvocationRecord[];
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Escalated / Conflicts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Conflictos y Escalados ({escalated.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {escalated.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin conflictos activos</p>
                </div>
              ) : escalated.map(inv => (
                <div key={inv.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.agent_code}</code>
                    <ArrowUpRight className="h-3 w-3 text-amber-600" />
                    <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.escalated_to}</code>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{inv.input_summary}</p>
                  {inv.escalation_reason && (
                    <p className="text-[10px] text-amber-700 mt-1">Motivo: {inv.escalation_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Human Review */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-violet-500" />
            Revisión Humana ({humanReview.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {humanReview.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin casos pendientes de revisión</p>
                </div>
              ) : humanReview.map(inv => (
                <div key={inv.id} className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.agent_code}</code>
                    <Badge variant="outline" className="text-[10px] py-0 bg-violet-500/15 text-violet-700">
                      Requiere revisión
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{inv.input_summary}</p>
                  {inv.routing_reason && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic">{inv.routing_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default SupervisorDomainView;
