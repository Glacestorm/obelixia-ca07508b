/**
 * Legal Agent Supervisor Panel - Fase 10
 * Supervisión de agentes IA con protocolo de validación legal obligatoria
 * Pre-action compliance para decisiones automatizadas
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Brain,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Scale,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Pause,
  Play,
  Settings,
  Eye,
  MessageSquare,
  Zap,
  Lock,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalAgentSupervisorPanelProps {
  companyId: string;
}

interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'blocked' | 'pending_validation';
  lastAction: string;
  lastActionTime: string;
  pendingValidations: number;
  actionsToday: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AgentAction {
  id: string;
  agentId: string;
  agentName: string;
  actionType: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  legalBasis?: string;
  timestamp: string;
  validatedBy?: string;
}

interface ValidationProtocol {
  id: string;
  name: string;
  description: string;
  agentTypes: string[];
  triggerConditions: string[];
  requiredChecks: string[];
  isActive: boolean;
  autoBlock: boolean;
}

export function LegalAgentSupervisorPanel({ companyId }: LegalAgentSupervisorPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [protocols, setProtocols] = useState<ValidationProtocol[]>([]);
  const [supervisorEnabled, setSupervisorEnabled] = useState(true);

  // Demo agents
  const demoAgents: AgentStatus[] = [
    {
      id: 'hr-agent',
      name: 'HR Autonomous Agent',
      type: 'hr',
      status: 'active',
      lastAction: 'Procesamiento de nóminas',
      lastActionTime: new Date(Date.now() - 1800000).toISOString(),
      pendingValidations: 1,
      actionsToday: 24,
      complianceScore: 96,
      riskLevel: 'low'
    },
    {
      id: 'fiscal-agent',
      name: 'Fiscal Automation Agent',
      type: 'fiscal',
      status: 'pending_validation',
      lastAction: 'Cálculo retenciones IRPF',
      lastActionTime: new Date(Date.now() - 3600000).toISOString(),
      pendingValidations: 2,
      actionsToday: 18,
      complianceScore: 92,
      riskLevel: 'medium'
    },
    {
      id: 'treasury-agent',
      name: 'Treasury Management Agent',
      type: 'treasury',
      status: 'blocked',
      lastAction: 'Transferencia internacional bloqueada',
      lastActionTime: new Date(Date.now() - 900000).toISOString(),
      pendingValidations: 0,
      actionsToday: 8,
      complianceScore: 78,
      riskLevel: 'high'
    },
    {
      id: 'contract-agent',
      name: 'Contract Analysis Agent',
      type: 'contracts',
      status: 'active',
      lastAction: 'Revisión de cláusulas NDA',
      lastActionTime: new Date(Date.now() - 7200000).toISOString(),
      pendingValidations: 0,
      actionsToday: 12,
      complianceScore: 98,
      riskLevel: 'low'
    }
  ];

  // Demo pending actions
  const demoPendingActions: AgentAction[] = [
    {
      id: '1',
      agentId: 'hr-agent',
      agentName: 'HR Autonomous Agent',
      actionType: 'employee_termination_process',
      description: 'Iniciar proceso de despido para empleado EMP-2024-089',
      status: 'pending',
      riskLevel: 'critical',
      legalBasis: 'Art. 54 ET - Despido disciplinario',
      timestamp: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: '2',
      agentId: 'fiscal-agent',
      agentName: 'Fiscal Automation Agent',
      actionType: 'tax_payment_execution',
      description: 'Ejecutar pago de IVA trimestral - €34,560',
      status: 'pending',
      riskLevel: 'high',
      legalBasis: 'Modelo 303 - Autoliquidación IVA',
      timestamp: new Date(Date.now() - 2400000).toISOString()
    },
    {
      id: '3',
      agentId: 'fiscal-agent',
      agentName: 'Fiscal Automation Agent',
      actionType: 'withholding_calculation',
      description: 'Recálculo masivo de retenciones IRPF 2026',
      status: 'pending',
      riskLevel: 'medium',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '4',
      agentId: 'treasury-agent',
      agentName: 'Treasury Management Agent',
      actionType: 'international_transfer',
      description: 'Transferencia a UAE - €125,000 (AML review required)',
      status: 'blocked',
      riskLevel: 'critical',
      legalBasis: 'Ley 10/2010 - Prevención blanqueo capitales',
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ];

  // Demo protocols
  const demoProtocols: ValidationProtocol[] = [
    {
      id: '1',
      name: 'Protocolo HR Crítico',
      description: 'Validación obligatoria para acciones de despido y modificación sustancial',
      agentTypes: ['hr'],
      triggerConditions: ['termination', 'salary_reduction', 'contract_modification'],
      requiredChecks: ['Validación legal laboral', 'Check convenio colectivo', 'Verificación plazos'],
      isActive: true,
      autoBlock: true
    },
    {
      id: '2',
      name: 'Protocolo Fiscal Alto Riesgo',
      description: 'Revisión legal para pagos fiscales superiores a umbrales',
      agentTypes: ['fiscal'],
      triggerConditions: ['payment_above_threshold', 'rectificación', 'aplazamiento'],
      requiredChecks: ['Validación normativa', 'Check plazos legales', 'Verificación cálculos'],
      isActive: true,
      autoBlock: false
    },
    {
      id: '3',
      name: 'Protocolo AML/KYC',
      description: 'Validación anti-blanqueo para transferencias internacionales',
      agentTypes: ['treasury'],
      triggerConditions: ['international_transfer', 'large_payment', 'new_beneficiary'],
      requiredChecks: ['Verificación AML', 'Due diligence', 'Sanction list check'],
      isActive: true,
      autoBlock: true
    }
  ];

  useEffect(() => {
    setAgents(demoAgents);
    setPendingActions(demoPendingActions);
    setProtocols(demoProtocols);
  }, []);

  const handleActionValidation = useCallback(async (
    actionId: string,
    decision: 'approve' | 'reject'
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'validate_agent_action',
          context: { companyId },
          params: { actionId, decision }
        }
      });

      if (error) throw error;

      setPendingActions(prev =>
        prev.map(action =>
          action.id === actionId
            ? { ...action, status: decision === 'approve' ? 'approved' : 'rejected' }
            : action
        )
      );

      toast.success(`Acción ${decision === 'approve' ? 'aprobada' : 'rechazada'}`);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Error al validar acción');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const toggleAgentStatus = useCallback((agentId: string) => {
    setAgents(prev =>
      prev.map(agent => {
        if (agent.id === agentId) {
          const newStatus = agent.status === 'active' ? 'paused' : 'active';
          toast.success(`Agente ${newStatus === 'active' ? 'activado' : 'pausado'}`);
          return { ...agent, status: newStatus };
        }
        return agent;
      })
    );
  }, []);

  const getAgentStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-500/10 text-green-600', icon: Play, label: 'Activo' },
      paused: { color: 'bg-yellow-500/10 text-yellow-600', icon: Pause, label: 'Pausado' },
      blocked: { color: 'bg-red-500/10 text-red-600', icon: Lock, label: 'Bloqueado' },
      pending_validation: { color: 'bg-blue-500/10 text-blue-600', icon: Clock, label: 'Pendiente' }
    };
    const c = config[status as keyof typeof config] || config.active;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={c.color}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const getRiskBadge = (level: string) => {
    const config = {
      low: { color: 'bg-green-500/10 text-green-600', label: 'Bajo' },
      medium: { color: 'bg-yellow-500/10 text-yellow-600', label: 'Medio' },
      high: { color: 'bg-orange-500/10 text-orange-600', label: 'Alto' },
      critical: { color: 'bg-red-500/10 text-red-600', label: 'Crítico' }
    };
    const c = config[level as keyof typeof config] || config.medium;
    return <Badge variant="outline" className={c.color}>{c.label}</Badge>;
  };

  const getActionStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4 text-blue-500" />,
      approved: <CheckCircle className="h-4 w-4 text-green-500" />,
      rejected: <XCircle className="h-4 w-4 text-red-500" />,
      executed: <Zap className="h-4 w-4 text-purple-500" />,
      blocked: <Lock className="h-4 w-4 text-orange-500" />
    };
    return icons[status as keyof typeof icons] || icons.pending;
  };

  const totalPending = pendingActions.filter(a => a.status === 'pending').length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const blockedAgents = agents.filter(a => a.status === 'blocked').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Legal Agent Supervisor
                  {supervisorEnabled ? (
                    <Badge className="bg-green-500/20 text-green-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Supervisando
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Desactivado
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Protocolo de validación legal obligatorio para agentes autónomos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Supervisor</span>
                <Switch
                  checked={supervisorEnabled}
                  onCheckedChange={setSupervisorEnabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Bot className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAgents}</p>
                <p className="text-xs text-muted-foreground">Agentes activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-xs text-muted-foreground">Acciones pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Lock className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blockedAgents}</p>
                <p className="text-xs text-muted-foreground">Agentes bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{protocols.filter(p => p.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Protocolos activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="actions" className="relative">
            Acciones
            {totalPending > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {totalPending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="protocols">Protocolos</TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className={agent.status === 'blocked' ? 'border-red-500/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        agent.status === 'active' ? 'bg-green-500/10' :
                        agent.status === 'blocked' ? 'bg-red-500/10' :
                        'bg-muted'
                      }`}>
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">Tipo: {agent.type}</p>
                      </div>
                    </div>
                    {getAgentStatusBadge(agent.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Compliance Score</span>
                      <span className="font-medium">{agent.complianceScore}%</span>
                    </div>
                    <Progress value={agent.complianceScore} className="h-2" />
                    
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{agent.actionsToday}</p>
                        <p className="text-xs text-muted-foreground">Acciones</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-blue-500">{agent.pendingValidations}</p>
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        {getRiskBadge(agent.riskLevel)}
                        <p className="text-xs text-muted-foreground mt-1">Riesgo</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Última acción:</p>
                      <p className="text-sm">{agent.lastAction}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(agent.lastActionTime), { locale: es, addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {agent.status !== 'blocked' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => toggleAgentStatus(agent.id)}
                        >
                          {agent.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Activar
                            </>
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Acciones Pendientes de Validación Legal</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingActions.filter(a => a.status === 'pending' || a.status === 'blocked').map((action) => (
                  <Card key={action.id} className={`border-l-4 ${
                    action.riskLevel === 'critical' ? 'border-l-red-500' :
                    action.riskLevel === 'high' ? 'border-l-orange-500' :
                    'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {action.agentName}
                            </Badge>
                            {getRiskBadge(action.riskLevel)}
                            <div className="flex items-center gap-1">
                              {getActionStatusIcon(action.status)}
                              <span className="text-xs capitalize">{action.status}</span>
                            </div>
                          </div>
                          <h4 className="font-medium">{action.description}</h4>
                          {action.legalBasis && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <Scale className="h-3 w-3 inline mr-1" />
                              Base legal: {action.legalBasis}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(action.timestamp), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        {action.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActionValidation(action.id, 'reject')}
                              disabled={isLoading}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleActionValidation(action.id, 'approve')}
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingActions.filter(a => a.status === 'pending' || a.status === 'blocked').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay acciones pendientes de validación</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Protocolos de Validación</CardTitle>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Nuevo Protocolo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {protocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className={`p-4 rounded-lg border ${protocol.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{protocol.name}</h4>
                          {protocol.autoBlock && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Auto-bloqueo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{protocol.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {protocol.agentTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Checks requeridos:</p>
                          <ul className="text-xs space-y-1">
                            {protocol.requiredChecks.map((check, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {check}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Switch
                        checked={protocol.isActive}
                        onCheckedChange={() => {
                          setProtocols(prev =>
                            prev.map(p =>
                              p.id === protocol.id ? { ...p, isActive: !p.isActive } : p
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalAgentSupervisorPanel;
