/**
 * Dashboard Principal del CRM Modular
 * Conectado a datos reales via hooks
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Heart,
  Timer,
  Zap,
  Bot,
  Users,
  TrendingUp,
  Target,
  PhoneCall,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  UserCircle,
  Building2,
  Phone,
  CalendarDays,
  DollarSign,
  PieChart,
  Activity,
  Settings,
  Link2,
  Wrench,
  Brain,
  Loader2,
  Info
} from 'lucide-react';

// CRM Module Components
import { OmnichannelInbox, Conversation, Message } from '@/components/crm/omnichannel';
import { SentimentAnalysisDashboard } from '@/components/crm/sentiment';
import { MultichannelSLADashboard } from '@/components/crm/omnichannel';
import { StageFlowAutomation, StageFlow } from '@/components/crm/automation';
import { IntelligentLeadDistribution, Agent, DistributionRule, DistributionStats } from '@/components/crm/automation';
import { CRMAgentsPanel } from '@/components/crm/agents';
import { CRMWorkspaceSelector, CRMTeamsManager, CreateWorkspaceDialog } from '@/components/crm/config';
import { ContactsManager } from '@/components/crm/contacts';
import { DealsKanban } from '@/components/crm/deals';
import { ActivitiesManager } from '@/components/crm/activities';
import { CRMVoiceAssistant, PredictivePipelinePanel, RealtimeCollaborationPanel } from '@/components/crm/ai';
import { IntegrationHubDashboard } from '@/components/crm/integrations';
import { CRMAnalyticsDashboard } from '@/components/crm/analytics';
import { ModuleNavigationButton } from '@/components/shared/ModuleNavigationButton';
import { AIUnifiedDashboard } from '@/components/admin/ai-hybrid';
import { useCRMContext } from '@/hooks/crm/useCRMContext';
import { useCRMDeals } from '@/hooks/crm/useCRMDeals';
import { useOmnichannelHub } from '@/hooks/crm/omnichannel/useOmnichannelHub';
import { useSLAMetrics } from '@/hooks/crm/omnichannel/useSLAMetrics';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

const VALID_TABS = new Set([
  'overview','kanban','contacts','omnichannel','sentiment','sla',
  'automation','reports','agents','integrations','config','supervisor','utilities'
]);

export function CRMModularDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const { refreshWorkspaces } = useCRMContext();
  const { getPipelineStats } = useCRMDeals();
  const { conversations: omniConversations } = useOmnichannelHub();

  const stats = useMemo(() => getPipelineStats(), [getPipelineStats]);

  const totalDeals = stats.totalDeals;
  const totalValue = stats.totalValue;
  const wonDeals = stats.wonDeals;
  const conversionRate = stats.conversionRate;

  // Omnichannel quick stats
  const openConvs = useMemo(() => omniConversations.filter(c => c.status === 'open').length, [omniConversations]);
  const unassignedConvs = useMemo(() => omniConversations.filter(c => !c.assigned_agent_id && c.status === 'open').length, [omniConversations]);
  const slaRiskConvs = useMemo(() => omniConversations.filter(c => c.sla_breached).length, [omniConversations]);

  const sentimentStats = useMemo(() => {
    const withSentiment = omniConversations.filter(c => c.sentiment);
    const total = withSentiment.length || 1;
    const positive = Math.round(withSentiment.filter(c => c.sentiment === 'positive').length / total * 100);
    const negative = Math.round(withSentiment.filter(c => c.sentiment === 'negative').length / total * 100);
    const neutral = 100 - positive - negative;
    return { positive, neutral, negative };
  }, [omniConversations]);

  const modules = [
    { id: 'kanban', name: 'Pipeline', icon: Kanban, color: 'bg-blue-500', installed: true },
    { id: 'contacts', name: 'Contactos', icon: UserCircle, color: 'bg-indigo-500', installed: true },
    { id: 'omnichannel', name: 'Inbox', icon: MessageSquare, color: 'bg-green-500', installed: true },
    { id: 'sentiment', name: 'Sentimiento', icon: Heart, color: 'bg-pink-500', installed: true },
    { id: 'sla', name: 'SLAs', icon: Timer, color: 'bg-amber-500', installed: true },
    { id: 'automation', name: 'Automatización', icon: Zap, color: 'bg-purple-500', installed: true },
    { id: 'reports', name: 'Reportes', icon: BarChart3, color: 'bg-orange-500', installed: true },
    { id: 'agents', name: 'Agentes IA', icon: Bot, color: 'bg-cyan-500', installed: true },
    { id: 'integrations', name: 'Integraciones', icon: Link2, color: 'bg-teal-500', installed: true },
    { id: 'config', name: 'Configuración', icon: Settings, color: 'bg-slate-500', installed: true },
  ];

  return (
    <div className="space-y-6">
      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog 
        open={showCreateWorkspace} 
        onOpenChange={setShowCreateWorkspace}
        onSuccess={refreshWorkspaces}
      />
      
      {/* Header with Workspace Selector + Navigation to ERP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ModuleNavigationButton targetModule="erp" size="sm" />
        </div>
        <CRMWorkspaceSelector 
          showCreateButton 
          onCreateClick={() => setShowCreateWorkspace(true)}
        />
      </div>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Contactos
          </TabsTrigger>
          <TabsTrigger value="omnichannel" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="gap-2">
            <Heart className="h-4 w-4" />
            Sentimiento
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Timer className="h-4 w-4" />
            SLAs
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="h-4 w-4" />
            Automatización
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agentes IA
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="supervisor" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Supervisor
          </TabsTrigger>
          <TabsTrigger value="utilities" className="gap-2">
            <Wrench className="h-4 w-4" />
            Utilidades
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Oportunidades</p>
                    <p className="text-2xl font-bold">{totalDeals}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pipeline</p>
                    <p className="text-2xl font-bold">${(totalValue / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cerrados</p>
                    <p className="text-2xl font-bold">{wonDeals}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversión</p>
                    <p className="text-2xl font-bold">{conversionRate.toFixed(0)}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <ArrowUpRight className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modules Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Módulos CRM</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card 
                    key={module.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow",
                      module.installed && "ring-1 ring-green-500/30"
                    )}
                    onClick={() => setActiveTab(module.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={cn("w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center", module.color)}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="font-medium text-sm">{module.name}</p>
                      <Badge variant="default" className="mt-2 text-xs bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* AI Panels - 2026 Features */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <CRMVoiceAssistant />
            </div>
            <div className="lg:col-span-1">
              <PredictivePipelinePanel />
            </div>
            <div className="lg:col-span-1">
              <RealtimeCollaborationPanel />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Inbox Omnicanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Conversaciones abiertas</span>
                    <Badge variant="secondary">{openConvs}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                    <Badge variant="destructive">{unassignedConvs}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SLA en riesgo</span>
                    <Badge variant="outline" className="text-amber-600">{slaRiskConvs}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Sentimiento General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Positivo</span>
                    <Badge className="bg-green-500">{sentimentStats.positive}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Neutral</span>
                    <Badge variant="secondary">{sentimentStats.neutral}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Negativo</span>
                    <Badge variant="destructive">{sentimentStats.negative}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Kanban Tab - Deals Pipeline */}
        <TabsContent value="kanban">
          <DealsKanban />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <ContactsManager />
        </TabsContent>

        {/* Omnichannel Tab */}
        <TabsContent value="omnichannel">
          <OmnichannelInboxWrapper />
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment">
          <SentimentTabContent />
        </TabsContent>

        {/* SLA Tab */}
        <TabsContent value="sla">
          <SLATabContent />
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <AutomationTabContent />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsTabContent />
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <CRMAgentsPanel />
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <CRMTeamsManager />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración del Workspace
                </CardTitle>
                <CardDescription>
                  Ajustes generales del CRM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Notificaciones</p>
                    <p className="text-sm text-muted-foreground">Alertas de nuevos leads</p>
                  </div>
                  <Badge variant="secondary">Activado</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Auto-asignación</p>
                    <p className="text-sm text-muted-foreground">Distribuir leads automáticamente</p>
                  </div>
                  <Badge variant="secondary">Activado</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">SLA por defecto</p>
                    <p className="text-sm text-muted-foreground">Tiempo de respuesta: 30min</p>
                  </div>
                  <Badge>30 min</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Hub Tab */}
        <TabsContent value="integrations">
          <IntegrationHubDashboard />
        </TabsContent>

        {/* Supervisor Dashboard Tab - Redirects to AI Command Center */}
        <TabsContent value="supervisor">
          <Card className="max-w-lg mx-auto mt-8">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Supervisor de Agentes IA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  El supervisor centralizado ha sido trasladado al AI Command Center del ERP.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/obelixia-admin/erp?tab=ai-center'}>
                Ir al AI Command Center
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilities Tab - AI Hybrid */}
        <TabsContent value="utilities">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Utilidades del Sistema</h2>
            </div>
            
            <Tabs defaultValue="ai-hybrid" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-1">
                <TabsTrigger value="ai-hybrid" className="gap-2">
                  <Brain className="h-4 w-4" />
                  IA Híbrida Universal
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ai-hybrid">
                <AIUnifiedDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Omnichannel Inbox Wrapper (datos reales) ===
