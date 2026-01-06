/**
 * CRMAgentsPanel - Panel de agentes especializados para CRM
 * Similar a ERPModuleAgentsPanel pero para el módulo CRM
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Brain, 
  Target,
  TrendingUp,
  Heart,
  AlertTriangle,
  Zap,
  MessageSquare,
  UserPlus,
  Calendar,
  BarChart3,
  GitBranch,
  Send,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Loader2,
  Sparkles,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCRMModuleAgents, CRM_AGENT_CONFIG, CRMModuleAgent } from '@/hooks/crm/agents';
import { AgentHelpSheet } from '@/components/admin/agents/help/AgentHelpSheet';

// Mapeo de iconos
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

function AgentCard({ 
  agent, 
  config,
  onExecute, 
  onChat,
  onHelp,
  isLoading 
}: { 
  agent: CRMModuleAgent;
  config: typeof CRM_AGENT_CONFIG[keyof typeof CRM_AGENT_CONFIG];
  onExecute: () => void;
  onChat: () => void;
  onHelp: () => void;
  isLoading: boolean;
}) {
  const Icon = AGENT_ICONS[agent.type] || Bot;
  
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-muted-foreground/50',
    analyzing: 'bg-blue-500 animate-pulse',
    error: 'bg-destructive',
    paused: 'bg-amber-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className={cn("h-1 bg-gradient-to-r", config.color)} />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg bg-gradient-to-br", config.color, "text-white")}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">{agent.name}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
              </div>
            </div>
            <div className={cn("w-2 h-2 rounded-full", statusColors[agent.status])} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Health Score</span>
            <div className="flex items-center gap-2">
              <Progress value={agent.healthScore} className="w-16 h-1.5" />
              <span className="text-xs font-medium">{agent.healthScore}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2 text-center">
              <p className="font-semibold">{agent.metrics.actionsGenerated || 0}</p>
              <p className="text-muted-foreground">Acciones</p>
            </div>
            <div className="bg-muted/50 rounded p-2 text-center">
              <p className="font-semibold">{agent.metrics.successRate || 100}%</p>
              <p className="text-muted-foreground">Éxito</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Última actividad: {formatDistanceToNow(new Date(agent.lastActivity), { locale: es, addSuffix: true })}
          </div>

          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-7 text-xs"
              onClick={onExecute}
              disabled={isLoading || agent.status === 'paused'}
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Ejecutar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={onChat}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={onHelp}
              title="Ayuda del agente"
            >
              <HelpCircle className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CRMAgentsPanel() {
  const [activeTab, setActiveTab] = useState('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [helpAgentId, setHelpAgentId] = useState<string | null>(null);

  const {
    isLoading,
    agents,
    supervisorStatus,
    insights,
    initializeAgents,
    executeAgent,
    supervisorOrchestrate,
    sendMessageToAgent,
    toggleAgent,
    toggleAutonomousMode
  } = useCRMModuleAgents();

  // Fase 3: Guard de inicialización única para evitar recursión
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeAgents();
    }
  }, []); // Solo en mount, sin dependencia de initializeAgents

  const handleExecute = useCallback(async (agentId: string) => {
    await executeAgent(agentId, { trigger: 'manual' });
  }, [executeAgent]);

  const handleChat = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setChatMessages([]);
    setActiveTab('chat');
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !selectedAgentId) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);
    
    try {
      const response = await sendMessageToAgent(selectedAgentId, userMessage);
      if (response) {
        setChatMessages(prev => [...prev, { role: 'agent', content: response }]);
      }
    } finally {
      setIsChatting(false);
    }
  }, [chatInput, selectedAgentId, sendMessageToAgent]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="space-y-4">
      {/* Header con métricas del supervisor */}
      <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Supervisor CRM AI</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {agents.length} agentes especializados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Autónomo</span>
                <Switch 
                  checked={supervisorStatus?.autonomousMode || false}
                  onCheckedChange={(checked) => toggleAutonomousMode(checked, 90000)}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => supervisorOrchestrate('Análisis general del pipeline', 'medium')}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-1">Orquestar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{supervisorStatus?.systemHealth || 0}%</p>
              <p className="text-xs text-muted-foreground">Salud Sistema</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{supervisorStatus?.activeAgents || 0}</p>
              <p className="text-xs text-muted-foreground">Agentes Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{supervisorStatus?.insightsGenerated || 0}</p>
              <p className="text-xs text-muted-foreground">Insights</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{supervisorStatus?.predictiveAccuracy || 0}%</p>
              <p className="text-xs text-muted-foreground">Precisión</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  config={CRM_AGENT_CONFIG[agent.type]}
                  onExecute={() => handleExecute(agent.id)}
                  onChat={() => handleChat(agent.id)}
                  onHelp={() => setHelpAgentId(agent.type)}
                  isLoading={isLoading && agent.status === 'analyzing'}
                />
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Insights del Supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ejecuta una orquestación para generar insights
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {insights.map((insight) => (
                      <div 
                        key={insight.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          insight.priority === 'critical' && 'border-destructive/50 bg-destructive/5',
                          insight.priority === 'high' && 'border-amber-500/50 bg-amber-500/5',
                          insight.priority === 'medium' && 'border-blue-500/50 bg-blue-500/5',
                          insight.priority === 'low' && 'border-muted'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {insight.type}
                          </Badge>
                        </div>
                        {insight.suggestedAction && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                            <ChevronRight className="h-3 w-3" />
                            {insight.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center gap-2">
                {selectedAgent ? (
                  <>
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br text-white",
                      CRM_AGENT_CONFIG[selectedAgent.type].color
                    )}>
                      {React.createElement(AGENT_ICONS[selectedAgent.type] || Bot, { className: 'h-4 w-4' })}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{selectedAgent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{selectedAgent.description}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 text-emerald-500" />
                    <div>
                      <CardTitle className="text-sm">Selecciona un agente</CardTitle>
                      <p className="text-xs text-muted-foreground">Click en "Chat" en cualquier agente</p>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {chatMessages.length === 0 && selectedAgent && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Envía instrucciones al {selectedAgent.name}
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'agent' && (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <span className="text-sm text-muted-foreground">Procesando...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={selectedAgent ? `Mensaje para ${selectedAgent.name}...` : 'Selecciona un agente primero'}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isChatting || !selectedAgent}
              />
              <Button 
                size="icon" 
                onClick={handleSendMessage} 
                disabled={isChatting || !chatInput.trim() || !selectedAgent}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Help Sheet */}
      <AgentHelpSheet
        open={!!helpAgentId}
        onOpenChange={(open) => !open && setHelpAgentId(null)}
        agentId={helpAgentId || ''}
        agentType="crm"
      />
    </div>
  );
}

export default CRMAgentsPanel;
