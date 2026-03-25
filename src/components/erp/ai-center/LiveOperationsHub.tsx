import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  RefreshCw,
  TrendingUp,
  Gauge,
  CircleDot,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SemaphoreIndicator } from './SemaphoreIndicator';
import { ApprovalQueue } from './ApprovalQueue';
import { AgentActivityFeed } from './AgentActivityFeed';
import { AdvancedAgentsDashboard } from '@/components/admin/agents/AdvancedAgentsDashboard';
import type { CommandCenterKPIs, ApprovalQueueItem } from '@/hooks/erp/ai-center/useAICommandCenter';

interface LiveOperationsHubProps {
  kpis: CommandCenterKPIs | null;
  queue: ApprovalQueueItem[];
  loading: boolean;
  onRefresh: () => void;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ icon: Icon, label, value, subtitle, color = 'text-primary' }: KPICardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2 rounded-lg bg-primary/10', color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveOperationsHub({ kpis, queue, loading, onRefresh }: LiveOperationsHubProps) {
  const [hubTab, setHubTab] = useState('operations');
  const redCount = queue.filter(q => q.semaphore === 'red').length;
  const yellowCount = queue.filter(q => q.semaphore === 'yellow').length;
  const greenCount = queue.filter(q => q.semaphore === 'green').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Live Operations Hub</h2>
            <p className="text-xs text-muted-foreground">
              Monitorización en tiempo real de todos los agentes IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Semaphore summary */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <SemaphoreIndicator color="red" size="sm" />
            <span className="text-xs font-medium">{redCount}</span>
            <SemaphoreIndicator color="yellow" size="sm" />
            <span className="text-xs font-medium">{yellowCount}</span>
            <SemaphoreIndicator color="green" size="sm" />
            <span className="text-xs font-medium">{greenCount}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <KPICard
            icon={Bot}
            label="Agentes Activos"
            value={kpis.activeAgents}
            subtitle={`${kpis.totalAgents} total · ${kpis.pausedAgents} pausados`}
          />
          <KPICard
            icon={AlertTriangle}
            label="Pendientes"
            value={kpis.pendingApprovals}
            subtitle="Cola de aprobación"
            color={kpis.pendingApprovals > 5 ? 'text-red-500' : 'text-yellow-500'}
          />
          <KPICard
            icon={Activity}
            label="Invocaciones Hoy"
            value={kpis.todayInvocations}
            subtitle={`${kpis.todayEscalations} escalaciones`}
          />
          <KPICard
            icon={TrendingUp}
            label="Confianza Media"
            value={`${kpis.avgConfidence}%`}
            subtitle="Último día"
            color={kpis.avgConfidence >= 80 ? 'text-emerald-500' : kpis.avgConfidence >= 60 ? 'text-yellow-500' : 'text-red-500'}
          />
          <KPICard
            icon={Gauge}
            label="Latencia Media"
            value={`${kpis.avgLatencyMs}ms`}
            subtitle="Tiempo de respuesta"
            color={kpis.avgLatencyMs < 2000 ? 'text-emerald-500' : 'text-yellow-500'}
          />
        </div>
      )}

      {/* Error agents alert */}
      {kpis && kpis.errorAgents > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <CircleDot className="h-5 w-5 text-red-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {kpis.errorAgents} agente{kpis.errorAgents > 1 ? 's' : ''} en estado de error
              </p>
              <p className="text-xs text-muted-foreground">Requiere atención inmediata</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tabs: Operations | Advanced Dashboard */}
      <Tabs value={hubTab} onValueChange={setHubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations" className="text-xs gap-1">
            <Zap className="h-3.5 w-3.5" />
            Operaciones
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs gap-1">
            <Brain className="h-3.5 w-3.5" />
            Dashboard Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-3">
          {/* Main content: Queue + Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ApprovalQueue items={queue} onRefresh={onRefresh} />
            <AgentActivityFeed />
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-3">
          <AdvancedAgentsDashboard />
        </TabsContent>
      </Tabs>
  );
}

export default LiveOperationsHub;
