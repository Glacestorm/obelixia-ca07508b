import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveOperationsHub } from './LiveOperationsHub';
import { AgentCatalogPanel } from './AgentCatalogPanel';
import { useAICommandCenter } from '@/hooks/erp/ai-center/useAICommandCenter';
import { Button } from '@/components/ui/button';

// Lazy-loaded panels (B1: reduce initial bundle)
const ObservabilityPanel = lazy(() => import('./ObservabilityPanel'));
const AICostEconomicsPanel = lazy(() => import('./AICostEconomicsPanel'));
const AIGovernancePanel = lazy(() => import('./AIGovernancePanel'));
const OrchestrationPanel = lazy(() => import('./OrchestrationPanel'));
const AIAlertsPanel = lazy(() => import('./AIAlertsPanel'));
const AutonomousAgentsPanel = lazy(() => import('@/components/admin/ai-agents/AutonomousAgentsPanel').then(m => ({ default: m.AutonomousAgentsPanel })));
const PredictiveCopilotPanel = lazy(() => import('@/components/admin/ai-agents/PredictiveCopilotPanel').then(m => ({ default: m.PredictiveCopilotPanel })));
const VoiceInterfacePanel = lazy(() => import('@/components/admin/ai-agents/VoiceInterfacePanel').then(m => ({ default: m.VoiceInterfacePanel })));
const ERPAgentLeaderboard = lazy(() => import('@/components/admin/agents/ERPAgentLeaderboard').then(m => ({ default: m.ERPAgentLeaderboard })));
const ERPAutonomousDecisionHistory = lazy(() => import('@/components/admin/agents/ERPAutonomousDecisionHistory').then(m => ({ default: m.ERPAutonomousDecisionHistory })));
const ERPAgentConversationHistory = lazy(() => import('@/components/admin/agents/ERPAgentConversationHistory').then(m => ({ default: m.ERPAgentConversationHistory })));

// Tab group definitions (A1: 5 logical groups)
const tabGroups = [
  {
    id: 'ops',
    label: 'Operaciones',
    tabs: [
      { id: 'live', label: 'Live Hub', icon: Zap },
      { id: 'catalog', label: 'Catálogo', icon: BookOpen },
      { id: 'autonomous', label: 'Autónomos', icon: Bot },
      { id: 'copilot', label: 'Copilot', icon: Sparkles },
      { id: 'voice', label: 'Voz', icon: Mic },
    ],
  },
  {
    id: 'analytics',
    label: 'Analítica',
    tabs: [
      { id: 'observability', label: 'Observabilidad', icon: LineChart },
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'costs', label: 'Economía', icon: DollarSign },
    ],
  },
  {
    id: 'gov',
    label: 'Gobernanza',
    tabs: [
      { id: 'governance', label: 'Gobernanza', icon: ShieldCheck },
      { id: 'orchestration', label: 'Orquestación', icon: Map },
      { id: 'decisions', label: 'Decisiones', icon: GitBranch },
    ],
  },
  {
    id: 'comm',
    label: 'Comunicación',
    tabs: [
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'notifications', label: 'Alertas', icon: Bell },
    ],
  },
] as const;

const allTabs = tabGroups.flatMap(g => g.tabs);

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function AICommandCenterModule() {
  const { agents, queue, kpis, loading, refresh } = useAICommandCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // A2: URL param sync for active tab
  const activeTab = searchParams.get('tab') || 'live';
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  // A4: Badge counts for urgent tabs
  const pendingApprovals = kpis?.pendingApprovals || 0;
  const errorAgents = kpis?.errorAgents || 0;

  const tabBadges: Record<string, number> = useMemo(() => ({
    live: pendingApprovals,
    catalog: errorAgents,
    notifications: pendingApprovals > 3 ? pendingApprovals : 0,
  }), [pendingApprovals, errorAgents]);

  // A3: Global search results
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const q = globalSearch.toLowerCase();
    const matchedAgents = agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    ).slice(0, 5);
    const matchedQueue = queue.filter(item =>
      item.agent_code.toLowerCase().includes(q) ||
      (item.action_required || '').toLowerCase().includes(q) ||
      item.domain.toLowerCase().includes(q)
    ).slice(0, 5);
    return { agents: matchedAgents, queue: matchedQueue };
  }, [globalSearch, agents, queue]);

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center justify-between gap-3">
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

        {/* A3: Search toggle */}
        <Button
          variant={showSearch ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setGlobalSearch(''); }}
        >
          {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* A3: Global search bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar agentes, tareas, alertas..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="pl-9"
          />
          {searchResults && (searchResults.agents.length > 0 || searchResults.queue.length > 0) && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg p-2 space-y-2 max-h-72 overflow-auto">
              {searchResults.agents.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 mb-1">Agentes</p>
                  {searchResults.agents.map(a => (
                    <button
                      key={a.id}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                      onClick={() => { setActiveTab('catalog'); setGlobalSearch(''); setShowSearch(false); }}
                    >
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono ml-auto">{a.code}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.queue.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 mb-1">Cola de aprobación</p>
                  {searchResults.queue.map(item => (
                    <button
                      key={item.id}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                      onClick={() => { setActiveTab('live'); setGlobalSearch(''); setShowSearch(false); }}
                    >
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="truncate">{item.agent_code} — {item.task_type}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{item.domain}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {searchResults && searchResults.agents.length === 0 && searchResults.queue.length === 0 && globalSearch.trim() && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
              Sin resultados para "{globalSearch}"
            </div>
          )}
        </div>
      )}

      {/* Tabs with grouped navigation (A1) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full bg-muted/50 p-1 rounded-xl gap-0.5">
            {tabGroups.map((group, gi) => (
              <div key={group.id} className="contents">
                {gi > 0 && (
                  <div className="w-px h-6 bg-border/50 mx-0.5 self-center shrink-0" />
                )}
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const badgeCount = tabBadges[tab.id] || 0;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 text-xs whitespace-nowrap relative"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {badgeCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-[16px] px-1 text-[9px] font-bold ml-0.5 animate-pulse"
                        >
                          {badgeCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </div>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Group labels under tab bar */}
        <div className="hidden md:flex items-center gap-0 text-[9px] text-muted-foreground/60 mt-0.5 px-1">
          {tabGroups.map((group, gi) => (
            <div key={group.id} className="flex items-center">
              {gi > 0 && <div className="w-px h-3 bg-transparent mx-1" />}
              <span style={{ width: `${group.tabs.length * 90}px` }} className="text-center truncate">
                {group.label}
              </span>
            </div>
          ))}
        </div>

        {/* Core Operations — eager load only Live Hub and Catalog */}
        <TabsContent value="live" className="mt-4">
          <LiveOperationsHub kpis={kpis} queue={queue} loading={loading} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <AgentCatalogPanel agents={agents} loading={loading} onRefresh={refresh} />
        </TabsContent>

        {/* All other tabs — lazy loaded (B1) */}
        <TabsContent value="autonomous" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AutonomousAgentsPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="copilot" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <PredictiveCopilotPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <VoiceInterfacePanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="observability" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ObservabilityPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ERPAgentLeaderboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AICostEconomicsPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AIGovernancePanel agents={agents} loading={loading} />
          </Suspense>
        </TabsContent>

        <TabsContent value="orchestration" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <OrchestrationPanel agents={agents} loading={loading} />
          </Suspense>
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ERPAutonomousDecisionHistory />
          </Suspense>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ERPAgentConversationHistory />
          </Suspense>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AIAlertsPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AICommandCenterModule;