function OmnichannelInboxWrapper() {
  const {
    conversations,
    messages,
    currentConversation,
    selectConversation,
    sendMessage,
    assignConversation,
    changeStatus,
    addTag,
    isLoading
  } = useOmnichannelHub();

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[600px]">
      <OmnichannelInbox 
        conversations={conversations.map(c => ({
          id: c.id,
          contact: {
            id: c.contact_id || c.id,
            name: c.contact_name || 'Desconocido',
            phone: c.contact_phone,
            email: c.contact_email,
          },
          channel: c.channel as any,
          status: c.status as any,
          priority: c.priority as any,
          lastMessage: c.last_message_preview ? {
            content: c.last_message_preview,
            timestamp: c.last_message_at || c.updated_at,
            isFromContact: c.last_message_direction === 'inbound',
          } : undefined,
          unreadCount: c.unread_count || 0,
        }))}
        messages={messages.map(m => ({
          id: m.id,
          conversationId: m.conversation_id,
          content: m.content,
          timestamp: m.created_at,
          isFromContact: m.direction === 'inbound',
          status: m.status as any,
        }))}
        currentConversation={currentConversation ? {
          id: currentConversation.id,
          contact: {
            id: currentConversation.contact_id || currentConversation.id,
            name: currentConversation.contact_name || 'Desconocido',
          },
          channel: currentConversation.channel as any,
          status: currentConversation.status as any,
          priority: currentConversation.priority as any,
          unreadCount: currentConversation.unread_count || 0,
        } : undefined}
        onSelectConversation={(c) => {
          const original = conversations.find(conv => conv.id === c.id);
          if (original) selectConversation(original);
        }}
        onSendMessage={(id, content) => sendMessage(id, content)}
        onAssign={(convId, agentId) => assignConversation(convId, agentId)}
        onUpdateStatus={(id, status) => changeStatus(id, status as any)}
        onAddTag={(id, tag) => addTag(id, tag)}
      />
    </div>
  );
}

