/**
 * Dashboard Principal del CRM Modular
 * Similar a ERPModularDashboard pero para el módulo CRM
 */

import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';

// CRM Module Components
import { EnhancedKanbanBoard, KanbanColumn, KanbanItem } from '@/components/crm';
import { OmnichannelInbox, Conversation, Message } from '@/components/crm/omnichannel';
import { SentimentAnalysisDashboard } from '@/components/crm/sentiment';
import { MultichannelSLADashboard } from '@/components/crm/omnichannel';
import { StageFlowAutomation, StageFlow } from '@/components/crm/automation';
import { IntelligentLeadDistribution, Agent, DistributionRule, DistributionStats } from '@/components/crm/automation';
import { ERPModuleAgentsPanel } from '@/components/admin/agents/ERPModuleAgentsPanel';
import { CRMWorkspaceSelector, CRMTeamsManager } from '@/components/crm/config';
import { ContactsManager } from '@/components/crm/contacts';
import { DealsKanban } from '@/components/crm/deals';
import { ActivitiesManager } from '@/components/crm/activities';
import { cn } from '@/lib/utils';

// Demo data (simplificado del original)
const initialColumns: KanbanColumn[] = [
  { id: 'nuevo', title: 'Nuevo', icon: <Clock className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-50/50 dark:bg-blue-950/20', items: [
    { id: '1', title: 'Acme Corp', subtitle: 'Interesados en módulo CRM', value: 45000, probability: 30, priority: 'high', dueDate: '2024-01-20' },
    { id: '2', title: 'TechStart', subtitle: 'Demo solicitada', value: 12000, probability: 20, priority: 'medium', dueDate: '2024-01-25' },
  ]},
  { id: 'contactado', title: 'Contactado', icon: <PhoneCall className="h-4 w-4" />, color: 'text-amber-600', bgColor: 'bg-amber-50/50 dark:bg-amber-950/20', items: [
    { id: '3', title: 'Global Industries', subtitle: 'Llamada programada', value: 85000, probability: 50, priority: 'urgent', dueDate: '2024-01-18', isVip: true },
  ]},
  { id: 'propuesta', title: 'Propuesta', icon: <Mail className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-50/50 dark:bg-purple-950/20', items: [
    { id: '4', title: 'Retail Plus', subtitle: 'Propuesta enviada', value: 35000, probability: 70, priority: 'high', dueDate: '2024-01-22' },
  ]},
  { id: 'cerrado', title: 'Cerrado', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-50/50 dark:bg-green-950/20', items: [
    { id: '5', title: 'LogiTech', subtitle: '¡Ganado!', value: 48000, probability: 100 },
  ]},
];

export function CRMModularDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  const handleMoveItem = (itemId: string, fromColumn: string, toColumn: string) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const sourceCol = newColumns.find(c => c.id === fromColumn);
      const destCol = newColumns.find(c => c.id === toColumn);
      if (!sourceCol || !destCol) return prev;
      const itemIndex = sourceCol.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return prev;
      const [item] = sourceCol.items.splice(itemIndex, 1);
      destCol.items.push(item);
      return newColumns;
    });
  };

  // Métricas de resumen
  const totalDeals = columns.reduce((acc, col) => acc + col.items.length, 0);
  const totalValue = columns.reduce((acc, col) => acc + col.items.reduce((a, i) => a + (i.value || 0), 0), 0);
  const wonDeals = columns.find(c => c.id === 'cerrado')?.items.length || 0;

  const modules = [
    { id: 'kanban', name: 'Pipeline', icon: Kanban, color: 'bg-blue-500', installed: true },
    { id: 'contacts', name: 'Contactos', icon: UserCircle, color: 'bg-indigo-500', installed: true },
    { id: 'omnichannel', name: 'Inbox', icon: MessageSquare, color: 'bg-green-500', installed: true },
    { id: 'sentiment', name: 'Sentimiento', icon: Heart, color: 'bg-pink-500', installed: true },
    { id: 'sla', name: 'SLAs', icon: Timer, color: 'bg-amber-500', installed: true },
    { id: 'automation', name: 'Automatización', icon: Zap, color: 'bg-purple-500', installed: true },
    { id: 'reports', name: 'Reportes', icon: BarChart3, color: 'bg-orange-500', installed: true },
    { id: 'agents', name: 'Agentes IA', icon: Bot, color: 'bg-cyan-500', installed: true },
    { id: 'config', name: 'Configuración', icon: Settings, color: 'bg-slate-500', installed: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Workspace Selector */}
      <div className="flex items-center justify-between">
        <CRMWorkspaceSelector showCreateButton />
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
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Config
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
                    <p className="text-2xl font-bold">{totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(0) : 0}%</p>
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
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                    <Badge variant="destructive">3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SLA en riesgo</span>
                    <Badge variant="outline" className="text-amber-600">2</Badge>
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
                    <Badge className="bg-green-500">72%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Neutral</span>
                    <Badge variant="secondary">18%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Negativo</span>
                    <Badge variant="destructive">10%</Badge>
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
          <ERPModuleAgentsPanel />
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
      </Tabs>
    </div>
  );
}

