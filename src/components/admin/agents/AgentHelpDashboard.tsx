/**
 * AgentHelpDashboard - Vista standalone del sistema de ayuda de agentes
 * Permite explorar la ayuda de todos los agentes disponibles
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Brain,
  Package,
  Sparkles,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { AgentHelpSheet } from './AgentHelpSheet';
import type { AgentType } from '@/hooks/admin/agents/agentHelpTypes';
import { cn } from '@/lib/utils';

interface AgentInfo {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  domain: string;
}

const AVAILABLE_AGENTS: AgentInfo[] = [
  {
    id: 'deal-coach',
    type: 'deal_coaching',
    name: 'Deal Coach',
    description: 'Asistente experto en estrategias de cierre de ventas y negociación.',
    icon: TrendingUp,
    color: 'emerald',
    domain: 'CRM'
  },
  {
    id: 'churn-prevention',
    type: 'churn_prevention',
    name: 'Churn Prevention',
    description: 'Analista especializado en detectar y prevenir la pérdida de clientes.',
    icon: AlertTriangle,
    color: 'amber',
    domain: 'CRM'
  },
  {
    id: 'revenue-optimizer',
    type: 'revenue_optimization',
    name: 'Revenue Optimizer',
    description: 'Experto en maximizar ingresos y detectar oportunidades de upsell/cross-sell.',
    icon: TrendingUp,
    color: 'blue',
    domain: 'CRM'
  },
  {
    id: 'erp-supervisor',
    type: 'supervisor',
    name: 'ERP Supervisor',
    description: 'Coordinador general que supervisa todos los agentes del sistema ERP.',
    icon: Brain,
    color: 'purple',
    domain: 'ERP'
  },
  {
    id: 'inventory-agent',
    type: 'inventory',
    name: 'Inventory Agent',
    description: 'Agente especializado en gestión de inventarios y stock.',
    icon: Package,
    color: 'cyan',
    domain: 'ERP'
  },
  {
    id: 'accounting-agent',
    type: 'accounting',
    name: 'Accounting Agent',
    description: 'Agente especializado en contabilidad y finanzas.',
    icon: TrendingUp,
    color: 'teal',
    domain: 'ERP'
  }
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
};

export function AgentHelpDashboard() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  const domains = [...new Set(AVAILABLE_AGENTS.map(a => a.domain))];
  const filteredAgents = selectedDomain 
    ? AVAILABLE_AGENTS.filter(a => a.domain === selectedDomain)
    : AVAILABLE_AGENTS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-violet-400" />
            Centro de Ayuda de Agentes IA
          </h2>
          <p className="text-slate-400 mt-1">
            Explora la documentación, ejemplos y chatea con cualquier agente para resolver dudas.
          </p>
        </div>
        <Badge variant="outline" className="border-violet-500/30 text-violet-400">
          {AVAILABLE_AGENTS.length} agentes disponibles
        </Badge>
      </div>

      {/* Domain Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Filtrar por dominio:</span>
        <Button
          variant={selectedDomain === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSelectedDomain(null)}
        >
          Todos
        </Button>
        {domains.map(domain => (
          <Button
            key={domain}
            variant={selectedDomain === domain ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedDomain(domain)}
          >
            {domain}
          </Button>
        ))}
      </div>

      {/* Agents Grid */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
          {filteredAgents.map((agent) => {
            const colors = colorMap[agent.color];
            const Icon = agent.icon;
            
            return (
              <Card 
                key={agent.id}
                className={cn(
                  "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-200",
                  "hover:shadow-lg hover:shadow-slate-900/50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      colors.bg
                    )}>
                      <Icon className={cn("h-5 w-5", colors.text)} />
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {agent.domain}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white mt-3">
                    {agent.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <AgentHelpSheet
                      agentId={agent.id}
                      agentType={agent.type}
                      agentName={agent.name}
                      trigger={
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-slate-600 hover:bg-slate-700"
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Ver Ayuda
                        </Button>
                      }
                    />
                    <AgentHelpSheet
                      agentId={agent.id}
                      agentType={agent.type}
                      agentName={agent.name}
                      trigger={
                        <Button 
                          size="sm" 
                          className={cn(
                            "flex-1",
                            colors.bg,
                            colors.text,
                            "hover:opacity-80"
                          )}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chatear
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/30 border-slate-700/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Bot className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{AVAILABLE_AGENTS.length}</p>
              <p className="text-xs text-slate-400">Agentes Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/30 border-slate-700/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-xs text-slate-400">Disponibilidad</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/30 border-slate-700/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">IA</p>
              <p className="text-xs text-slate-400">Asistencia Inteligente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AgentHelpDashboard;
