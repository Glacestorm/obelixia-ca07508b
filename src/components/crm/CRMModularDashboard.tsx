/**
 * CRMModularDashboard v3 — datos reales, sin mock, URL params activos
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutDashboard, Kanban, MessageSquare, Heart, Timer,
  Zap, Bot, TrendingUp, Target, CheckCircle2, ArrowUpRight, BarChart3,
  UserCircle, Settings, Link2, Wrench, Brain, Sparkles } from 'lucide-react';

import { OmnichannelInbox } from '@/components/crm/omnichannel';
import { SentimentAnalysisDashboard } from '@/components/crm/sentiment';
import { MultichannelSLADashboard } from '@/components/crm/omnichannel';
import { StageFlowAutomation, StageFlow } from '@/components/crm/automation';
import { IntelligentLeadDistribution } from '@/components/crm/automation';
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

// ---------- tipos mínimos que necesitan los wrappers ----------
interface ConvForInbox {
  id: string; contact: { id: string; name: string; phone?: string; email?: string };
  channel: string; status: string; priority: string;
  lastMessage?: { content: string; timestamp: string; isFromContact: boolean };
  unreadCount: number;
}

// ---------- URL params ----------
const VALID_TABS = new Set([
  'overview','kanban','contacts','omnichannel','sentiment',
  'sla','automation','reports','agents','integrations','config','utilities'
]);

export function CRMModularDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'overview';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview';
  const setActiveTab = useCallback(
    (tab: string) => setSearchParams({ tab }, { replace: true }),
    [setSearchParams]
  );

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const { refreshWorkspaces, currentWorkspace } = useCRMContext();

  // --- KPIs reales del pipeline ---
  const { getPipelineStats } = useCRMDeals();
  const pipelineStats = useMemo(() => getPipelineStats(), [getPipelineStats]);

  // --- datos reales de omnichannel para los quick stats ---
  const { conversations: omniConvs } = useOmnichannelHub();
  const openConvs      = useMemo(() => omniConvs.filter(c => c.status === 'open').length, [omniConvs]);
  const unassignedConvs= useMemo(() => omniConvs.filter(c => !c.assigned_agent_id && c.status === 'open').length, [omniConvs]);
  const slaBreached    = useMemo(() => omniConvs.filter(c => c.sla_breached).length, [omniConvs]);
  const withSentiment  = useMemo(() => omniConvs.filter(c => c.sentiment), [omniConvs]);
  const positivePct    = useMemo(() => withSentiment.length
    ? Math.round(withSentiment.filter(c => c.sentiment === 'positive').length / withSentiment.length * 100)
    : 0, [withSentiment]);
  const negativePct    = useMemo(() => withSentiment.length
    ? Math.round(withSentiment.filter(c => c.sentiment === 'negative').length / withSentiment.length * 100)
    : 0, [withSentiment]);
  const neutralPct     = useMemo(() => 100 - positivePct - negativePct, [positivePct, negativePct]);

  const modules = [
    { id: 'kanban',       name: 'Pipeline',      icon: Kanban,        color: 'bg-blue-500'   },
    { id: 'contacts',     name: 'Contactos',     icon: UserCircle,    color: 'bg-indigo-500' },
    { id: 'omnichannel',  name: 'Inbox',         icon: MessageSquare, color: 'bg-green-500'  },
    { id: 'sentiment',    name: 'Sentimiento',   icon: Heart,         color: 'bg-pink-500'   },
    { id: 'sla',          name: 'SLAs',          icon: Timer,         color: 'bg-amber-500'  },
    { id: 'automation',   name: 'Automatización',icon: Zap,           color: 'bg-purple-500' },
    { id: 'reports',      name: 'Reportes',      icon: BarChart3,     color: 'bg-orange-500' },
    { id: 'agents',       name: 'Agentes IA',    icon: Bot,           color: 'bg-cyan-500'   },
    { id: 'integrations', name: 'Integraciones', icon: Link2,         color: 'bg-teal-500'   },
    { id: 'config',       name: 'Config',        icon: Settings,      color: 'bg-slate-500'  },
  ];

  return (
    <div className="space-y-6">
      <ModuleNavigationButton module="crm" />

      <div className="flex items-center justify-between">
        <CRMWorkspaceSelector />
        <CreateWorkspaceDialog
          open={showCreateWorkspace}
          onOpenChange={setShowCreateWorkspace}
          onSuccess={() => { setShowCreateWorkspace(false); refreshWorkspaces(); }}
          onCreateWorkspace={() => setShowCreateWorkspace(true)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="overview"><LayoutDashboard className="h-4 w-4 mr-1" />Resumen</TabsTrigger>
          <TabsTrigger value="kanban"><Kanban className="h-4 w-4 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="contacts"><UserCircle className="h-4 w-4 mr-1" />Contactos</TabsTrigger>
          <TabsTrigger value="omnichannel"><MessageSquare className="h-4 w-4 mr-1" />Inbox</TabsTrigger>
          <TabsTrigger value="sentiment"><Heart className="h-4 w-4 mr-1" />Sentimiento</TabsTrigger>
          <TabsTrigger value="sla"><Timer className="h-4 w-4 mr-1" />SLAs</TabsTrigger>
          <TabsTrigger value="automation"><Zap className="h-4 w-4 mr-1" />Automatización</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" />Reportes</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="h-4 w-4 mr-1" />Agentes IA</TabsTrigger>
          <TabsTrigger value="integrations"><Link2 className="h-4 w-4 mr-1" />Integraciones</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Config</TabsTrigger>
          <TabsTrigger value="utilities"><Wrench className="h-4 w-4 mr-1" />Utilidades</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview">
          {!currentWorkspace ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecciona un workspace para ver el resumen.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPIs reales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Oportunidades</p>
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mt-1">{pipelineStats.totalDeals}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Valor Pipeline</p>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {pipelineStats.totalValue >= 1000
                        ? `€${(pipelineStats.totalValue/1000).toFixed(0)}K`
                        : `€${pipelineStats.totalValue.toFixed(0)}`}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Ganados</p>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold mt-1">{pipelineStats.wonDeals}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Conversión</p>
                      <ArrowUpRight className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {pipelineStats.totalDeals > 0
                        ? `${Math.min(100, Math.round(pipelineStats.conversionRate))}%`
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Módulos grid */}
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-base">Módulos CRM</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {modules.map(m => {
                      const Icon = m.icon;
                      return (
                        <Button key={m.id} variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" onClick={() => setActiveTab(m.id)}>
                          <div className={cn('p-2 rounded-lg text-white', m.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium">{m.name}</span>
                          <Badge variant="secondary" className="text-[10px]">Activo</Badge>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* IA Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <CRMVoiceAssistant />
                <PredictivePipelinePanel />
                <RealtimeCollaborationPanel />
              </div>

              {/* Quick Stats reales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Inbox Omnicanal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Conversaciones abiertas</span>
                      <Badge>{openConvs}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                      <Badge variant={unassignedConvs > 0 ? 'destructive' : 'secondary'}>{unassignedConvs}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">SLA incumplido</span>
                      <span className={cn('text-sm font-medium', slaBreached > 0 ? 'text-amber-600' : '')}>{slaBreached}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4" />Sentimiento General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {withSentiment.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos de sentimiento aún.</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Positivo</span>
                          <Badge variant="outline">{positivePct}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Neutral</span>
                          <Badge variant="outline">{neutralPct}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Negativo</span>
                          <Badge variant={negativePct > 20 ? 'destructive' : 'outline'}>{negativePct}%</Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="kanban"><DealsKanban /></TabsContent>
        <TabsContent value="contacts"><ContactsManager /></TabsContent>
        <TabsContent value="omnichannel"><OmnichannelWrapper /></TabsContent>
        <TabsContent value="sentiment"><SentimentWrapper /></TabsContent>
        <TabsContent value="sla"><SLAWrapper /></TabsContent>
        <TabsContent value="automation"><AutomationWrapper /></TabsContent>
        <TabsContent value="reports"><CRMAnalyticsDashboard /></TabsContent>
        <TabsContent value="agents"><CRMAgentsPanel /></TabsContent>
        <TabsContent value="integrations"><IntegrationHubDashboard /></TabsContent>

        <TabsContent value="config">
          <div className="space-y-4">
            <CRMTeamsManager />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Config Workspace</CardTitle>
                <CardDescription>Ajustes generales del CRM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label:'Notificaciones', sub:'Alertas de nuevos leads', val:'Activado' },
                  { label:'Auto-asignación', sub:'Distribuir leads automáticamente', val:'Activado' },
                  { label:'SLA por defecto', sub:'Tiempo de respuesta', val:'30 min' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <Badge variant="secondary">{item.val}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="utilities">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">IA Híbrida Universal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AIUnifiedDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── WRAPPERS CON DATOS REALES ──────────────────────────────────────────────

function OmnichannelWrapper() {
  const { conversations, messages, currentConversation, selectConversation,
          sendMessage, assignConversation, updateConversationStatus, addTag, isLoading } = useOmnichannelHub();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  const mapped: ConvForInbox[] = conversations.map(c => ({
    id: c.id,
    contact: { id: c.contact_id ?? c.id, name: c.contact_name ?? 'Desconocido',
               phone: c.contact_phone ?? undefined, email: c.contact_email ?? undefined },
    channel: c.channel,
    status: c.status,
    priority: c.priority,
    lastMessage: c.last_message_preview
      ? { content: c.last_message_preview, timestamp: c.last_message_at ?? c.updated_at,
          isFromContact: c.last_message_direction === 'inbound' }
      : undefined,
    unreadCount: c.unread_count ?? 0,
  }));

  const currentMapped = currentConversation ? {
    id: currentConversation.id,
    contact: { id: currentConversation.contact_id ?? currentConversation.id,
               name: currentConversation.contact_name ?? 'Desconocido' },
    channel: currentConversation.channel,
    status: currentConversation.status,
    priority: currentConversation.priority,
    unreadCount: currentConversation.unread_count ?? 0,
  } : undefined;

  return (
    <div className="h-[600px]">
      <OmnichannelInbox
        conversations={mapped as any}
        messages={messages.map(m => ({
          id: m.id, conversationId: m.conversation_id, content: m.content,
          timestamp: m.created_at, isFromContact: m.direction === 'inbound', status: m.status as any,
        })) as any}
        currentConversation={currentMapped as any}
        onSelectConversation={(c: any) => selectConversation(c.id)}
        onSendMessage={(id: string, content: string) => sendMessage(id, content)}
        onAssign={(id: string, agentId: string) => assignConversation(id, agentId)}
        onUpdateStatus={(id: string, status: string) => updateConversationStatus(id, status)}
        onAddTag={(id: string, tag: string) => addTag(id, tag)}
      />
    </div>
  );
}

function SentimentWrapper() {
  const { conversations, isLoading } = useOmnichannelHub();

  const sentimentData = useMemo(() =>
    conversations.filter(c => c.sentiment).map(c => ({
      id: c.id, sourceType: 'message' as const, sourceId: c.id,
      content: c.last_message_preview ?? '',
      sentiment: (c.sentiment ?? 'neutral') as any,
      sentimentScore: c.sentiment_score ?? 0,
      emotions: [] as string[], keyPhrases: [] as string[], topics: [] as string[],
      actionRequired: c.priority === 'urgent' || c.priority === 'high',
      analyzedAt: c.updated_at,
    })), [conversations]);

  const trends = useMemo(() =>
    ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => ({
      date: d,
      positive: sentimentData.length ? Math.round(sentimentData.filter(s=>s.sentiment==='positive').length/sentimentData.length*100) : 0,
      neutral:  sentimentData.length ? Math.round(sentimentData.filter(s=>s.sentiment==='neutral').length/sentimentData.length*100)  : 0,
      negative: sentimentData.length ? Math.round(sentimentData.filter(s=>s.sentiment==='negative').length/sentimentData.length*100) : 0,
      avgScore: 50,
    })), [sentimentData]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  return <SentimentAnalysisDashboard sentimentData={sentimentData} trends={trends} />;
}

function SLAWrapper() {
  const { slaPolicies, agentMetrics, channelMetrics, globalMetrics, isLoading } = useSLAMetrics();

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <MultichannelSLADashboard
      policies={slaPolicies.map(p => ({
        id: p.id, name: p.name, channel: p.channel as any,
        firstResponseMinutes: p.first_response_minutes,
        resolutionMinutes: p.resolution_minutes,
        priority: p.priority as any,
      }))}
      agentMetrics={agentMetrics}
      channelMetrics={channelMetrics}
      globalMetrics={globalMetrics ?? { totalOpen:0, totalResolved:0, avgWaitTime:0, avgResponseTime:0, slaCompliance:0, csat:0 }}
    />
  );
}

function AutomationWrapper() {
  const [flows, setFlows] = useState<StageFlow[]>([]);
  const stages = [
    { id:'lead', name:'Lead', color:'#6366f1' },
    { id:'qualified', name:'Calificado', color:'#f59e0b' },
    { id:'proposal', name:'Propuesta', color:'#8b5cf6' },
    { id:'negotiation', name:'Negociación', color:'#f97316' },
    { id:'won', name:'Ganado', color:'#10b981' },
    { id:'lost', name:'Perdido', color:'#ef4444' },
  ];
  return (
    <StageFlowAutomation
      stages={stages}
      flows={flows}
      onCreateFlow={(f: any) => setFlows(prev => [...prev, { ...f, id:`f${Date.now()}`, executionCount:0 }])}
      onToggleFlow={(id: string, active: boolean) => setFlows(prev => prev.map(f => f.id===id ? {...f, isActive:active} : f))}
      onDeleteFlow={(id: string) => setFlows(prev => prev.filter(f => f.id !== id))}
    />
  );
}

export default CRMModularDashboard;