// Wrapper components para datos demo
function OmnichannelInboxWrapper() {
  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);

  const demoConversations: Conversation[] = [
    { id: '1', contact: { id: 'c1', name: 'María García', phone: '+34 612 345 678' }, channel: 'whatsapp', status: 'open', priority: 'high', lastMessage: { content: 'Hola, necesito ayuda', timestamp: new Date().toISOString(), isFromContact: true }, unreadCount: 2 },
    { id: '2', contact: { id: 'c2', name: 'Carlos López' }, channel: 'instagram', status: 'open', priority: 'normal', lastMessage: { content: '¿Tienen stock?', timestamp: new Date().toISOString(), isFromContact: true }, unreadCount: 1 },
  ];

  return (
    <div className="h-[600px]">
      <OmnichannelInbox 
        conversations={demoConversations}
        messages={messages}
        currentConversation={currentConversation}
        onSelectConversation={(c) => { setCurrentConversation(c); setMessages([]); }}
        onSendMessage={(id, content) => setMessages(prev => [...prev, { id: `m${Date.now()}`, conversationId: id, content, timestamp: new Date().toISOString(), isFromContact: false, status: 'sent' }])}
        onAssign={() => {}}
        onUpdateStatus={() => {}}
        onAddTag={() => {}}
      />
    </div>
  );
}

function SentimentTabContent() {
  const demoData = [
    { id: '1', sourceType: 'message' as const, sourceId: 'msg1', content: 'Excelente servicio', sentiment: 'positive' as const, sentimentScore: 0.85, emotions: [{ emotion: 'satisfacción', intensity: 0.9 }], keyPhrases: ['excelente'], topics: ['Servicio'], actionRequired: false, analyzedAt: new Date().toISOString() },
  ];
  const trends = [
    { date: 'Lun', positive: 65, neutral: 25, negative: 10, avgScore: 45 },
    { date: 'Mar', positive: 70, neutral: 20, negative: 10, avgScore: 55 },
  ];
  return <SentimentAnalysisDashboard sentimentData={demoData} trends={trends} />;
}

function SLATabContent() {
  const configs = [{ id: '1', name: 'Estándar', channel: 'all' as const, firstResponseMinutes: 30, resolutionMinutes: 480, priority: 'normal' as const }];
  const agents = [{ id: 'a1', name: 'Juan Pérez', activeConversations: 8, resolvedToday: 23, avgResponseTime: 4, avgResolutionTime: 45, slaCompliance: 94, csat: 4.7, channels: ['whatsapp'] }];
  const channels = [{ channel: 'WhatsApp', totalConversations: 450, openConversations: 28, avgWaitTime: 2, avgResponseTime: 4, slaCompliance: 95, csat: 4.8 }];
  const global = { totalOpen: 60, totalResolved: 87, avgWaitTime: 5, avgResponseTime: 8, slaCompliance: 89, csat: 4.5 };
  return <MultichannelSLADashboard slaConfigs={configs} agentMetrics={agents} channelMetrics={channels} globalMetrics={global} />;
}

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

