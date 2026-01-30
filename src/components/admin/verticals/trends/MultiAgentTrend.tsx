/**
 * MultiAgentTrend - Tendencia #6: Multi-Agent Orchestration
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Network, 
  Bot, 
  Zap, 
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  MessageSquare,
  Share2,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Jerarquía de agentes
const AGENT_HIERARCHY = {
  supervisor: {
    id: 'supervisor',
    name: 'Supervisor Agent',
    status: 'active',
    tasksRouted: 156,
    activeConnections: 4,
  },
  domains: [
    {
      id: 'domain-finance',
      name: 'Finance Domain',
      agents: [
        { id: 'agent-accounting', name: 'Accounting Agent', status: 'active', tasks: 45 },
        { id: 'agent-treasury', name: 'Treasury Agent', status: 'active', tasks: 23 },
        { id: 'agent-tax', name: 'Tax Agent', status: 'idle', tasks: 12 },
      ],
    },
    {
      id: 'domain-operations',
      name: 'Operations Domain',
      agents: [
        { id: 'agent-inventory', name: 'Inventory Agent', status: 'active', tasks: 67 },
        { id: 'agent-logistics', name: 'Logistics Agent', status: 'busy', tasks: 34 },
        { id: 'agent-quality', name: 'Quality Agent', status: 'active', tasks: 28 },
      ],
    },
    {
      id: 'domain-sales',
      name: 'Sales Domain',
      agents: [
        { id: 'agent-crm', name: 'CRM Agent', status: 'active', tasks: 89 },
        { id: 'agent-pipeline', name: 'Pipeline Agent', status: 'active', tasks: 56 },
      ],
    },
    {
      id: 'domain-hr',
      name: 'HR Domain',
      agents: [
        { id: 'agent-recruitment', name: 'Recruitment Agent', status: 'idle', tasks: 18 },
        { id: 'agent-payroll', name: 'Payroll Agent', status: 'active', tasks: 31 },
      ],
    },
  ],
};

const ORCHESTRATION_LOGS = [
  { id: 1, from: 'Supervisor', to: 'Accounting Agent', action: 'Route: Reconciliación bancaria', status: 'completed', time: '10:48:22' },
  { id: 2, from: 'CRM Agent', to: 'Pipeline Agent', action: 'Handoff: Lead scoring completado', status: 'completed', time: '10:47:15' },
  { id: 3, from: 'Inventory Agent', to: 'Logistics Agent', action: 'Request: Stock crítico detectado', status: 'in_progress', time: '10:46:30' },
  { id: 4, from: 'Supervisor', to: 'Quality Agent', action: 'Assign: Auditoría mensual', status: 'pending', time: '10:45:00' },
  { id: 5, from: 'Treasury Agent', to: 'Tax Agent', action: 'Notify: Pago fiscal próximo', status: 'completed', time: '10:40:12' },
];

const SHARED_MEMORY = [
  { key: 'current_month_revenue', value: '€2.4M', agents: ['Accounting', 'Pipeline', 'CRM'] },
  { key: 'pending_orders', value: '156', agents: ['Inventory', 'Logistics'] },
  { key: 'active_leads', value: '342', agents: ['CRM', 'Pipeline', 'Supervisor'] },
  { key: 'open_tickets', value: '28', agents: ['Quality', 'Operations'] },
];

export function MultiAgentTrend() {
  const [selectedDomain, setSelectedDomain] = useState(AGENT_HIERARCHY.domains[0]);

  const totalAgents = AGENT_HIERARCHY.domains.reduce((acc, d) => acc + d.agents.length, 0);
  const activeAgents = AGENT_HIERARCHY.domains.reduce(
    (acc, d) => acc + d.agents.filter(a => a.status === 'active').length, 
    0
  );
  const totalTasks = AGENT_HIERARCHY.domains.reduce(
    (acc, d) => acc + d.agents.reduce((sum, a) => sum + a.tasks, 0), 
    0
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-blue-500';
      case 'idle': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-200 dark:border-violet-800">
          <CardContent className="p-4 text-center">
            <Network className="h-8 w-8 mx-auto mb-2 text-violet-500" />
            <p className="text-2xl font-bold">{totalAgents + 1}</p>
            <p className="text-xs text-muted-foreground">Agentes Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{activeAgents}</p>
            <p className="text-xs text-muted-foreground">Activos Ahora</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{totalTasks}</p>
            <p className="text-xs text-muted-foreground">Tareas Procesadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <Share2 className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{AGENT_HIERARCHY.domains.length}</p>
            <p className="text-xs text-muted-foreground">Dominios</p>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Jerarquía de Orquestación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Supervisor */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground w-64 text-center">
              <Bot className="h-8 w-8 mx-auto mb-2" />
              <p className="font-bold">{AGENT_HIERARCHY.supervisor.name}</p>
              <p className="text-xs opacity-80">{AGENT_HIERARCHY.supervisor.tasksRouted} tareas enrutadas</p>
              <div className="mt-2 flex justify-center gap-2">
                <Badge className="bg-white/20">{AGENT_HIERARCHY.supervisor.activeConnections} conexiones</Badge>
              </div>
            </div>
          </div>

          {/* Connection lines */}
          <div className="flex justify-center mb-4">
            <div className="w-px h-8 bg-border" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-3/4 h-px bg-border" />
          </div>

          {/* Domains */}
          <div className="grid grid-cols-4 gap-4">
            {AGENT_HIERARCHY.domains.map((domain) => (
              <div 
                key={domain.id}
                onClick={() => setSelectedDomain(domain)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  selectedDomain.id === domain.id 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-muted-foreground/30"
                )}
              >
                <div className="text-center mb-3">
                  <p className="font-medium text-sm">{domain.name}</p>
                  <p className="text-xs text-muted-foreground">{domain.agents.length} agentes</p>
                </div>
                <div className="space-y-2">
                  {domain.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 text-xs">
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(agent.status))} />
                      <span className="truncate">{agent.name.replace(' Agent', '')}</span>
                      <span className="ml-auto text-muted-foreground">{agent.tasks}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orchestration Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Comunicación Inter-Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {ORCHESTRATION_LOGS.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{log.from}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">{log.to}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">{log.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{log.action}</p>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        log.status === 'completed' && "bg-green-500",
                        log.status === 'in_progress' && "bg-blue-500 animate-pulse",
                        log.status === 'pending' && "bg-amber-500"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Shared Memory */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Memoria Compartida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {SHARED_MEMORY.map((mem, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{mem.key}</code>
                      <span className="font-bold">{mem.value}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {mem.agents.map((agent, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {agent}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Domain Detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedDomain.name} - Detalle
            </CardTitle>
            <Badge>{selectedDomain.agents.length} agentes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {selectedDomain.agents.map((agent) => (
              <Card key={agent.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(agent.status))} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tareas</span>
                      <span className="font-bold">{agent.tasks}</span>
                    </div>
                    <Progress value={Math.min(agent.tasks * 1.5, 100)} className="h-1.5" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2">
                      {agent.status === 'active' 
                        ? <PauseCircle className="h-4 w-4" />
                        : <PlayCircle className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiAgentTrend;
