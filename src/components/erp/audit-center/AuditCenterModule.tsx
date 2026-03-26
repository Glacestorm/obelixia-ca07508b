/**
 * AuditCenterModule — Módulo principal del Centro de Auditoría
 * Módulo de primer nivel con mega-menú, siguiendo el patrón del AI Command Center
 */
import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { useAuditAgents } from '@/hooks/erp/audit';
import { AuditNavigationMenu } from './AuditNavigationMenu';
import { AuditDashboardHub } from './dashboard/AuditDashboardHub';

// Lazy-loaded panels
const InternalAuditPanel = lazy(() => import('./internal/InternalAuditPanel').then(m => ({ default: m.InternalAuditPanel })));
const ExternalAuditPanel = lazy(() => import('./external/ExternalAuditPanel').then(m => ({ default: m.ExternalAuditPanel })));
const ComplianceMatrixPanel = lazy(() => import('./compliance/ComplianceMatrixPanel').then(m => ({ default: m.ComplianceMatrixPanel })));
const BlockchainTrailPanel = lazy(() => import('./blockchain/BlockchainTrailPanel').then(m => ({ default: m.BlockchainTrailPanel })));
const ImprovementsTracker = lazy(() => import('./improvements/ImprovementsTracker').then(m => ({ default: m.ImprovementsTracker })));
const AuditAgentsDashboard = lazy(() => import('./agents/AuditAgentsDashboard').then(m => ({ default: m.AuditAgentsDashboard })));
const AuditSuperSupervisorPanel = lazy(() => import('./agents/AuditSuperSupervisorPanel').then(m => ({ default: m.AuditSuperSupervisorPanel })));
const AuditAgentChat = lazy(() => import('./agents/AuditAgentChat').then(m => ({ default: m.AuditAgentChat })));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const VALID_TABS = new Set([
  'dashboard', 'internal', 'external', 'compliance', 'blockchain',
  'improvements', 'agents', 'activity', 'supersupervisor', 'chat',
]);

export function AuditCenterModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { kpis, startAutoRefresh, stopAutoRefresh } = useUnifiedAudit();
  const { fetchAuditAgents, stats } = useAuditAgents();

  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'dashboard';
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    startAutoRefresh(90000);
    fetchAuditAgents();
    return () => stopAutoRefresh();
  }, []);

  const tabBadges: Record<string, number> = {
    critical: kpis.criticalAlerts,
    agents: stats.activeAgents,
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AuditDashboardHub />;
      case 'internal':
        return <Suspense fallback={<TabSkeleton />}><InternalAuditPanel /></Suspense>;
      case 'external':
        return <Suspense fallback={<TabSkeleton />}><ExternalAuditPanel /></Suspense>;
      case 'compliance':
        return <Suspense fallback={<TabSkeleton />}><ComplianceMatrixPanel /></Suspense>;
      case 'blockchain':
        return <Suspense fallback={<TabSkeleton />}><BlockchainTrailPanel /></Suspense>;
      case 'improvements':
        return <Suspense fallback={<TabSkeleton />}><ImprovementsTracker /></Suspense>;
      case 'agents':
        return <Suspense fallback={<TabSkeleton />}><AuditAgentsDashboard initialView="hierarchy" /></Suspense>;
      case 'activity':
        return <Suspense fallback={<TabSkeleton />}><AuditAgentsDashboard initialView="activity" /></Suspense>;
      case 'supersupervisor':
        return <Suspense fallback={<TabSkeleton />}><AuditSuperSupervisorPanel /></Suspense>;
      case 'chat':
        return <Suspense fallback={<TabSkeleton />}><AuditAgentChat /></Suspense>;
      default:
        return <AuditDashboardHub />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Centro de Auditoría
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                UNIFIED
              </Badge>
              {kpis.criticalAlerts > 0 && (
                <Badge variant="destructive" className="text-[10px] animate-pulse">
                  {kpis.criticalAlerts} alertas críticas
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Auditoría unificada — Interna · Externa · Compliance · 11 Agentes IA · SuperSupervisor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {stats.activeAgents} agentes
          </Badge>
          <Button
            variant={showSearch ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setGlobalSearch(''); }}
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Global search bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar eventos, agentes, alertas..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Mega-menu navigation */}
      <AuditNavigationMenu
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

export default AuditCenterModule;
