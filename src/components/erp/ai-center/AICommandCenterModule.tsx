import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Zap,
  BookOpen,
  LineChart,
  Map,
  DollarSign,
  ShieldCheck,
  Bell,
  Bot,
  Sparkles,
  Mic,
  Trophy,
  GitBranch,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveOperationsHub } from './LiveOperationsHub';
import { AgentCatalogPanel } from './AgentCatalogPanel';
import { ObservabilityPanel } from './ObservabilityPanel';
import { AICostEconomicsPanel } from './AICostEconomicsPanel';
import { AIGovernancePanel } from './AIGovernancePanel';
import { OrchestrationPanel } from './OrchestrationPanel';
import { AIAlertsPanel } from './AIAlertsPanel';
import { useAICommandCenter } from '@/hooks/erp/ai-center/useAICommandCenter';

// Panels absorbed from AIAgentsPage
import { AutonomousAgentsPanel } from '@/components/admin/ai-agents/AutonomousAgentsPanel';
import { PredictiveCopilotPanel } from '@/components/admin/ai-agents/PredictiveCopilotPanel';
import { VoiceInterfacePanel } from '@/components/admin/ai-agents/VoiceInterfacePanel';
import { ERPAgentLeaderboard } from '@/components/admin/agents/ERPAgentLeaderboard';
import { ERPAutonomousDecisionHistory } from '@/components/admin/agents/ERPAutonomousDecisionHistory';
import { ERPAgentConversationHistory } from '@/components/admin/agents/ERPAgentConversationHistory';

const tabs = [
  // Core Operations
  { id: 'live', label: 'Live Hub', icon: Zap, group: 'ops' },
  { id: 'catalog', label: 'Catálogo', icon: BookOpen, group: 'ops' },
  { id: 'autonomous', label: 'Autónomos', icon: Bot, group: 'ops' },
  { id: 'copilot', label: 'Copilot', icon: Sparkles, group: 'ops' },
  { id: 'voice', label: 'Voz', icon: Mic, group: 'ops' },
  // Analytics & Monitoring
  { id: 'observability', label: 'Observabilidad', icon: LineChart, group: 'analytics' },
  { id: 'ranking', label: 'Ranking', icon: Trophy, group: 'analytics' },
  { id: 'costs', label: 'Economía', icon: DollarSign, group: 'analytics' },
  // Governance & Orchestration
  { id: 'governance', label: 'Gobernanza', icon: ShieldCheck, group: 'gov' },
  { id: 'orchestration', label: 'Orquestación', icon: Map, group: 'gov' },
  { id: 'decisions', label: 'Decisiones', icon: GitBranch, group: 'gov' },
  // Communication
  { id: 'chat', label: 'Chat', icon: MessageSquare, group: 'comm' },
  { id: 'notifications', label: 'Alertas', icon: Bell, group: 'comm' },
] as const;

export function AICommandCenterModule() {
  const { agents, queue, kpis, loading, refresh } = useAICommandCenter();

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            AI Command Center
            <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-[10px]">
              UNIFIED
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Centro de mando unificado — Agentes, Gobernanza, Observabilidad y Orquestación
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full bg-muted/50 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Core Operations */}
        <TabsContent value="live" className="mt-4">
          <LiveOperationsHub
            kpis={kpis}
            queue={queue}
            loading={loading}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <AgentCatalogPanel agents={agents} loading={loading} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="autonomous" className="mt-4">
          <AutonomousAgentsPanel />
        </TabsContent>

        <TabsContent value="copilot" className="mt-4">
          <PredictiveCopilotPanel />
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <VoiceInterfacePanel />
        </TabsContent>

        {/* Analytics & Monitoring */}
        <TabsContent value="observability" className="mt-4">
          <ObservabilityPanel />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <ERPAgentLeaderboard />
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <AICostEconomicsPanel />
        </TabsContent>

        {/* Governance & Orchestration */}
        <TabsContent value="governance" className="mt-4">
          <AIGovernancePanel agents={agents} loading={loading} />
        </TabsContent>

        <TabsContent value="orchestration" className="mt-4">
          <OrchestrationPanel agents={agents} loading={loading} />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <ERPAutonomousDecisionHistory />
        </TabsContent>

        {/* Communication */}
        <TabsContent value="chat" className="mt-4">
          <ERPAgentConversationHistory />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <AIAlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AICommandCenterModule;