// === Contacts Tab ===
function ContactsTabContent() {
  const contacts = [
    { id: '1', name: 'María García', company: 'Acme Corp', email: 'maria@acme.com', phone: '+34 612 345 678', status: 'active', lastContact: '2024-01-15', deals: 2, value: 57000 },
    { id: '2', name: 'Carlos López', company: 'TechStart', email: 'carlos@techstart.io', phone: '+34 623 456 789', status: 'lead', lastContact: '2024-01-18', deals: 1, value: 12000 },
    { id: '3', name: 'Ana Martínez', company: 'Global Industries', email: 'ana@global.com', phone: '+34 634 567 890', status: 'active', lastContact: '2024-01-12', deals: 3, value: 125000 },
    { id: '4', name: 'Pedro Sánchez', company: 'Retail Plus', email: 'pedro@retailplus.es', phone: '+34 645 678 901', status: 'inactive', lastContact: '2023-12-20', deals: 0, value: 0 },
    { id: '5', name: 'Laura Fernández', company: 'LogiTech', email: 'laura@logitech.es', phone: '+34 656 789 012', status: 'active', lastContact: '2024-01-19', deals: 1, value: 48000 },
  ];

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    lead: 'bg-blue-500',
    inactive: 'bg-gray-400',
  };

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    lead: 'Lead',
    inactive: 'Inactivo',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Contactos</h3>
          <p className="text-sm text-muted-foreground">Base de datos de clientes y prospectos</p>
        </div>
        <Button className="gap-2">
          <UserCircle className="h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Total Contactos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.reduce((acc, c) => acc + c.deals, 0)}</p>
                <p className="text-xs text-muted-foreground">Deals Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(contacts.reduce((acc, c) => acc + c.value, 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contacto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Empresa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contacto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Deals</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Último Contacto</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{contact.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium">{contact.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {contact.company}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={cn("text-white", statusColors[contact.status])}>
                        {statusLabels[contact.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{contact.deals}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      ${contact.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {contact.lastContact}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === Reports Tab ===
function ReportsTabContent() {
  const pipelineData = [
    { stage: 'Nuevos', count: 24, value: 180000, color: '#6366f1' },
    { stage: 'Contactados', count: 18, value: 245000, color: '#f59e0b' },
    { stage: 'Propuesta', count: 12, value: 320000, color: '#8b5cf6' },
    { stage: 'Negociación', count: 8, value: 280000, color: '#06b6d4' },
    { stage: 'Cerrados', count: 15, value: 425000, color: '#10b981' },
  ];

  const monthlyData = [
    { month: 'Ene', leads: 45, won: 12, lost: 8, revenue: 156000 },
    { month: 'Feb', leads: 52, won: 15, lost: 10, revenue: 189000 },
    { month: 'Mar', leads: 48, won: 18, lost: 7, revenue: 234000 },
    { month: 'Abr', leads: 61, won: 22, lost: 12, revenue: 287000 },
  ];

  const topPerformers = [
    { name: 'Juan Pérez', deals: 28, revenue: 345000, conversion: 32 },
    { name: 'Ana García', deals: 24, revenue: 298000, conversion: 29 },
    { name: 'Carlos López', deals: 21, revenue: 267000, conversion: 27 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Reportes y Analytics</h3>
        <p className="text-sm text-muted-foreground">Análisis de rendimiento del CRM</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads este mes</p>
                <p className="text-2xl font-bold">61</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> +27%
                </p>
              </div>
              <PieChart className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Conversión</p>
                <p className="text-2xl font-bold">28.5%</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> +3.2%
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Mensual</p>
                <p className="text-2xl font-bold">$287K</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> +18%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ciclo Promedio</p>
                <p className="text-2xl font-bold">18 días</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> -2 días
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis del Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipelineData.map((stage) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="text-muted-foreground">{stage.count} deals · ${(stage.value / 1000).toFixed(0)}K</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${(stage.value / 425000) * 100}%`,
                      backgroundColor: stage.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend & Top Performers */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium w-8">{month.month}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-blue-600">{month.leads} leads</span>
                      <span className="text-green-600">{month.won} ganados</span>
                      <span className="text-red-500">{month.lost} perdidos</span>
                    </div>
                  </div>
                  <span className="font-semibold">${(month.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                      index === 0 ? "bg-amber-500" : index === 1 ? "bg-gray-400" : "bg-amber-700"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">{performer.deals} deals · {performer.conversion}% conv.</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">${(performer.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CRMModularDashboard;
