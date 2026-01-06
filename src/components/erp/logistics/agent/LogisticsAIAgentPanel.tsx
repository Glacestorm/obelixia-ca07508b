/**
 * LogisticsAIAgentPanel - Agente de IA especializado en Logística
 * Copilot con capacidades de análisis, optimización, predicción y chat
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  RefreshCw,
  Send,
  Sparkles,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Zap,
  Package,
  Truck,
  Route,
  Calculator,
  MessageCircle,
  Maximize2,
  Minimize2,
  Bot,
  User
} from 'lucide-react';
import { useERPLogistics } from '@/hooks/erp/useERPLogistics';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentAnalysis {
  summary?: string;
  healthScore?: number;
  issues?: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    suggestedAction?: string;
    estimatedImpact?: string;
  }>;
  opportunities?: Array<{
    type: string;
    title: string;
    description: string;
    potentialSaving?: string;
  }>;
  kpis?: {
    deliveryRate?: number;
    onTimeDelivery?: number;
    costEfficiency?: number;
    fleetUtilization?: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function LogisticsAIAgentPanel() {
  const { currentCompany } = useERPContext();
  const { stats, shipments, carriers, vehicles } = useERPLogistics();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Build context for AI
  const buildContext = useCallback(() => ({
    companyId: currentCompany?.id,
    shipments: shipments.slice(0, 50),
    carriers,
    vehicles,
    stats
  }), [currentCompany?.id, shipments, carriers, vehicles, stats]);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!currentCompany?.id) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('logistics-ai-agent', {
        body: {
          action: 'analyze',
          context: buildContext()
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setAnalysis(data.data);
        setLastAnalysis(new Date());
        
        const issues = data.data.issues || [];
        const errors = issues.filter((i: any) => i.severity === 'error').length;
        
        if (errors > 0) {
          toast.warning(`Detectados ${errors} problemas críticos en logística`);
        } else {
          toast.success('Análisis de logística completado');
        }
      }
    } catch (err) {
      console.error('[LogisticsAIAgent] Analysis error:', err);
      toast.error('Error al analizar logística');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCompany?.id, buildContext]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('logistics-ai-agent', {
        body: {
          action: 'chat',
          message: chatInput,
          context: buildContext(),
          conversationHistory: chatMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      if (data?.success && data?.response) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('[LogisticsAIAgent] Chat error:', err);
      toast.error('Error en el chat');
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, buildContext, chatMessages]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initial analysis
  useEffect(() => {
    if (currentCompany?.id && !analysis) {
      runAnalysis();
    }
  }, [currentCompany?.id]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!currentCompany) {
    return (
      <Card className="border-dashed opacity-50">
        <CardContent className="py-6 text-center">
          <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Selecciona una empresa para activar el Agente IA
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : ""
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg",
              isAnalyzing && "animate-pulse"
            )}>
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Agente Logística IA
                <Badge variant="default" className="text-xs bg-gradient-to-r from-purple-600 to-blue-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Activo
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastAnalysis 
                  ? `Último análisis ${formatDistanceToNow(lastAnalysis, { locale: es, addSuffix: true })}`
                  : 'Copiloto inteligente de logística'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <Activity className="h-3 w-3" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs gap-1">
              <Lightbulb className="h-3 w-3" />
              Insights
              {analysis?.opportunities?.length ? (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {analysis.opportunities.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Problemas
              {analysis?.issues?.length ? (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {analysis.issues.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs gap-1">
              <MessageCircle className="h-3 w-3" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
              <div className="space-y-4">
                {/* Health Score */}
                {analysis?.healthScore !== undefined && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Salud Operacional</span>
                      <span className={cn("text-2xl font-bold", getHealthColor(analysis.healthScore))}>
                        {analysis.healthScore}%
                      </span>
                    </div>
                    <Progress value={analysis.healthScore} className="h-2" />
                  </div>
                )}

                {/* Summary */}
                {analysis?.summary && (
                  <div className="p-3 rounded-lg border bg-card">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Resumen Ejecutivo
                    </h4>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  </div>
                )}

                {/* KPIs */}
                {analysis?.kpis && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border text-center">
                      <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                      <p className="text-lg font-bold">{analysis.kpis.deliveryRate || 0}%</p>
                      <p className="text-xs text-muted-foreground">Tasa Entrega</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Truck className="h-5 w-5 mx-auto mb-1 text-green-500" />
                      <p className="text-lg font-bold">{analysis.kpis.onTimeDelivery || 0}%</p>
                      <p className="text-xs text-muted-foreground">A Tiempo</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Calculator className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                      <p className="text-lg font-bold">{analysis.kpis.costEfficiency || 0}%</p>
                      <p className="text-xs text-muted-foreground">Eficiencia Coste</p>
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <Route className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                      <p className="text-lg font-bold">{analysis.kpis.fleetUtilization || 0}%</p>
                      <p className="text-xs text-muted-foreground">Uso Flota</p>
                    </div>
                  </div>
                )}

                {!analysis && !isAnalyzing && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Sin análisis disponible</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={runAnalysis}>
                      <Zap className="h-4 w-4 mr-1" />
                      Ejecutar Análisis
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
              <div className="space-y-3">
                {analysis?.opportunities?.map((opp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{opp.description}</p>
                        {opp.potentialSaving && (
                          <Badge variant="outline" className="mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {opp.potentialSaving}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!analysis?.opportunities || analysis.opportunities.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500/50" />
                    <p className="text-sm">Sin oportunidades detectadas</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[320px]"}>
              <div className="space-y-3">
                {analysis?.issues?.map((issue, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-3 rounded-lg border",
                      issue.severity === 'error' && "bg-destructive/5 border-destructive/20",
                      issue.severity === 'warning' && "bg-yellow-500/5 border-yellow-500/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                        {issue.suggestedAction && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium">Acción sugerida:</span> {issue.suggestedAction}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!analysis?.issues || analysis.issues.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium">Todo en orden</p>
                    <p className="text-xs">No se han detectado problemas</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 mt-0 flex flex-col">
            <ScrollArea className={cn("flex-1", isExpanded ? "h-[calc(100vh-340px)]" : "h-[260px]")}>
              <div className="space-y-3 pr-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Bot className="h-10 w-10 mx-auto mb-3 text-primary/50" />
                    <p className="text-sm font-medium">Chat con el Agente Logística</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pregunta sobre envíos, rutas, costes o cualquier tema de logística
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[
                        '¿Cómo optimizo mis rutas?',
                        '¿Qué operadora es más eficiente?',
                        'Analiza mis costes de envío'
                      ].map((suggestion, idx) => (
                        <Button 
                          key={idx}
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={() => {
                            setChatInput(suggestion);
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-lg text-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <Separator className="my-2" />
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                disabled={isChatLoading}
              />
              <Button 
                size="icon" 
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LogisticsAIAgentPanel;
