/**
 * ERPCommandCenter - Dashboard tipo Mission Control para agentes ERP
 * Vista unificada con KPIs críticos, estado del sistema y acciones rápidas
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  Clock,
  Globe,
  Layers,
  Radar,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  Eye,
  BellRing,
  Cpu,
  Database,
  Network
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar
} from 'recharts';
import { cn } from '@/lib/utils';
import type { AgentDomain, SupervisorStatus, DomainAgent } from '@/hooks/admin/agents/erpAgentTypes';
import { DOMAIN_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';
import { useERPAgentAI, type DomainAnalysis, type StrategicInsight } from '@/hooks/admin/agents/useERPAgentAI';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ERPCommandCenterProps {
  supervisorStatus?: SupervisorStatus;
  domainAgents?: DomainAgent[];
  onOrchestrate?: (objective: string) => void;
}

// Componente de métrica animada
const AnimatedMetric = ({ value, label, icon: Icon, color, trend }: {
  value: number | string;
  label: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn("relative p-4 rounded-xl border bg-gradient-to-br", color)}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/80">{label}</p>
      </div>
      <div className="p-3 rounded-lg bg-white/20">
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    {trend && (
      <div className="absolute top-2 right-2">
        <TrendingUp className={cn(
          "h-4 w-4",
          trend === 'up' ? "text-green-300" : trend === 'down' ? "text-red-300 rotate-180" : "text-white/50"
        )} />
      </div>
    )}
  </motion.div>
);

// Indicador de estado del sistema
const SystemStatusIndicator = ({ status, label }: { status: 'operational' | 'degraded' | 'critical'; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={cn(
      "h-3 w-3 rounded-full animate-pulse",
      status === 'operational' ? "bg-green-500" :
      status === 'degraded' ? "bg-yellow-500" : "bg-red-500"
    )} />
    <span className="text-sm">{label}</span>
    <Badge variant="outline" className="text-xs">
      {status === 'operational' ? 'Operativo' : status === 'degraded' ? 'Degradado' : 'Crítico'}
    </Badge>
  </div>
);

export function ERPCommandCenter({ 
  supervisorStatus, 
  domainAgents = [],
  onOrchestrate 
}: ERPCommandCenterProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [systemInsights, setSystemInsights] = useState<StrategicInsight[]>([]);
  const [domainAnalyses, setDomainAnalyses] = useState<Map<AgentDomain, DomainAnalysis>>(new Map());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { 
    isLoading, 
    analyzeDomain, 
    generateStrategicInsights,
    orchestrateMultiAgent
  } = useERPAgentAI();

  // Métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    const totalAgents = domainAgents.reduce((sum, d) => sum + d.moduleAgents.length, 0);
    const activeAgents = domainAgents.reduce((sum, d) => 
      sum + d.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length, 0);
    const avgSuccessRate = domainAgents.length > 0
      ? Math.round(domainAgents.reduce((sum, d) => sum + (d.metrics.successRate || 0), 0) / domainAgents.length)
      : 0;
    const totalActions = domainAgents.reduce((sum, d) => sum + (d.metrics.totalActions || 0), 0);

    return { totalAgents, activeAgents, avgSuccessRate, totalActions };
  }, [domainAgents]);

  // Datos para radar chart de dominios
  const radarData = useMemo(() => 
    domainAgents.map(d => ({
      domain: DOMAIN_CONFIG[d.domain].name.split(' ')[0],
      score: d.metrics.successRate || 85 + Math.random() * 10,
      fullMark: 100
    })), [domainAgents]);

  // Datos de rendimiento temporal
  const performanceData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => ({
      time: `${(now.getHours() - 11 + i + 24) % 24}:00`,
      performance: 75 + Math.random() * 20,
      alerts: Math.floor(Math.random() * 5),
      actions: Math.floor(50 + Math.random() * 100)
    }));
  }, []);

  // Análisis global del sistema
  const runGlobalAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Analizar todos los dominios en paralelo
      const domains: AgentDomain[] = ['financial', 'crm_cs', 'compliance', 'operations', 'hr', 'analytics'];
      const analyses = await Promise.all(
        domains.map(async (domain) => {
          const result = await analyzeDomain(domain, {
            currentMetrics: domainAgents.find(d => d.domain === domain)?.metrics
          });
          return { domain, analysis: result };
        })
      );

      const newAnalyses = new Map<AgentDomain, DomainAnalysis>();
      analyses.forEach(({ domain, analysis }) => {
        if (analysis) newAnalyses.set(domain, analysis);
      });
      setDomainAnalyses(newAnalyses);

      // Generar insights estratégicos
      const insights = await generateStrategicInsights({
        domainAnalyses: Object.fromEntries(newAnalyses),
        timestamp: new Date().toISOString()
      });
      
      if (insights) setSystemInsights(insights);
      setLastRefresh(new Date());
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Determinar estado general del sistema
  const systemStatus = useMemo(() => {
    const criticalDomains = Array.from(domainAnalyses.values()).filter(a => a.status === 'critical').length;
    const warningDomains = Array.from(domainAnalyses.values()).filter(a => a.status === 'warning').length;
    
    if (criticalDomains > 0) return 'critical';
    if (warningDomains > 1) return 'degraded';
    return 'operational';
  }, [domainAnalyses]);

  // Quick actions
  const quickActions = [
    { 
      icon: Zap, 
      label: 'Optimizar Todo', 
      action: () => onOrchestrate?.('Optimización global del sistema'),
      color: 'bg-amber-500 hover:bg-amber-600'
    },
    { 
      icon: Shield, 
      label: 'Auditoría', 
      action: () => orchestrateMultiAgent('Auditoría de compliance completa', ['compliance', 'financial'], 'high'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    { 
      icon: Target, 
      label: 'Oportunidades', 
      action: () => orchestrateMultiAgent('Detectar oportunidades de venta', ['crm_cs', 'analytics'], 'medium'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      icon: AlertTriangle, 
      label: 'Riesgos', 
      action: () => orchestrateMultiAgent('Análisis de riesgos integral', ['financial', 'compliance', 'operations'], 'high'),
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con estado del sistema */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg">
            <Radar className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Command Center
              <Badge variant="outline" className="ml-2">AI-Powered</Badge>
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <SystemStatusIndicator status={systemStatus} label="Sistema" />
              <span className="text-xs text-muted-foreground">
                Actualizado {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runGlobalAnalysis}
            disabled={isAnalyzing || isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isAnalyzing || isLoading) && "animate-spin")} />
            {isAnalyzing ? 'Analizando...' : 'Análisis Global'}
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedMetric
          value={`${aggregatedMetrics.avgSuccessRate}%`}
          label="Tasa de Éxito"
          icon={CheckCircle}
          color="from-green-500 to-emerald-600"
          trend="up"
        />
        <AnimatedMetric
          value={`${aggregatedMetrics.activeAgents}/${aggregatedMetrics.totalAgents}`}
          label="Agentes Activos"
          icon={Cpu}
          color="from-blue-500 to-indigo-600"
          trend="stable"
        />
        <AnimatedMetric
          value={supervisorStatus?.systemHealth || 94}
          label="Salud Sistema"
          icon={Activity}
          color="from-purple-500 to-violet-600"
          trend="up"
        />
        <AnimatedMetric
          value={aggregatedMetrics.totalActions.toLocaleString()}
          label="Acciones Hoy"
          icon={Zap}
          color="from-amber-500 to-orange-600"
          trend="up"
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Rendimiento temporal */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Rendimiento del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[60, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="performance"
                  stroke="hsl(var(--primary))"
                  fill="url(#performanceGradient)"
                  strokeWidth={2}
                  name="Rendimiento %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Panel derecho - Radar de dominios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4" />
              Estado por Dominio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis 
                  dataKey="domain" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <RechartsRadar
                  name="Rendimiento"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones rápidas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  className={cn("h-auto py-3 flex flex-col gap-1 text-white", action.color)}
                  onClick={action.action}
                  disabled={isLoading}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Estado de Subsistemas</p>
              {[
                { name: 'Base de Datos', icon: Database, status: 'operational' as const },
                { name: 'Red de Agentes', icon: Network, status: 'operational' as const },
                { name: 'Motor de IA', icon: Brain, status: 'operational' as const },
                { name: 'Notificaciones', icon: BellRing, status: 'operational' as const }
              ].map((sys, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <sys.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{sys.name}</span>
                  </div>
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    sys.status === 'operational' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights recientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Insights AI en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <AnimatePresence mode="popLayout">
                {systemInsights.length > 0 ? (
                  systemInsights.slice(0, 5).map((insight, idx) => (
                    <motion.div
                      key={insight.id || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-3 rounded-lg border mb-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          insight.type === 'opportunity' ? "bg-green-500/10" :
                          insight.type === 'risk' ? "bg-red-500/10" :
                          insight.type === 'optimization' ? "bg-blue-500/10" : "bg-amber-500/10"
                        )}>
                          {insight.type === 'opportunity' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
                           insight.type === 'risk' ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                           insight.type === 'optimization' ? <Target className="h-4 w-4 text-blue-500" /> :
                           <Eye className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{insight.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{insight.summary}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {insight.confidence}% confianza
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] h-5",
                                insight.impact.magnitude === 'high' ? "border-red-500 text-red-500" :
                                insight.impact.magnitude === 'medium' ? "border-amber-500 text-amber-500" :
                                "border-muted-foreground"
                              )}
                            >
                              {insight.impact.magnitude === 'high' ? 'Alto impacto' :
                               insight.impact.magnitude === 'medium' ? 'Medio' : 'Bajo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <Brain className="h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm">Ejecuta un análisis global para generar insights</p>
                    <Button variant="link" size="sm" onClick={runGlobalAnalysis} disabled={isAnalyzing}>
                      Analizar ahora
                    </Button>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Estado de dominios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Estado de Dominios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {domainAgents.map((domain) => {
              const config = DOMAIN_CONFIG[domain.domain];
              const analysis = domainAnalyses.get(domain.domain);
              const activeCount = domain.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length;
              
              return (
                <motion.div
                  key={domain.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "p-3 rounded-lg border bg-gradient-to-br cursor-pointer transition-all",
                    analysis?.status === 'critical' ? "border-red-500/50 from-red-500/5 to-red-500/10" :
                    analysis?.status === 'warning' ? "border-amber-500/50 from-amber-500/5 to-amber-500/10" :
                    "from-muted/30 to-muted/50 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium truncate">{config.name.split(' ')[0]}</span>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      domain.status === 'active' || domain.status === 'coordinating' ? "bg-green-500" :
                      domain.status === 'error' ? "bg-red-500" : "bg-muted-foreground/50"
                    )} />
                  </div>
                  <p className="text-2xl font-bold">{analysis?.healthScore || domain.metrics.successRate || 85}%</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{activeCount} activos</span>
                    <span>{domain.moduleAgents.length} total</span>
                  </div>
                  <Progress 
                    value={(activeCount / domain.moduleAgents.length) * 100} 
                    className="h-1 mt-2" 
                  />
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ERPCommandCenter;
