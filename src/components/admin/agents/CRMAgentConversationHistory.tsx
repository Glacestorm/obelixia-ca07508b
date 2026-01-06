/**
 * CRMAgentConversationHistory - Historial de conversaciones con agentes especializados
 * Permite consultar recomendaciones pasadas y ver el contexto de cada interacción
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Filter,
  Calendar,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  Star,
  StarOff,
  Bookmark,
  Copy,
  Share2,
  Trash2,
  Download,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Eye,
  Target,
  GitBranch,
  Heart,
  AlertTriangle,
  TrendingUp,
  Zap,
  UserPlus,
  BarChart3,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// === TIPOS ===
export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    processingTime?: number;
    tokensUsed?: number;
    sources?: string[];
  };
}

export interface AgentConversation {
  id: string;
  agentId: string;
  agentType: string;
  agentName: string;
  title: string;
  summary?: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  entityType?: 'lead' | 'deal' | 'customer';
  entityId?: string;
  entityName?: string;
  outcome?: 'positive' | 'negative' | 'neutral' | 'pending';
  rating?: number;
  isFavorite: boolean;
  tags: string[];
  recommendations?: Array<{
    id: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
    applied: boolean;
    appliedAt?: Date;
  }>;
}

interface CRMAgentConversationHistoryProps {
  className?: string;
}

// === ICONOS POR TIPO DE AGENTE ===
const AGENT_ICONS: Record<string, React.ElementType> = {
  lead_scoring: Target,
  pipeline_optimizer: GitBranch,
  customer_success: Heart,
  churn_predictor: AlertTriangle,
  upsell_detector: TrendingUp,
  engagement_analyzer: MessageSquare,
  deal_accelerator: Zap,
  contact_enrichment: UserPlus,
  activity_optimizer: Calendar,
  forecast_analyst: BarChart3
};

// === DATOS MOCK ===
function generateMockConversations(): AgentConversation[] {
  const agents = [
    { id: 'lead_scoring', name: 'Agente Lead Scoring', type: 'lead_scoring' },
    { id: 'pipeline_optimizer', name: 'Agente Pipeline', type: 'pipeline_optimizer' },
    { id: 'churn_predictor', name: 'Agente Churn Prevention', type: 'churn_predictor' },
    { id: 'upsell_detector', name: 'Agente Upsell', type: 'upsell_detector' },
    { id: 'deal_accelerator', name: 'Agente Deal Accelerator', type: 'deal_accelerator' }
  ];

  const entities = [
    { type: 'lead', id: 'lead-1', name: 'TechCorp Solutions' },
    { type: 'deal', id: 'deal-1', name: 'Enterprise License Q1' },
    { type: 'customer', id: 'cust-1', name: 'GlobalBank Inc' },
    { type: 'lead', id: 'lead-2', name: 'StartupXYZ' },
    { type: 'deal', id: 'deal-2', name: 'Premium Package' }
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const agent = agents[i % agents.length];
    const entity = entities[i % entities.length];
    const daysAgo = Math.floor(i / 2);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(9 + (i % 8), (i * 7) % 60);

    const userQuestions = [
      `¿Cuál es la probabilidad de conversión de ${entity.name}?`,
      `Analiza el estado actual del deal ${entity.name}`,
      `¿Qué riesgos ves en la cuenta ${entity.name}?`,
      `¿Hay oportunidades de upsell para ${entity.name}?`,
      `¿Cómo puedo acelerar el cierre de ${entity.name}?`
    ];

    const agentResponses = [
      `He analizado ${entity.name} y encontré varios indicadores positivos. La tasa de engagement es del 78% y hay señales claras de intención de compra. Recomiendo programar una demo personalizada en los próximos 3 días.`,
      `El deal "${entity.name}" muestra un progreso saludable. Está en fase de negociación con un 65% de probabilidad de cierre. Los stakeholders clave han respondido positivamente. Siguiente paso: enviar propuesta económica revisada.`,
      `Detecté 3 señales de riesgo en ${entity.name}: disminución en uso del producto (↓25%), tickets de soporte sin resolver, y ausencia en últimos 2 webinars. Recomiendo contacto proactivo del CSM.`,
      `Hay una excelente oportunidad de upsell con ${entity.name}. Basado en su crecimiento (50% más usuarios) y adopción de features premium, estimo un potencial de +€15,000/año con el plan Enterprise.`,
      `Para acelerar ${entity.name}, sugiero: 1) Involucrar al sponsor ejecutivo, 2) Ofrecer implementación prioritaria, 3) Preparar caso de negocio con ROI específico. Tiempo estimado de cierre: 2 semanas.`
    ];

    return {
      id: `conv-${i + 1}`,
      agentId: agent.id,
      agentType: agent.type,
      agentName: agent.name,
      title: `Consulta sobre ${entity.name}`,
      summary: `Análisis de ${entity.type} con recomendaciones de ${agent.name.toLowerCase()}`,
      messages: [
        {
          id: `msg-${i}-1`,
          role: 'user' as const,
          content: userQuestions[i % userQuestions.length],
          timestamp: createdAt
        },
        {
          id: `msg-${i}-2`,
          role: 'agent' as const,
          content: agentResponses[i % agentResponses.length],
          timestamp: new Date(createdAt.getTime() + 3000),
          metadata: {
            confidence: 75 + Math.floor(Math.random() * 20),
            processingTime: 1200 + Math.floor(Math.random() * 800),
            tokensUsed: 150 + Math.floor(Math.random() * 100)
          }
        }
      ],
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 3000),
      entityType: entity.type as 'lead' | 'deal' | 'customer',
      entityId: entity.id,
      entityName: entity.name,
      outcome: ['positive', 'negative', 'neutral', 'pending'][i % 4] as 'positive' | 'negative' | 'neutral' | 'pending',
      rating: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : undefined,
      isFavorite: i % 5 === 0,
      tags: [agent.type, entity.type, i % 2 === 0 ? 'importante' : 'seguimiento'].filter(Boolean),
      recommendations: [
        {
          id: `rec-${i}-1`,
          text: 'Programar llamada de seguimiento esta semana',
          priority: 'high' as const,
          applied: i % 3 === 0,
          appliedAt: i % 3 === 0 ? new Date() : undefined
        },
        {
          id: `rec-${i}-2`,
          text: 'Preparar propuesta personalizada',
          priority: 'medium' as const,
          applied: false
        }
      ]
    };
  });
}

// === COMPONENTE PRINCIPAL ===
export function CRMAgentConversationHistory({ className }: CRMAgentConversationHistoryProps) {
  const [conversations, setConversations] = useState<AgentConversation[]>(() => generateMockConversations());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<AgentConversation | null>(null);
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  // Obtener agentes únicos
  const uniqueAgents = useMemo(() => {
    const agents = new Map<string, { id: string; name: string; type: string }>();
    conversations.forEach(c => {
      if (!agents.has(c.agentId)) {
        agents.set(c.agentId, { id: c.agentId, name: c.agentName, type: c.agentType });
      }
    });
    return Array.from(agents.values());
  }, [conversations]);

  // Filtrar conversaciones
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          conv.title.toLowerCase().includes(query) ||
          conv.summary?.toLowerCase().includes(query) ||
          conv.entityName?.toLowerCase().includes(query) ||
          conv.messages.some(m => m.content.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Filtro por agente
      if (selectedAgent !== 'all' && conv.agentId !== selectedAgent) return false;

      // Filtro por resultado
      if (selectedOutcome !== 'all' && conv.outcome !== selectedOutcome) return false;

      // Filtro favoritos
      if (showFavoritesOnly && !conv.isFavorite) return false;

      return true;
    });
  }, [conversations, searchQuery, selectedAgent, selectedOutcome, showFavoritesOnly]);

  // Agrupar por fecha
  const groupedConversations = useMemo(() => {
    const groups: Record<string, AgentConversation[]> = {
      'Hoy': [],
      'Ayer': [],
      'Esta semana': [],
      'Anteriores': []
    };

    filteredConversations.forEach(conv => {
      if (isToday(conv.createdAt)) {
        groups['Hoy'].push(conv);
      } else if (isYesterday(conv.createdAt)) {
        groups['Ayer'].push(conv);
      } else if (isThisWeek(conv.createdAt)) {
        groups['Esta semana'].push(conv);
      } else {
        groups['Anteriores'].push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  // Handlers
  const handleToggleFavorite = useCallback((convId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, isFavorite: !c.isFavorite } : c
    ));
  }, []);

  const handleRate = useCallback((convId: string, rating: number) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, rating } : c
    ));
    toast.success('Valoración guardada');
  }, []);

  const handleCopyToClipboard = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado al portapapeles');
  }, []);

  const handleApplyRecommendation = useCallback((convId: string, recId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? {
        ...c,
        recommendations: c.recommendations?.map(r =>
          r.id === recId ? { ...r, applied: true, appliedAt: new Date() } : r
        )
      } : c
    ));
    toast.success('Recomendación aplicada');
  }, []);

  const handleDeleteConversation = useCallback((convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(null);
    }
    toast.success('Conversación eliminada');
  }, [selectedConversation]);

  const toggleExpand = useCallback((convId: string) => {
    setExpandedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
  }, []);

  // Renderizar icono de agente
  const AgentIcon = ({ type }: { type: string }) => {
    const Icon = AGENT_ICONS[type] || Bot;
    return <Icon className="h-4 w-4" />;
  };

  // Renderizar badge de outcome
  const OutcomeBadge = ({ outcome }: { outcome?: string }) => {
    switch (outcome) {
      case 'positive':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Positivo</Badge>;
      case 'negative':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Negativo</Badge>;
      case 'neutral':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Neutral</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pendiente</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex gap-4 h-[calc(100vh-200px)]", className)}>
      {/* Panel izquierdo: Lista de conversaciones */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm">Historial de Conversaciones</CardTitle>
                <CardDescription className="text-xs">
                  {filteredConversations.length} conversaciones
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Filtros */}
          <div className="space-y-2 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los agentes</SelectItem>
                  {uniqueAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                <SelectTrigger className="h-8 text-xs w-[100px]">
                  <SelectValue placeholder="Resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={cn("h-3.5 w-3.5", showFavoritesOnly && "fill-current")} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(groupedConversations).map(([group, convs]) => {
              if (convs.length === 0) return null;
              return (
                <div key={group}>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">{group}</h4>
                  <div className="space-y-2">
                    {convs.map(conv => (
                      <motion.div
                        key={conv.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedConversation?.id === conv.id 
                            ? "bg-primary/5 border-primary/30" 
                            : "bg-card hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className={cn(
                              "p-1.5 rounded-md shrink-0",
                              selectedConversation?.id === conv.id ? "bg-primary/20" : "bg-muted"
                            )}>
                              <AgentIcon type={conv.agentType} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                                {conv.isFavorite && (
                                  <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{conv.agentName}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {format(conv.createdAt, 'HH:mm', { locale: es })}
                            </span>
                            <OutcomeBadge outcome={conv.outcome} />
                          </div>
                        </div>
                        
                        {conv.entityName && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {conv.entityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {conv.entityName}
                            </span>
                          </div>
                        )}

                        {conv.rating && (
                          <div className="mt-2 flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < conv.rating! ? "text-amber-500 fill-current" : "text-muted"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron conversaciones</p>
                <p className="text-xs text-muted-foreground">Ajusta los filtros o inicia una nueva</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Panel derecho: Detalle de conversación */}
      <Card className="w-[500px] flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                    <AgentIcon type={selectedConversation.agentType} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{selectedConversation.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {selectedConversation.agentName} • {format(selectedConversation.createdAt, 'PPpp', { locale: es })}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleFavorite(selectedConversation.id)}
                  >
                    <Star className={cn(
                      "h-3.5 w-3.5",
                      selectedConversation.isFavorite && "text-amber-500 fill-current"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedConversation.entityName && (
                  <Badge variant="outline" className="text-xs">
                    {selectedConversation.entityType}: {selectedConversation.entityName}
                  </Badge>
                )}
                <OutcomeBadge outcome={selectedConversation.outcome} />
                {selectedConversation.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Mensajes */}
                <div className="space-y-3">
                  {selectedConversation.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 group",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[10px] opacity-60">
                            {format(msg.timestamp, 'HH:mm', { locale: es })}
                          </span>
                          {msg.role === 'agent' && msg.metadata && (
                            <div className="flex items-center gap-2 text-[10px] opacity-60">
                              <span>Confianza: {msg.metadata.confidence}%</span>
                              <span>{msg.metadata.processingTime}ms</span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyToClipboard(msg.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Recomendaciones */}
                {selectedConversation.recommendations && selectedConversation.recommendations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Recomendaciones
                    </h4>
                    <div className="space-y-2">
                      {selectedConversation.recommendations.map(rec => (
                        <div
                          key={rec.id}
                          className={cn(
                            "p-2 rounded-lg border flex items-center justify-between gap-2",
                            rec.applied ? "bg-green-500/5 border-green-500/20" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                rec.priority === 'high' ? "border-red-500/50 text-red-600" :
                                rec.priority === 'medium' ? "border-amber-500/50 text-amber-600" :
                                "border-blue-500/50 text-blue-600"
                              )}
                            >
                              {rec.priority}
                            </Badge>
                            <span className="text-xs">{rec.text}</span>
                          </div>
                          {!rec.applied ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleApplyRecommendation(selectedConversation.id, rec.id)}
                            >
                              Aplicar
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600">
                              ✓ Aplicado
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating */}
                <div className="border-t pt-4">
                  <h4 className="text-xs font-medium mb-2">¿Fue útil esta conversación?</h4>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRate(selectedConversation.id, i + 1)}
                      >
                        <Star className={cn(
                          "h-5 w-5",
                          i < (selectedConversation.rating || 0) ? "text-amber-500 fill-current" : "text-muted-foreground"
                        )} />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="font-medium mb-1">Selecciona una conversación</h3>
            <p className="text-sm text-muted-foreground">
              Haz clic en una conversación del historial para ver los detalles
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default CRMAgentConversationHistory;
