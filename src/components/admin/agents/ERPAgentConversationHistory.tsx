/**
 * ERPAgentConversationHistory - Historial de conversaciones con agentes ERP
 * Incluye búsqueda, filtros y exportación de insights generados
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Download,
  MessageSquare,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  FileText,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Calendar,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, subDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { AgentDomain } from '@/hooks/admin/agents/erpAgentTypes';
import { DOMAIN_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';

// === TIPOS ===

interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    tokens?: number;
    confidence?: number;
    sources?: string[];
  };
}

interface ERPConversation {
  id: string;
  domain: AgentDomain;
  agentId: string;
  agentName: string;
  agentType: string;
  title: string;
  summary?: string;
  messages: ConversationMessage[];
  insights: ERPInsight[];
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'archived';
  rating?: number;
  feedback?: string;
  userId?: string;
  tags: string[];
}

interface ERPInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'opportunity' | 'analysis';
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
  actionable: boolean;
  implemented?: boolean;
  impact?: 'high' | 'medium' | 'low';
}

interface ERPAgentConversationHistoryProps {
  conversations?: ERPConversation[];
  onExport?: (data: ERPConversation[]) => void;
}

// === DATOS MOCK ===

const generateMockConversations = (): ERPConversation[] => {
  const domains: AgentDomain[] = ['financial', 'crm_cs', 'compliance', 'operations', 'hr', 'analytics', 'legal'];
  const agentTypes: Record<AgentDomain, string[]> = {
    financial: ['Contabilidad', 'Tesorería', 'Facturación', 'Cobros'],
    crm_cs: ['Ventas', 'Customer Success', 'Pipeline', 'Anti-Churn'],
    compliance: ['GDPR', 'PSD2', 'ESG', 'Auditoría'],
    operations: ['Inventario', 'Logística', 'Mantenimiento', 'Scheduling'],
    hr: ['Nóminas', 'Reclutamiento', 'Formación', 'Rendimiento'],
    analytics: ['Reporting', 'Forecasting', 'Anomalías'],
    legal: ['Derecho Laboral', 'Derecho Mercantil', 'Derecho Fiscal', 'Protección Datos', 'Compliance Bancario']
  };

  const conversations: ERPConversation[] = [];

  // Conversación 1 - CRM Ventas
  conversations.push({
    id: 'conv_1',
    domain: 'crm_cs',
    agentId: 'agent_sales_1',
    agentName: 'Agente de Ventas',
    agentType: 'Ventas',
    title: 'Análisis de Pipeline Q4',
    summary: 'Revisión del pipeline de ventas para Q4 con recomendaciones de priorización',
    messages: [
      {
        id: 'msg_1_1',
        role: 'user',
        content: '¿Cuál es el estado actual del pipeline de ventas para Q4?',
        timestamp: subDays(new Date(), 2).toISOString()
      },
      {
        id: 'msg_1_2',
        role: 'agent',
        content: 'El pipeline de Q4 muestra un valor total de €2.4M con 45 oportunidades activas. La distribución es: 12 en fase de propuesta (€890K), 18 en negociación (€1.1M) y 15 en descubrimiento (€410K). La tasa de conversión actual es del 32%, ligeramente por debajo del objetivo del 35%.',
        timestamp: subDays(new Date(), 2).toISOString(),
        metadata: { confidence: 94, tokens: 156 }
      },
      {
        id: 'msg_1_3',
        role: 'user',
        content: '¿Qué oportunidades deberíamos priorizar?',
        timestamp: subDays(new Date(), 2).toISOString()
      },
      {
        id: 'msg_1_4',
        role: 'agent',
        content: 'Recomiendo priorizar 3 oportunidades clave: 1) TechCorp (€280K) - en fase final, cierre estimado en 2 semanas; 2) GlobalServices (€195K) - alta probabilidad de upsell; 3) InnovateLtd (€165K) - necesita atención urgente, competencia activa. Estas representan el 54% del valor en fase de propuesta.',
        timestamp: subDays(new Date(), 2).toISOString(),
        metadata: { confidence: 91, tokens: 189 }
      }
    ],
    insights: [
      {
        id: 'insight_1_1',
        type: 'recommendation',
        title: 'Priorizar TechCorp',
        content: 'Oportunidad de €280K en fase final. Recomendación: programar llamada de cierre esta semana.',
        confidence: 94,
        timestamp: subDays(new Date(), 2).toISOString(),
        actionable: true,
        implemented: true,
        impact: 'high'
      },
      {
        id: 'insight_1_2',
        type: 'warning',
        title: 'Competencia activa en InnovateLtd',
        content: 'Detectada actividad de competidor principal. Acción inmediata requerida.',
        confidence: 87,
        timestamp: subDays(new Date(), 2).toISOString(),
        actionable: true,
        impact: 'high'
      }
    ],
    startedAt: subDays(new Date(), 2).toISOString(),
    endedAt: subDays(new Date(), 2).toISOString(),
    status: 'completed',
    rating: 5,
    tags: ['pipeline', 'Q4', 'priorización']
  });

  // Conversación 2 - Compliance GDPR
  conversations.push({
    id: 'conv_2',
    domain: 'compliance',
    agentId: 'agent_gdpr_1',
    agentName: 'Agente GDPR',
    agentType: 'GDPR',
    title: 'Auditoría de Consentimientos',
    summary: 'Revisión del estado de consentimientos GDPR y acciones correctivas',
    messages: [
      {
        id: 'msg_2_1',
        role: 'user',
        content: '¿Tenemos algún problema de cumplimiento GDPR pendiente?',
        timestamp: subDays(new Date(), 1).toISOString()
      },
      {
        id: 'msg_2_2',
        role: 'agent',
        content: 'He detectado 3 áreas que requieren atención: 1) 127 registros de clientes sin consentimiento explícito de marketing; 2) 45 solicitudes de acceso a datos (DSAR) pendientes de respuesta, 8 próximas a vencer; 3) Política de retención de datos no aplicada a 2,340 registros inactivos (+24 meses).',
        timestamp: subDays(new Date(), 1).toISOString(),
        metadata: { confidence: 98, tokens: 134 }
      },
      {
        id: 'msg_2_3',
        role: 'user',
        content: '¿Puedes priorizar las acciones correctivas?',
        timestamp: subDays(new Date(), 1).toISOString()
      },
      {
        id: 'msg_2_4',
        role: 'agent',
        content: 'Prioridad 1 (Urgente): Resolver las 8 DSAR próximas a vencer - plazo legal de 30 días. Prioridad 2 (Esta semana): Enviar campañas de re-consentimiento a los 127 registros. Prioridad 3 (Este mes): Ejecutar limpieza de datos según política de retención. He preparado los flujos de trabajo para cada acción.',
        timestamp: subDays(new Date(), 1).toISOString(),
        metadata: { confidence: 96, tokens: 145 }
      }
    ],
    insights: [
      {
        id: 'insight_2_1',
        type: 'warning',
        title: 'DSARs próximas a vencer',
        content: '8 solicitudes de acceso a datos con plazo legal próximo. Riesgo de multa: hasta €20M.',
        confidence: 98,
        timestamp: subDays(new Date(), 1).toISOString(),
        actionable: true,
        impact: 'high'
      },
      {
        id: 'insight_2_2',
        type: 'analysis',
        title: 'Estado de cumplimiento',
        content: 'Índice de cumplimiento GDPR actual: 87%. Meta: 95%. Gap principal: gestión de consentimientos.',
        confidence: 92,
        timestamp: subDays(new Date(), 1).toISOString(),
        actionable: false,
        impact: 'medium'
      }
    ],
    startedAt: subDays(new Date(), 1).toISOString(),
    endedAt: subDays(new Date(), 1).toISOString(),
    status: 'completed',
    rating: 4,
    tags: ['GDPR', 'consentimiento', 'DSAR', 'auditoría']
  });

  // Conversación 3 - Financial Tesorería
  conversations.push({
    id: 'conv_3',
    domain: 'financial',
    agentId: 'agent_treasury_1',
    agentName: 'Agente de Tesorería',
    agentType: 'Tesorería',
    title: 'Proyección de Cash Flow',
    summary: 'Análisis de flujo de caja y recomendaciones de optimización',
    messages: [
      {
        id: 'msg_3_1',
        role: 'user',
        content: '¿Cuál es la proyección de cash flow para los próximos 90 días?',
        timestamp: new Date().toISOString()
      },
      {
        id: 'msg_3_2',
        role: 'agent',
        content: 'Proyección de cash flow 90 días: Posición actual: €1.2M. Entradas esperadas: €2.8M (cobros €2.1M + otros €700K). Salidas proyectadas: €3.1M (nóminas €1.4M, proveedores €1.2M, otros €500K). Saldo proyectado día 90: €900K. Alerta: posible tensión de liquidez en semana 6-8.',
        timestamp: new Date().toISOString(),
        metadata: { confidence: 89, tokens: 167 }
      },
      {
        id: 'msg_3_3',
        role: 'user',
        content: '¿Cómo podemos mitigar la tensión de liquidez?',
        timestamp: new Date().toISOString()
      },
      {
        id: 'msg_3_4',
        role: 'agent',
        content: 'Recomendaciones: 1) Acelerar cobros de facturas vencidas (€340K pendiente >30 días); 2) Negociar extensión de plazos con 3 proveedores principales (potencial: diferir €280K); 3) Considerar línea de crédito revolving por €500K como respaldo. Con estas acciones, el buffer de seguridad aumentaría a €1.1M.',
        timestamp: new Date().toISOString(),
        metadata: { confidence: 86, tokens: 178 }
      }
    ],
    insights: [
      {
        id: 'insight_3_1',
        type: 'warning',
        title: 'Tensión de liquidez prevista',
        content: 'Semanas 6-8 muestran flujo de caja negativo. Acciones preventivas recomendadas.',
        confidence: 89,
        timestamp: new Date().toISOString(),
        actionable: true,
        impact: 'high'
      },
      {
        id: 'insight_3_2',
        type: 'opportunity',
        title: 'Cobros acelerables',
        content: '€340K en facturas vencidas >30 días recuperables con gestión activa.',
        confidence: 84,
        timestamp: new Date().toISOString(),
        actionable: true,
        impact: 'medium'
      }
    ],
    startedAt: new Date().toISOString(),
    status: 'active',
    tags: ['cash flow', 'liquidez', 'proyección']
  });

  // Más conversaciones mock
  domains.forEach((domain, idx) => {
    if (domain === 'crm_cs' || domain === 'compliance' || domain === 'financial') return;
    
    const types = agentTypes[domain];
    const agentType = types[Math.floor(Math.random() * types.length)];
    
    conversations.push({
      id: `conv_${idx + 10}`,
      domain,
      agentId: `agent_${domain}_${idx}`,
      agentName: `Agente de ${agentType}`,
      agentType,
      title: `Análisis de ${agentType}`,
      summary: `Revisión automática del módulo ${agentType} con insights generados`,
      messages: [
        {
          id: `msg_${idx}_1`,
          role: 'user',
          content: `Dame un resumen del estado actual de ${agentType.toLowerCase()}`,
          timestamp: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString()
        },
        {
          id: `msg_${idx}_2`,
          role: 'agent',
          content: `El módulo de ${agentType} muestra un rendimiento del ${75 + Math.floor(Math.random() * 20)}% respecto a los KPIs establecidos. Se han identificado ${Math.floor(Math.random() * 5) + 1} áreas de mejora potencial.`,
          timestamp: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString(),
          metadata: { confidence: 80 + Math.floor(Math.random() * 15), tokens: 100 + Math.floor(Math.random() * 100) }
        }
      ],
      insights: [
        {
          id: `insight_${idx}_1`,
          type: Math.random() > 0.5 ? 'recommendation' : 'analysis',
          title: `Optimización de ${agentType}`,
          content: `Se detectó oportunidad de mejora en el proceso de ${agentType.toLowerCase()}.`,
          confidence: 75 + Math.floor(Math.random() * 20),
          timestamp: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString(),
          actionable: Math.random() > 0.3,
          impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low'
        }
      ],
      startedAt: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString(),
      endedAt: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString(),
      status: 'completed',
      rating: Math.floor(Math.random() * 2) + 4,
      tags: [agentType.toLowerCase(), 'análisis']
    });
  });

  return conversations.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
};

// === COMPONENTE ===

export function ERPAgentConversationHistory({
  conversations: externalConversations,
  onExport
}: ERPAgentConversationHistoryProps) {
  // Estado
  const [conversations, setConversations] = useState<ERPConversation[]>(
    externalConversations || generateMockConversations()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<AgentDomain | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ERPConversation | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'insights'>('conversations');

  // Filtrar conversaciones
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = conv.title.toLowerCase().includes(query);
        const matchesSummary = conv.summary?.toLowerCase().includes(query);
        const matchesMessages = conv.messages.some(m => m.content.toLowerCase().includes(query));
        const matchesTags = conv.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSummary && !matchesMessages && !matchesTags) return false;
      }

      // Dominio
      if (selectedDomain !== 'all' && conv.domain !== selectedDomain) return false;

      // Estado
      if (selectedStatus !== 'all' && conv.status !== selectedStatus) return false;

      // Rango de fechas
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = subDays(new Date(), days);
        if (new Date(conv.startedAt) < startDate) return false;
      }

      return true;
    });
  }, [conversations, searchQuery, selectedDomain, selectedStatus, dateRange]);

  // Extraer todos los insights
  const allInsights = useMemo(() => {
    return filteredConversations
      .flatMap(conv => conv.insights.map(insight => ({ ...insight, conversationId: conv.id, agentName: conv.agentName })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredConversations]);

  // Exportar a JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalConversations: filteredConversations.length,
      totalInsights: allInsights.length,
      conversations: filteredConversations,
      insights: allInsights
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-agent-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Historial exportado correctamente');
  }, [filteredConversations, allInsights]);

  // Exportar a CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['ID', 'Fecha', 'Dominio', 'Agente', 'Título', 'Estado', 'Rating', 'Insights', 'Tags'];
    const rows = filteredConversations.map(conv => [
      conv.id,
      format(new Date(conv.startedAt), 'dd/MM/yyyy HH:mm'),
      DOMAIN_CONFIG[conv.domain].name,
      conv.agentName,
      conv.title,
      conv.status,
      conv.rating || '-',
      conv.insights.length,
      conv.tags.join(', ')
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-conversations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente');
  }, [filteredConversations]);

  // Copiar insight
  const copyInsight = useCallback((insight: ERPInsight) => {
    navigator.clipboard.writeText(`${insight.title}\n\n${insight.content}`);
    toast.success('Insight copiado al portapapeles');
  }, []);

  const getInsightIcon = (type: ERPInsight['type']) => {
    switch (type) {
      case 'recommendation': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'opportunity': return <Sparkles className="h-4 w-4 text-green-500" />;
      case 'analysis': return <Brain className="h-4 w-4 text-purple-500" />;
    }
  };

  const getImpactBadge = (impact?: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return <Badge variant="destructive" className="text-xs">Alto impacto</Badge>;
      case 'medium': return <Badge variant="default" className="text-xs">Impacto medio</Badge>;
      case 'low': return <Badge variant="secondary" className="text-xs">Bajo impacto</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Historial de Conversaciones
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredConversations.length} conversaciones · {allInsights.length} insights generados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as typeof selectedDomain)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Dominio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los dominios</SelectItem>
            {Object.entries(DOMAIN_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="archived">Archivadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <SelectTrigger className="w-32">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo</SelectItem>
            <SelectItem value="7d">7 días</SelectItem>
            <SelectItem value="30d">30 días</SelectItem>
            <SelectItem value="90d">90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversaciones
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Insights ({allInsights.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Conversaciones */}
        <TabsContent value="conversations">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {filteredConversations.map((conv) => {
                const isExpanded = expandedConversation === conv.id;
                const domainConfig = DOMAIN_CONFIG[conv.domain];

                return (
                  <Collapsible
                    key={conv.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedConversation(isExpanded ? null : conv.id)}
                  >
                    <Card className={cn(
                      "transition-all",
                      isExpanded && "ring-1 ring-primary/20"
                    )}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", domainConfig.color)}>
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                  {conv.title}
                                  {conv.status === 'active' && (
                                    <Badge variant="default" className="text-xs">Activa</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {conv.agentName} · {domainConfig.name}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(conv.startedAt), { locale: es, addSuffix: true })}
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </div>
                          {conv.summary && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{conv.summary}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {conv.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                            {conv.insights.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {conv.insights.length} insights
                              </Badge>
                            )}
                            {conv.rating && (
                              <div className="flex items-center gap-1 ml-auto">
                                {Array.from({ length: conv.rating }).map((_, i) => (
                                  <span key={i} className="text-yellow-500">★</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {/* Mensajes */}
                          <div className="space-y-3 mb-4">
                            {conv.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "flex gap-3 p-3 rounded-lg",
                                  msg.role === 'user' ? "bg-muted/50" : "bg-primary/5 border border-primary/10"
                                )}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-full h-fit",
                                  msg.role === 'user' ? "bg-muted-foreground/20" : "bg-primary/20"
                                )}>
                                  {msg.role === 'user' ? (
                                    <User className="h-3 w-3" />
                                  ) : (
                                    <Bot className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm">{msg.content}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span>{format(new Date(msg.timestamp), 'HH:mm', { locale: es })}</span>
                                    {msg.metadata?.confidence && (
                                      <span>Confianza: {msg.metadata.confidence}%</span>
                                    )}
                                    {msg.metadata?.tokens && (
                                      <span>{msg.metadata.tokens} tokens</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Insights de la conversación */}
                          {conv.insights.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Insights Generados
                              </h4>
                              <div className="space-y-2">
                                {conv.insights.map(insight => (
                                  <div
                                    key={insight.id}
                                    className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      {getInsightIcon(insight.type)}
                                      <div>
                                        <p className="text-sm font-medium">{insight.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{insight.content}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          {getImpactBadge(insight.impact)}
                                          <span className="text-xs text-muted-foreground">
                                            Confianza: {insight.confidence}%
                                          </span>
                                          {insight.implemented && (
                                            <Badge variant="default" className="text-xs bg-green-500">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Implementado
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => copyInsight(insight)}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No se encontraron conversaciones</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab Insights */}
        <TabsContent value="insights">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {allInsights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {(insight as any).agentName} · {formatDistanceToNow(new Date(insight.timestamp), { locale: es, addSuffix: true })}
                          </p>
                          <p className="text-sm text-muted-foreground">{insight.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            {getImpactBadge(insight.impact)}
                            <Badge variant="outline" className="text-xs">
                              Confianza: {insight.confidence}%
                            </Badge>
                            {insight.actionable && (
                              <Badge variant="secondary" className="text-xs">Accionable</Badge>
                            )}
                            {insight.implemented && (
                              <Badge className="text-xs bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Implementado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyInsight(insight)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {allInsights.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay insights disponibles</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPAgentConversationHistory;
