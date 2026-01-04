/**
 * Widget compacto de Agente IA para módulos ERP/CRM
 * Se integra en cualquier dashboard como un panel lateral o widget
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bot, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  Brain,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ModuleDomain = 
  | 'financial' 
  | 'crm' 
  | 'compliance' 
  | 'operations' 
  | 'hr' 
  | 'analytics';

interface AgentInsight {
  id: string;
  type: 'recommendation' | 'alert' | 'opportunity' | 'trend';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

interface ModuleAgentWidgetProps {
  domain: ModuleDomain;
  moduleName: string;
  context?: Record<string, unknown>;
  className?: string;
  compact?: boolean;
}

const DOMAIN_CONFIG: Record<ModuleDomain, { 
  label: string; 
  color: string; 
  icon: React.ElementType;
  capabilities: string[];
}> = {
  financial: {
    label: 'Agente Financiero',
    color: 'from-emerald-500 to-teal-600',
    icon: TrendingUp,
    capabilities: ['Análisis de flujo de caja', 'Predicción de cobros', 'Optimización fiscal']
  },
  crm: {
    label: 'Agente CRM',
    color: 'from-blue-500 to-indigo-600',
    icon: Target,
    capabilities: ['Scoring de leads', 'Next best action', 'Predicción de churn']
  },
  compliance: {
    label: 'Agente Compliance',
    color: 'from-amber-500 to-orange-600',
    icon: AlertTriangle,
    capabilities: ['Detección de riesgos', 'Auditoría automatizada', 'Alertas regulatorias']
  },
  operations: {
    label: 'Agente Operaciones',
    color: 'from-purple-500 to-violet-600',
    icon: Zap,
    capabilities: ['Optimización de inventario', 'Predicción de demanda', 'Automatización']
  },
  hr: {
    label: 'Agente RRHH',
    color: 'from-pink-500 to-rose-600',
    icon: Brain,
    capabilities: ['Análisis de talento', 'Predicción de rotación', 'Onboarding inteligente']
  },
  analytics: {
    label: 'Agente Analytics',
    color: 'from-cyan-500 to-blue-600',
    icon: Brain,
    capabilities: ['Insights automáticos', 'Detección de anomalías', 'Reportes predictivos']
  }
};

export function ModuleAgentWidget({ 
  domain, 
  moduleName, 
  context,
  className,
  compact = false 
}: ModuleAgentWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  const config = DOMAIN_CONFIG[domain];
  const Icon = config.icon;

  const runAnalysis = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'execute',
          agentType: domain,
          context: {
            module: moduleName,
            ...context
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const parsedInsights: AgentInsight[] = [];
        
        // Parse recommendations
        if (data.data.recommendations) {
          data.data.recommendations.forEach((rec: string, idx: number) => {
            parsedInsights.push({
              id: `rec-${idx}`,
              type: 'recommendation',
              title: 'Recomendación',
              description: rec,
              priority: 'medium',
              actionable: true
            });
          });
        }

        // Parse alerts
        if (data.data.alerts) {
          data.data.alerts.forEach((alert: string, idx: number) => {
            parsedInsights.push({
              id: `alert-${idx}`,
              type: 'alert',
              title: 'Alerta',
              description: alert,
              priority: 'high',
              actionable: true
            });
          });
        }

        // Parse opportunities
        if (data.data.opportunities) {
          data.data.opportunities.forEach((opp: string, idx: number) => {
            parsedInsights.push({
              id: `opp-${idx}`,
              type: 'opportunity',
              title: 'Oportunidad',
              description: opp,
              priority: 'medium',
              actionable: true
            });
          });
        }

        setInsights(parsedInsights.slice(0, 5));
        setLastAnalysis(new Date());
        toast.success('Análisis completado');
      }
    } catch (err) {
      console.error('[ModuleAgentWidget] Error:', err);
      toast.error('Error al ejecutar análisis');
    } finally {
      setIsLoading(false);
    }
  }, [domain, moduleName, context]);

  const getInsightIcon = (type: AgentInsight['type']) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'opportunity': return <Target className="h-4 w-4 text-green-500" />;
      case 'trend': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className={cn("border-primary/20", className)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", config.color)}>
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm">{config.label}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {insights.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {insights.length} insights
                    </Badge>
                  )}
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <Button 
                  onClick={runAnalysis} 
                  disabled={isLoading}
                  size="sm"
                  className="w-full"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando...</>
                  ) : (
                    <><Brain className="h-4 w-4 mr-2" /> Ejecutar Análisis</>
                  )}
                </Button>
                {insights.length > 0 && (
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {insights.map((insight) => (
                        <div 
                          key={insight.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-xs"
                        >
                          {getInsightIcon(insight.type)}
                          <p className="flex-1">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-gradient-to-br", config.color)}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{config.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{moduleName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={runAnalysis}
              disabled={isLoading}
              className="h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capabilities */}
        <div className="flex flex-wrap gap-1">
          {config.capabilities.map((cap, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>

        {/* Action Button */}
        <Button 
          onClick={runAnalysis} 
          disabled={isLoading}
          className={cn("w-full bg-gradient-to-r", config.color, "hover:opacity-90")}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando...</>
          ) : (
            <><Brain className="h-4 w-4 mr-2" /> Ejecutar Análisis IA</>
          )}
        </Button>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insights Detectados
              </h4>
              {lastAnalysis && (
                <span className="text-xs text-muted-foreground">
                  {lastAnalysis.toLocaleTimeString()}
                </span>
              )}
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div 
                    key={insight.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      insight.priority === 'high' && "border-amber-500/30 bg-amber-500/5",
                      insight.priority === 'medium' && "border-primary/30 bg-primary/5",
                      insight.priority === 'low' && "border-muted"
                    )}
                  >
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                    {insight.actionable && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Actuar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {insights.length === 0 && !isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ejecuta un análisis para obtener insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ModuleAgentWidget;
