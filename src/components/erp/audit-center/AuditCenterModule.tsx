/**
 * AuditCenterModule — Módulo principal del Centro de Auditoría
 * Consolida auditoría interna, externa, compliance, blockchain y agentes IA
 */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, ShieldCheck, Globe, Scale, Link2, TrendingUp,
  Bot, MessageSquare,
} from 'lucide-react';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { useAuditAgents } from '@/hooks/erp/audit';
import { AuditDashboardHub } from './dashboard/AuditDashboardHub';
import { InternalAuditPanel } from './internal/InternalAuditPanel';
import { ExternalAuditPanel } from './external/ExternalAuditPanel';
import { ComplianceMatrixPanel } from './compliance/ComplianceMatrixPanel';
import { BlockchainTrailPanel } from './blockchain/BlockchainTrailPanel';
import { ImprovementsTracker } from './improvements/ImprovementsTracker';
import { AuditAgentsDashboard } from './agents/AuditAgentsDashboard';
import { AuditSuperSupervisorPanel } from './agents/AuditSuperSupervisorPanel';
import { AuditAgentChat } from './agents/AuditAgentChat';

export function AuditCenterModule() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { kpis, startAutoRefresh, stopAutoRefresh } = useUnifiedAudit();
  const { fetchAuditAgents, stats } = useAuditAgents();

  useEffect(() => {
    startAutoRefresh(90000);
    fetchAuditAgents();
    return () => stopAutoRefresh();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Auditoría</h2>
          <p className="text-muted-foreground text-sm">
            Auditoría unificada · Interna · Externa · Compliance · Agentes IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={kpis.criticalAlerts > 0 ? 'destructive' : 'secondary'}>
            {kpis.criticalAlerts} alertas críticas
          </Badge>
          <Badge variant="outline" className="bg-primary/5">
            {stats.activeAgents} agentes activos
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="internal" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Interna
          </TabsTrigger>
          <TabsTrigger value="external" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Externa
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5 text-xs">
            <Scale className="h-3.5 w-3.5" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="blockchain" className="gap-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" /> Blockchain
          </TabsTrigger>
          <TabsTrigger value="improvements" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Mejoras
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5" /> Agentes IA
            {stats.activeAgents > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.activeAgents}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="supersupervisor" className="gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5 text-amber-500" /> SuperSupervisor
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Chat IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><AuditDashboardHub /></TabsContent>
        <TabsContent value="internal"><InternalAuditPanel /></TabsContent>
        <TabsContent value="external"><ExternalAuditPanel /></TabsContent>
        <TabsContent value="compliance"><ComplianceMatrixPanel /></TabsContent>
        <TabsContent value="blockchain"><BlockchainTrailPanel /></TabsContent>
        <TabsContent value="improvements"><ImprovementsTracker /></TabsContent>
        <TabsContent value="agents"><AuditAgentsDashboard /></TabsContent>
        <TabsContent value="supersupervisor"><AuditSuperSupervisorPanel /></TabsContent>
        <TabsContent value="chat"><AuditAgentChat /></TabsContent>
      </Tabs>
    </div>
  );
}
