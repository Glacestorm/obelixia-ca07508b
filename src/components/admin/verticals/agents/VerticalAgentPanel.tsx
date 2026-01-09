import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Power, 
  PowerOff, 
  Sparkles, 
  Shield, 
  Zap,
  MessageSquare,
  ListTodo,
  History,
  AlertCircle
} from 'lucide-react';
import { useVerticalAgent, VerticalType, AgentMode } from '@/hooks/admin/verticals/agents/useVerticalAgent';
import { AgentChatInterface } from './AgentChatInterface';
import { AgentTaskMonitor } from './AgentTaskMonitor';
import { AgentDecisionHistory } from './AgentDecisionHistory';
import { cn } from '@/lib/utils';

interface VerticalAgentPanelProps {
  verticalType: VerticalType;
  context?: Record<string, unknown>;
  className?: string;
}

const VERTICAL_CONFIG: Record<VerticalType, { name: string; icon: string; color: string }> = {
  healthcare: { name: 'Healthcare', icon: '🏥', color: 'from-red-500 to-pink-500' },
  agriculture: { name: 'Agriculture', icon: '🌾', color: 'from-green-500 to-emerald-500' },
  industrial: { name: 'Industrial', icon: '🏭', color: 'from-blue-500 to-indigo-500' },
  services: { name: 'Services', icon: '🎯', color: 'from-purple-500 to-violet-500' },
};

export function VerticalAgentPanel({ verticalType, context, className }: VerticalAgentPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  
  const {
    session,
    isLoading,
    isTyping,
    tasks,
    pendingApprovals,
    startSession,
    endSession,
    sendMessage,
    approveTask,
    rejectTask,
    switchMode,
    getDecisionHistory,
  } = useVerticalAgent();

  const config = VERTICAL_CONFIG[verticalType];
  const isActive = session?.status === 'active';

  const handleToggleSession = async () => {
    if (isActive) {
      await endSession();
    } else {
      await startSession({
        verticalType,
        mode: 'supervised',
        context,
      });
    }
  };

  const handleModeChange = async (checked: boolean) => {
    await switchMode(checked ? 'autonomous' : 'supervised');
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn(
        "pb-3 bg-gradient-to-r",
        config.color,
        "text-white"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{config.icon}</span>
                Agente {config.name}
              </CardTitle>
              <p className="text-xs text-white/80">
                {isActive 
                  ? `Modo ${session?.agentMode === 'autonomous' ? 'Autónomo' : 'Supervisado'}`
                  : 'Inactivo'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive && (
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium">Supervisado</span>
                <Switch
                  checked={session?.agentMode === 'autonomous'}
                  onCheckedChange={handleModeChange}
                  className="data-[state=checked]:bg-yellow-400"
                />
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">Autónomo</span>
              </div>
            )}
            
            <Button
              variant={isActive ? "destructive" : "secondary"}
              size="sm"
              onClick={handleToggleSession}
              disabled={isLoading}
              className="gap-2"
            >
              {isActive ? (
                <>
                  <PowerOff className="h-4 w-4" />
                  Detener
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" />
                  Iniciar
                </>
              )}
            </Button>
          </div>
        </div>

        {isActive && pendingApprovals.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-yellow-500/30 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 text-yellow-200" />
            <span className="text-sm">
              {pendingApprovals.length} acción{pendingApprovals.length > 1 ? 'es' : ''} pendiente{pendingApprovals.length > 1 ? 's' : ''} de aprobación
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {!isActive ? (
          <div className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              Inicia el agente para comenzar
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              El agente puede ejecutar tareas de forma supervisada o autónoma
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 pt-2">
              <TabsTrigger 
                value="chat" 
                className="gap-2 data-[state=active]:bg-primary/10"
              >
                <MessageSquare className="h-4 w-4" />
                Chat
                {isTyping && (
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="gap-2 data-[state=active]:bg-primary/10"
              >
                <ListTodo className="h-4 w-4" />
                Tareas
                {pendingApprovals.length > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="gap-2 data-[state=active]:bg-primary/10"
              >
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="m-0 h-[400px]">
              <AgentChatInterface
                messages={session?.conversationHistory || []}
                isTyping={isTyping}
                onSendMessage={sendMessage}
                pendingApprovals={pendingApprovals}
                onApprove={approveTask}
                onReject={rejectTask}
              />
            </TabsContent>

            <TabsContent value="tasks" className="m-0 h-[400px]">
              <AgentTaskMonitor
                tasks={tasks}
                pendingApprovals={pendingApprovals}
                onApprove={approveTask}
                onReject={rejectTask}
              />
            </TabsContent>

            <TabsContent value="history" className="m-0 h-[400px]">
              <AgentDecisionHistory
                decisions={getDecisionHistory()}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default VerticalAgentPanel;
