/**
 * AutonomousAgentsTrend - Tendencia #1: Agentes IA Autónomos por Vertical
 * Implementación completa con datos de ejemplo
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  PlayCircle,
  PauseCircle,
  Zap,
  Shield,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos de ejemplo de agentes autónomos
const DEMO_AGENTS = [
  {
    id: 'healthcare-agent',
    name: 'Healthcare Agent',
    vertical: 'Healthcare',
    icon: '🏥',
    status: 'active',
    mode: 'autonomous',
    tasksCompleted: 234,
    tasksToday: 18,
    accuracy: 96.5,
    avgResponseTime: 1.2,
    lastAction: 'Análisis de historial clínico completado',
    lastActionTime: '2 min ago',
    capabilities: ['Diagnóstico asistido', 'Gestión citas', 'Historial clínico', 'Alertas medicación'],
    activeGoals: 3,
    pendingApprovals: 2,
  },
  {
    id: 'agriculture-agent',
    name: 'Agriculture Agent',
    vertical: 'Agriculture',
    icon: '🌾',
    status: 'active',
    mode: 'supervised',
    tasksCompleted: 156,
    tasksToday: 12,
    accuracy: 94.2,
    avgResponseTime: 0.8,
    lastAction: 'Predicción de cosecha actualizada',
    lastActionTime: '5 min ago',
    capabilities: ['Monitoreo cultivos', 'Predicción clima', 'Gestión riego', 'Control plagas'],
    activeGoals: 2,
    pendingApprovals: 0,
  },
  {
    id: 'industrial-agent',
    name: 'Industrial Agent',
    vertical: 'Industrial',
    icon: '🏭',
    status: 'active',
    mode: 'autonomous',
    tasksCompleted: 312,
    tasksToday: 25,
    accuracy: 97.8,
    avgResponseTime: 0.5,
    lastAction: 'Mantenimiento predictivo programado',
    lastActionTime: '1 min ago',
    capabilities: ['OEE tracking', 'Mantenimiento predictivo', 'Control calidad', 'Gestión inventario'],
    activeGoals: 4,
    pendingApprovals: 1,
  },
  {
    id: 'services-agent',
    name: 'Services Agent',
    vertical: 'Services',
    icon: '🎯',
    status: 'paused',
    mode: 'supervised',
    tasksCompleted: 189,
    tasksToday: 8,
    accuracy: 93.1,
    avgResponseTime: 1.5,
    lastAction: 'Reporte de satisfacción generado',
    lastActionTime: '15 min ago',
    capabilities: ['CRM automation', 'Ticketing', 'Análisis NPS', 'Routing inteligente'],
    activeGoals: 1,
    pendingApprovals: 0,
  },
];

const RECENT_DECISIONS = [
  { id: 1, agent: 'Industrial Agent', action: 'Programar mantenimiento preventivo', target: 'Línea de producción #3', confidence: 95, status: 'approved', time: '10:45' },
  { id: 2, agent: 'Healthcare Agent', action: 'Enviar recordatorio medicación', target: 'Paciente #4521', confidence: 98, status: 'executed', time: '10:42' },
  { id: 3, agent: 'Agriculture Agent', action: 'Ajustar sistema de riego', target: 'Parcela Norte', confidence: 87, status: 'pending', time: '10:40' },
  { id: 4, agent: 'Services Agent', action: 'Escalar ticket a supervisor', target: 'Ticket #8823', confidence: 92, status: 'approved', time: '10:35' },
  { id: 5, agent: 'Industrial Agent', action: 'Alertar baja de inventario', target: 'Componente XR-42', confidence: 99, status: 'executed', time: '10:30' },
];

interface AutonomousAgentsTrendProps {
  onClose?: () => void;
}

export function AutonomousAgentsTrend({ onClose }: AutonomousAgentsTrendProps) {
  const [agents, setAgents] = useState(DEMO_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState(DEMO_AGENTS[0]);

  const totalTasks = agents.reduce((acc, a) => acc + a.tasksToday, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const avgAccuracy = (agents.reduce((acc, a) => acc + a.accuracy, 0) / agents.length).toFixed(1);

  const handleModeToggle = (agentId: string) => {
    setAgents(prev => prev.map(a => 
      a.id === agentId 
        ? { ...a, mode: a.mode === 'autonomous' ? 'supervised' : 'autonomous' }
        : a
    ));
  };

  const handleStatusToggle = (agentId: string) => {
    setAgents(prev => prev.map(a => 
      a.id === agentId 
        ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
        : a
    ));
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{activeAgents}/{agents.length}</p>
            <p className="text-xs text-muted-foreground">Agentes Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{totalTasks}</p>
            <p className="text-xs text-muted-foreground">Tareas Hoy</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{avgAccuracy}%</p>
            <p className="text-xs text-muted-foreground">Precisión Media</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{agents.filter(a => a.mode === 'autonomous').length}</p>
            <p className="text-xs text-muted-foreground">Modo Autónomo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents Grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agentes por Vertical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div 
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    selectedAgent.id === agent.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.icon}</span>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.lastAction}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status === 'active' ? 'Activo' : 'Pausado'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleStatusToggle(agent.id); }}
                      >
                        {agent.status === 'active' 
                          ? <PauseCircle className="h-4 w-4 text-muted-foreground" />
                          : <PlayCircle className="h-4 w-4 text-green-500" />
                        }
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        {agent.tasksToday} hoy
                      </span>
                      <span className="text-muted-foreground">
                        {agent.accuracy}% precisión
                      </span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <Switch 
                        checked={agent.mode === 'autonomous'}
                        onCheckedChange={() => handleModeToggle(agent.id)}
                      />
                      <Zap className="h-3 w-3 text-amber-500" />
                    </div>
                  </div>

                  {agent.pendingApprovals > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {agent.pendingApprovals} aprobación(es) pendiente(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Detail */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-xl">{selectedAgent.icon}</span>
                {selectedAgent.name}
              </CardTitle>
              <Badge variant={selectedAgent.mode === 'autonomous' ? 'default' : 'secondary'}>
                {selectedAgent.mode === 'autonomous' ? 'Autónomo' : 'Supervisado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{selectedAgent.tasksCompleted}</p>
                <p className="text-xs text-muted-foreground">Total Completadas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{selectedAgent.avgResponseTime}s</p>
                <p className="text-xs text-muted-foreground">Tiempo Respuesta</p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Precisión</span>
                <span className="font-medium">{selectedAgent.accuracy}%</span>
              </div>
              <Progress value={selectedAgent.accuracy} className="h-2" />
            </div>

            {/* Capabilities */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Capacidades</p>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities.map((cap, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Active Goals */}
            <div className="p-3 rounded-lg border bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm">Objetivos Activos</span>
                <Badge>{selectedAgent.activeGoals}</Badge>
              </div>
            </div>

            <Button className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              Abrir Chat con Agente
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Decisions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Decisiones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {RECENT_DECISIONS.map((decision) => (
                <div key={decision.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      decision.status === 'executed' && "bg-green-500",
                      decision.status === 'approved' && "bg-blue-500",
                      decision.status === 'pending' && "bg-amber-500"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{decision.action}</p>
                      <p className="text-xs text-muted-foreground">{decision.agent} → {decision.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline">{decision.confidence}%</Badge>
                    <span className="text-muted-foreground">{decision.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AutonomousAgentsTrend;
