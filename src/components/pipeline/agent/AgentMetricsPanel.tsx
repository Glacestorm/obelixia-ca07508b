/**
 * Panel de Métricas de Rendimiento del Agente IA
 * Muestra ejecuciones, tiempos de respuesta y confianza
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  Target, 
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export interface AgentExecution {
  id: string;
  action: string;
  status: 'success' | 'error' | 'pending';
  responseTimeMs: number;
  confidence: number;
  timestamp: Date;
  tokensUsed?: number;
}

export interface AgentMetrics {
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
  avgConfidence: number;
  executionsToday: number;
  tokensUsedToday: number;
  recentExecutions: AgentExecution[];
  performanceTrend: 'up' | 'down' | 'stable';
}

interface AgentMetricsPanelProps {
  className?: string;
}

export function AgentMetricsPanel({ className }: AgentMetricsPanelProps) {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalExecutions: 0,
    successRate: 0,
    avgResponseTime: 0,
    avgConfidence: 0,
    executionsToday: 0,
    tokensUsedToday: 0,
    recentExecutions: [],
    performanceTrend: 'stable',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Simulated metrics - in production, these would come from the database
  useEffect(() => {
    // Initial load with realistic data
    setMetrics({
      totalExecutions: 156,
      successRate: 94.2,
      avgResponseTime: 1250,
      avgConfidence: 87.5,
      executionsToday: 23,
      tokensUsedToday: 45200,
      recentExecutions: [
        { id: '1', action: 'analyze_pipeline', status: 'success', responseTimeMs: 1100, confidence: 92, timestamp: new Date(Date.now() - 120000) },
        { id: '2', action: 'suggest_actions', status: 'success', responseTimeMs: 980, confidence: 88, timestamp: new Date(Date.now() - 300000) },
        { id: '3', action: 'detect_risks', status: 'success', responseTimeMs: 1450, confidence: 85, timestamp: new Date(Date.now() - 600000) },
        { id: '4', action: 'forecast', status: 'success', responseTimeMs: 1800, confidence: 79, timestamp: new Date(Date.now() - 900000) },
        { id: '5', action: 'predict_close', status: 'error', responseTimeMs: 2500, confidence: 45, timestamp: new Date(Date.now() - 1200000) },
      ],
      performanceTrend: 'up',
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setMetrics(prev => ({
      ...prev,
      executionsToday: prev.executionsToday + 1,
      recentExecutions: [
        { 
          id: Date.now().toString(), 
          action: 'analyze_pipeline', 
          status: 'success', 
          responseTimeMs: 900 + Math.random() * 500, 
          confidence: 80 + Math.random() * 15, 
          timestamp: new Date() 
        },
        ...prev.recentExecutions.slice(0, 4)
      ],
    }));
    setIsLoading(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'analyze_pipeline': 'Análisis Pipeline',
      'suggest_actions': 'Sugerir Acciones',
      'detect_risks': 'Detectar Riesgos',
      'forecast': 'Forecast',
      'predict_close': 'Predicción Cierre',
      'coaching': 'Coaching',
    };
    return labels[action] || action;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-500" />
          Rendimiento del Agente
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-7 text-xs"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Ejecuciones Hoy</span>
            <Zap className="h-3 w-3 text-yellow-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{metrics.executionsToday}</span>
            <span className="text-xs text-muted-foreground">/ 156 total</span>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Tasa de Éxito</span>
            {metrics.performanceTrend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-green-600">{metrics.successRate}%</span>
          </div>
          <Progress value={metrics.successRate} className="h-1 mt-1" />
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Tiempo Respuesta</span>
            <Timer className="h-3 w-3 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{(metrics.avgResponseTime / 1000).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">seg</span>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Confianza Media</span>
            <Target className="h-3 w-3 text-violet-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{metrics.avgConfidence.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.avgConfidence} className="h-1 mt-1" />
        </Card>
      </div>

      {/* Tokens Usage */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Tokens Consumidos Hoy</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {(metrics.tokensUsedToday / 1000).toFixed(1)}k tokens
          </Badge>
        </div>
      </Card>

      {/* Recent Executions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Ejecuciones Recientes</h4>
        <div className="space-y-1">
          {metrics.recentExecutions.map((exec) => (
            <div 
              key={exec.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(exec.status)}
                <span className="font-medium">{getActionLabel(exec.action)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {exec.responseTimeMs.toFixed(0)}ms
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "h-5 text-[10px]",
                    exec.confidence >= 80 ? "text-green-600" : 
                    exec.confidence >= 60 ? "text-yellow-600" : "text-red-600"
                  )}
                >
                  {exec.confidence.toFixed(0)}%
                </Badge>
                <span className="text-muted-foreground w-16 text-right">
                  {formatDistanceToNow(exec.timestamp, { locale: es, addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgentMetricsPanel;
