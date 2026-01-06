/**
 * CRMCommandCenter - Centro de Comando Estratosférico para Agentes CRM
 * Mission Control con KPIs en tiempo real, radar de dominios e insights IA
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Radar,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Brain,
  Target,
  Users,
  DollarSign,
  BarChart3,
  RefreshCw,
  Loader2,
  Sparkles,
  Eye,
  Send,
  Bot,
  Maximize2,
  Minimize2,
  Clock,
  Award,
  Shield,
  GitBranch,
  Heart,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCRMAgentAI, CRMDomainAnalysis, CRMStrategicInsight } from '@/hooks/admin/agents/useCRMAgentAI';

// === TIPOS ===
interface CRMDomain {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  health: number;
  trend: 'up' | 'down' | 'stable';
  activeAgents: number;
  lastActivity: Date;
}

interface CRMCommandCenterProps {
  className?: string;
}

// === DOMINIOS CRM ===
const CRM_DOMAINS: CRMDomain[] = [
  { id: 'leads', name: 'Leads', icon: Target, color: 'from-blue-500 to-cyan-500', health: 0, trend: 'stable', activeAgents: 2, lastActivity: new Date() },
  { id: 'pipeline', name: 'Pipeline', icon: GitBranch, color: 'from-violet-500 to-purple-500', health: 0, trend: 'stable', activeAgents: 2, lastActivity: new Date() },
  { id: 'customers', name: 'Clientes', icon: Heart, color: 'from-pink-500 to-rose-500', health: 0, trend: 'stable', activeAgents: 3, lastActivity: new Date() },
  { id: 'activities', name: 'Actividades', icon: Calendar, color: 'from-amber-500 to-orange-500', health: 0, trend: 'stable', activeAgents: 1, lastActivity: new Date() },
  { id: 'forecast', name: 'Forecast', icon: BarChart3, color: 'from-emerald-500 to-teal-500', health: 0, trend: 'stable', activeAgents: 1, lastActivity: new Date() },
];

// === COMPONENTE PRINCIPAL ===
export function CRMCommandCenter({ className }: CRMCommandCenterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [domains, setDomains] = useState<CRMDomain[]>(CRM_DOMAINS);
  const [commandInput, setCommandInput] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'insights' | 'chat'>('overview');

  const {
    isLoading,
    lastAnalysis,
    insights,
    chatHistory,
    analyzeDomain,
    getInsights,
    chat,
    clearChat
  } = useCRMAgentAI();

  // === CARGAR DATOS INICIALES ===
  useEffect(() => {
    const loadInitialData = async () => {
      await getInsights({ source: 'command_center' });
      
      // Simular datos de salud de dominios
      setDomains(prev => prev.map(d => ({
        ...d,
        health: 70 + Math.random() * 25,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
        lastActivity: new Date(Date.now() - Math.random() * 3600000)
      })));
    };
    loadInitialData();
  }, []);

  // === MÉTRICAS GLOBALES ===
  const globalMetrics = useMemo(() => {
    const avgHealth = domains.reduce((sum, d) => sum + d.health, 0) / domains.length;
    const totalAgents = domains.reduce((sum, d) => sum + d.activeAgents, 0);
    const criticalInsights = insights.filter(i => i.urgency === 'immediate').length;
    const opportunities = insights.filter(i => i.type === 'opportunity').length;
    
    return {
      systemHealth: avgHealth,
      activeAgents: totalAgents,
      criticalAlerts: criticalInsights,
      opportunities,
      totalInsights: insights.length
    };
  }, [domains, insights]);

  // === HANDLERS ===
  const handleAnalyzeDomain = useCallback(async (domainId: string) => {
    setSelectedDomain(domainId);
    const result = await analyzeDomain(domainId, { detailed: true });
    if (result) {
      setDomains(prev => prev.map(d => 
        d.id === domainId 
          ? { ...d, health: result.domainHealth, trend: result.trend === 'improving' ? 'up' : result.trend === 'declining' ? 'down' : 'stable' }
          : d
      ));
    }
  }, [analyzeDomain]);

  const handleSendCommand = useCallback(async () => {
    if (!commandInput.trim()) return;
    await chat(commandInput, 'supervisor_crm');
    setCommandInput('');
  }, [commandInput, chat]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  }, [handleSendCommand]);

  // === RENDER ===
  return (
    <Card className={cn(
      "transition-all duration-500 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      {/* Header Premium */}
      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-purple-600/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50 animate-pulse" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Command className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                CRM Command Center
                <Badge variant="outline" className="text-[10px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  IA Real
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Mission Control • {globalMetrics.activeAgents} agentes activos • {globalMetrics.totalInsights} insights
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => getInsights()}
              disabled={isLoading}
              className="h-8"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1.5 text-xs">Actualizar</span>
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

      <CardContent className={cn("p-4", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              <Radar className="h-3.5 w-3.5 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="domains" className="text-xs">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Dominios
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              Insights
              {globalMetrics.criticalAlerts > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                  {globalMetrics.criticalAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat IA
            </TabsTrigger>
          </TabsList>

          {/* TAB: OVERVIEW */}
          <TabsContent value="overview" className="flex-1 mt-0 space-y-4">
            {/* KPIs Globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sistema</p>
                      <p className="text-xl font-bold text-green-600">{globalMetrics.systemHealth.toFixed(0)}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <Progress value={globalMetrics.systemHealth} className="h-1 mt-2" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Agentes</p>
                      <p className="text-xl font-bold text-blue-600">{globalMetrics.activeAgents}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Todos operativos</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alertas</p>
                      <p className="text-xl font-bold text-amber-600">{globalMetrics.criticalAlerts}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Requieren atención</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Oportunidades</p>
                      <p className="text-xl font-bold text-violet-600">{globalMetrics.opportunities}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-violet-500/20">
                      <DollarSign className="h-4 w-4 text-violet-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Detectadas por IA</p>
                </CardContent>
              </Card>
            </div>

            {/* Radar de Dominios */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Radar className="h-4 w-4" />
                  Radar de Dominios CRM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {domains.map((domain) => {
                    const Icon = domain.icon;
                    return (
                      <motion.div
                        key={domain.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnalyzeDomain(domain.id)}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all",
                          selectedDomain === domain.id 
                            ? "ring-2 ring-primary shadow-lg" 
                            : "hover:shadow-md"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", domain.color)}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-xs font-medium">{domain.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{domain.health.toFixed(0)}%</span>
                          {domain.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                          {domain.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                          {domain.trend === 'stable' && <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {domain.activeAgents} agente{domain.activeAgents !== 1 ? 's' : ''}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Últimos Insights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Insights Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {insights.slice(0, 5).map((insight, i) => (
                      <div 
                        key={insight.id || i}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-start gap-2",
                          insight.type === 'opportunity' && "bg-green-500/5 border-green-500/20",
                          insight.type === 'risk' && "bg-red-500/5 border-red-500/20",
                          insight.type === 'optimization' && "bg-blue-500/5 border-blue-500/20"
                        )}
                      >
                        {insight.type === 'opportunity' && <DollarSign className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                        {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                        {insight.type === 'optimization' && <Zap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{insight.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{insight.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {insight.confidence}%
                        </Badge>
                      </div>
                    ))}
                    {insights.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Analizando datos...</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: DOMAINS */}
          <TabsContent value="domains" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {domains.map((domain) => {
                  const Icon = domain.icon;
                  return (
                    <Card 
                      key={domain.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedDomain === domain.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleAnalyzeDomain(domain.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", domain.color)}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{domain.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {domain.activeAgents} agentes • Actualizado {formatDistanceToNow(domain.lastActivity, { locale: es, addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">{domain.health.toFixed(0)}%</span>
                              {domain.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                              {domain.trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                              {domain.trend === 'stable' && <Activity className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                        </div>
                        <Progress value={domain.health} className="h-2" />
                        
                        {selectedDomain === domain.id && lastAnalysis && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t space-y-3"
                          >
                            {lastAnalysis.insights?.slice(0, 3).map((insight, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                {insight.type === 'opportunity' && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
                                {insight.type === 'risk' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />}
                                {insight.type === 'recommendation' && <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />}
                                <div>
                                  <p className="font-medium">{insight.title}</p>
                                  <p className="text-muted-foreground">{insight.description}</p>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: INSIGHTS */}
          <TabsContent value="insights" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <motion.div
                    key={insight.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 rounded-lg border",
                      insight.urgency === 'immediate' && "bg-red-500/5 border-red-500/30",
                      insight.urgency === 'this_week' && "bg-amber-500/5 border-amber-500/30",
                      insight.urgency === 'this_month' && "bg-blue-500/5 border-blue-500/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {insight.type === 'opportunity' && <DollarSign className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                        {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                        {insight.type === 'optimization' && <Zap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                        {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />}
                        {insight.type === 'action' && <Target className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {insight.suggestedActions.slice(0, 2).map((action, j) => (
                                <Badge key={j} variant="secondary" className="text-[10px]">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge 
                          variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {insight.impact}
                        </Badge>
                        {insight.potentialValue > 0 && (
                          <p className="text-xs font-semibold text-green-600 mt-1">
                            €{insight.potentialValue.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {insights.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay insights disponibles</p>
                    <p className="text-xs">La IA está analizando los datos...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: CHAT IA */}
          <TabsContent value="chat" className="flex-1 mt-0 flex flex-col">
            <ScrollArea className={cn("flex-1 mb-3", isExpanded ? "h-[calc(100vh-350px)]" : "h-[300px]")}>
              <div className="space-y-3 p-1">
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 h-fit">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-xl text-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {format(msg.timestamp, 'HH:mm', { locale: es })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Analizando...</span>
                  </div>
                )}
                {chatHistory.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Inicia una conversación con el Supervisor CRM</p>
                    <p className="text-xs">Pregunta sobre leads, pipeline, churn o cualquier métrica CRM</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un comando o pregunta..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendCommand}
                disabled={isLoading || !commandInput.trim()}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              {chatHistory.length > 0 && (
                <Button variant="outline" size="icon" onClick={clearChat}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CRMCommandCenter;