// === SLA Tab Content (datos reales) ===
function SLATabContent() {
  const { slaPolicies, agentMetrics, channelMetrics, globalMetrics, isLoading } = useSLAMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <MultichannelSLADashboard 
      slaConfigs={slaPolicies.map(p => ({
        id: p.id,
        name: p.name,
        channel: p.channel as any,
        firstResponseMinutes: p.first_response_minutes,
        resolutionMinutes: p.resolution_minutes,
        priority: p.priority as any,
      }))}
      agentMetrics={agentMetrics}
      channelMetrics={channelMetrics}
      globalMetrics={globalMetrics || { totalOpen: 0, totalResolved: 0, avgWaitTime: 0, avgResponseTime: 0, slaCompliance: 0, csat: 0 }}
    />
  );
}

// === Sentiment Tab Content (datos reales) ===
function SentimentTabContent() {
  const { conversations, isLoading } = useOmnichannelHub();

  const sentimentData = useMemo(() => 
    conversations
      .filter(c => c.sentiment)
      .map(c => ({
        id: c.id,
        sourceType: 'message' as const,
        sourceId: c.id,
        content: c.last_message_preview || '',
        sentiment: (c.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
        sentimentScore: c.sentiment_score || 0,
        emotions: [] as { emotion: string; intensity: number }[],
        keyPhrases: [] as string[],
        topics: [] as string[],
        actionRequired: c.priority === 'urgent' || c.priority === 'high',
        analyzedAt: c.updated_at,
      })),
    [conversations]
  );

  const trends = useMemo(() => {
    const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const total = Math.max(sentimentData.length, 1);
    const positiveCount = sentimentData.filter(s => s.sentiment === 'positive').length;
    const negativeCount = sentimentData.filter(s => s.sentiment === 'negative').length;
    const neutralCount = total - positiveCount - negativeCount;
    return days.map(d => ({
      date: d,
      positive: Math.round(positiveCount / total * 100),
      neutral: Math.round(neutralCount / total * 100),
      negative: Math.round(negativeCount / total * 100),
      avgScore: 50,
    }));
  }, [sentimentData]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return <SentimentAnalysisDashboard sentimentData={sentimentData} trends={trends} />;
}

// === Automation Tab Content ===
function AutomationTabContent() {
  const [flows, setFlows] = useState<StageFlow[]>([
    { id: '1', name: 'Bienvenida', fromStage: 'new', toStage: 'contacted', actions: [{ id: 'a1', type: 'whatsapp', config: {} }], conditions: [], isActive: true, executionCount: 145 },
  ]);
  const stages = [
    { id: 'new', name: 'Nuevos', color: '#6366f1' },
    { id: 'contacted', name: 'Contactados', color: '#f59e0b' },
    { id: 'qualified', name: 'Calificados', color: '#10b981' },
  ];

  return (
    <Tabs defaultValue="flows" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="flows" className="gap-2">
          <Zap className="h-4 w-4" />
          Flujos
        </TabsTrigger>
        <TabsTrigger value="distribution" className="gap-2">
          <Users className="h-4 w-4" />
          Distribución
        </TabsTrigger>
      </TabsList>
      <TabsContent value="flows">
        <StageFlowAutomation
          stages={stages}
          flows={flows}
          onCreateFlow={(f) => setFlows(prev => [...prev, { ...f, id: `f${Date.now()}`, executionCount: 0 }])}
          onToggleFlow={(id, active) => setFlows(prev => prev.map(f => f.id === id ? { ...f, isActive: active } : f))}
          onDeleteFlow={(id) => setFlows(prev => prev.filter(f => f.id !== id))}
        />
      </TabsContent>
      <TabsContent value="distribution">
        <LeadDistributionWrapper />
      </TabsContent>
    </Tabs>
  );
}

function LeadDistributionWrapper() {
  const [rules, setRules] = useState<DistributionRule[]>([
    { id: 'r1', name: 'Balance', type: 'workload', weight: 40, isActive: true },
  ]);
  const agents: Agent[] = [
    { id: 'a1', name: 'Juan Pérez', activeLeads: 12, maxCapacity: 20, specializations: ['E-commerce'], performanceScore: 92, avgResponseTime: 4, conversionRate: 28, isAvailable: true, currentWorkload: 60 },
  ];
  const stats: DistributionStats = { totalDistributed: 1247, avgAssignmentTime: 2.3, balanceScore: 87, performanceImpact: 12 };

  return (
    <IntelligentLeadDistribution
      agents={agents}
      rules={rules}
      stats={stats}
      onUpdateRule={(id, u) => setRules(prev => prev.map(r => r.id === id ? { ...r, ...u } : r))}
      onUpdateAgentCapacity={() => {}}
      onDistributeNow={() => {}}
    />
  );
}

// === Reports Tab ===
function ReportsTabContent() {
  return <CRMAnalyticsDashboard />;
}

export default CRMModularDashboard;
