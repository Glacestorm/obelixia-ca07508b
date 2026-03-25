import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Bot, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveOperationsHub } from './LiveOperationsHub';
import { AgentCatalogPanel } from './AgentCatalogPanel';
import { AINavigationMenu } from './AINavigationMenu';
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
const AdvancedAgentsDashboard = lazy(() => import('@/components/admin/agents/AdvancedAgentsDashboard').then(m => ({ default: m.AdvancedAgentsDashboard })));
const ERPModuleAgentsPanel = lazy(() => import('@/components/admin/agents/ERPModuleAgentsPanel').then(m => ({ default: m.ERPModuleAgentsPanel })));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// All valid tab IDs for the module
const VALID_TABS = new Set([
  'live', 'autonomous', 'copilot', 'voice',
  'catalog', 'ranking', 'decisions', 'advanced-config', 'erp-agents',
  'observability', 'chat',
  'costs',
  'governance', 'orchestration', 'notifications',
]);

export function AICommandCenterModule() {
  const { agents, queue, kpis, loading, refresh } = useAICommandCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // URL param sync for active tab
  const rawTab = searchParams.get('tab') || 'live';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'live';
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  // Badge counts for urgent tabs
  const pendingApprovals = kpis?.pendingApprovals || 0;
  const errorAgents = kpis?.errorAgents || 0;

  const tabBadges: Record<string, number> = useMemo(() => ({
    live: pendingApprovals,
    catalog: errorAgents,
    notifications: pendingApprovals > 3 ? pendingApprovals : 0,
  }), [pendingApprovals, errorAgents]);

  // Global search results
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

  // Render the active panel
  const renderPanel = () => {
    switch (activeTab) {
      case 'live':
        return <LiveOperationsHub kpis={kpis} queue={queue} loading={loading} onRefresh={refresh} />;
      case 'catalog':
        return <AgentCatalogPanel agents={agents} loading={loading} onRefresh={refresh} />;
      case 'autonomous':
        return <Suspense fallback={<TabSkeleton />}><AutonomousAgentsPanel /></Suspense>;
      case 'copilot':
        return <Suspense fallback={<TabSkeleton />}><PredictiveCopilotPanel /></Suspense>;
      case 'voice':
        return <Suspense fallback={<TabSkeleton />}><VoiceInterfacePanel /></Suspense>;
      case 'observability':
        return <Suspense fallback={<TabSkeleton />}><ObservabilityPanel /></Suspense>;
      case 'ranking':
        return <Suspense fallback={<TabSkeleton />}><ERPAgentLeaderboard /></Suspense>;
      case 'costs':
        return <Suspense fallback={<TabSkeleton />}><AICostEconomicsPanel /></Suspense>;
      case 'governance':
        return <Suspense fallback={<TabSkeleton />}><AIGovernancePanel agents={agents} loading={loading} /></Suspense>;
      case 'orchestration':
        return <Suspense fallback={<TabSkeleton />}><OrchestrationPanel agents={agents} loading={loading} /></Suspense>;
      case 'decisions':
        return <Suspense fallback={<TabSkeleton />}><ERPAutonomousDecisionHistory /></Suspense>;
      case 'advanced-config':
        return <Suspense fallback={<TabSkeleton />}><AdvancedAgentsDashboard /></Suspense>;
      case 'erp-agents':
        return <Suspense fallback={<TabSkeleton />}><ERPModuleAgentsPanel /></Suspense>;
      case 'chat':
        return <Suspense fallback={<TabSkeleton />}><ERPAgentConversationHistory /></Suspense>;
      case 'notifications':
        return <Suspense fallback={<TabSkeleton />}><AIAlertsPanel /></Suspense>;
      default:
        return <LiveOperationsHub kpis={kpis} queue={queue} loading={loading} onRefresh={refresh} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              AI Command Center
              <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                UNIFIED
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Centro de mando unificado — Agentes, Gobernanza, Observabilidad y Orquestación
            </p>
          </div>
        </div>

        {/* Search toggle */}
        <Button
          variant={showSearch ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setGlobalSearch(''); }}
        >
          {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Global search bar */}
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
                      <Zap className="h-3.5 w-3.5 text-warning" />
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

      {/* Mega-menu navigation (same pattern as HR module) */}
      <AINavigationMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={tabBadges}
      />

      {/* Active panel content */}
      <div className="mt-4">
        {renderPanel()}
      </div>
    </div>
  );
}

export default AICommandCenterModule;
