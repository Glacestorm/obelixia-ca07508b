import { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  BookOpen,
  LineChart,
  Map,
  DollarSign,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveOperationsHub } from './LiveOperationsHub';
import { AgentCatalogPanel } from './AgentCatalogPanel';
import { ObservabilityPanel } from './ObservabilityPanel';
import { AICostEconomicsPanel } from './AICostEconomicsPanel';
import { AIGovernancePanel } from './AIGovernancePanel';
import { useAICommandCenter } from '@/hooks/erp/ai-center/useAICommandCenter';

// Future phase placeholders
const PlaceholderPanel = ({ phase, title }: { phase: string; title: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-4 rounded-full bg-muted mb-4">
      <Zap className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1">{phase} — Próximamente</p>
    <Badge variant="outline" className="mt-3">En desarrollo</Badge>
  </div>
);

const tabs = [
  { id: 'live', label: 'Live Hub', icon: Zap, phase: 1 },
  { id: 'catalog', label: 'Catálogo', icon: BookOpen, phase: 2 },
  { id: 'observability', label: 'Observabilidad', icon: LineChart, phase: 3 },
  { id: 'costs', label: 'Economía', icon: DollarSign, phase: 4 },
  { id: 'governance', label: 'Gobernanza', icon: ShieldCheck, phase: 5, active: true },
  { id: 'orchestration', label: 'Orquestación', icon: Map, phase: 6 },
  { id: 'notifications', label: 'Alertas', icon: Bell, phase: 7 },
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
              LIVE
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Centro de mando unificado para todos los agentes de IA del ERP
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="flex w-full overflow-x-auto bg-muted/50 p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.phase <= 4 || (tab as any).active;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!isActive}
                className={cn(
                  'flex items-center gap-1.5 text-xs whitespace-nowrap',
                  !isActive && 'opacity-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {!isActive && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1 ml-1">F{tab.phase}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

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

        <TabsContent value="observability" className="mt-4">
          <ObservabilityPanel />
        </TabsContent>
        <TabsContent value="costs" className="mt-4">
          <AICostEconomicsPanel />
        </TabsContent>
        <TabsContent value="governance" className="mt-4">
          <AIGovernancePanel agents={agents} loading={loading} />
        </TabsContent>
        <TabsContent value="orchestration">
          <PlaceholderPanel phase="Fase 6" title="Orquestación y Simulación" />
        </TabsContent>
        <TabsContent value="notifications">
          <PlaceholderPanel phase="Fase 7" title="Notificaciones y Alertas" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AICommandCenterModule;
