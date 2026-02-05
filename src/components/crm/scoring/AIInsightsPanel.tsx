/**
 * AI Insights Panel
 * Panel para visualizar y gestionar insights generados por IA
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert,
  RefreshCw,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Filter,
  Brain,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { useCRMAIInsights, type AIInsight, type InsightPriority, type InsightType } from '@/hooks/crm/scoring';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIInsightsPanelProps {
  entityType?: 'lead' | 'deal' | 'account';
  entityId?: string;
  className?: string;
}

export function AIInsightsPanel({ entityType, entityId, className }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);

  const {
    insights,
    stats,
    isLoading,
    isGenerating,
    fetchInsights,
    calculateStats,
    generateInsights,
    acceptInsight,
    dismissInsight,
    completeInsight,
    getPriorityColor,
    getPriorityBadgeVariant
  } = useCRMAIInsights();

  // Initial load
  useEffect(() => {
    const filters = entityType && entityId 
      ? { entityType, entityId } 
      : undefined;
    fetchInsights(filters);
    calculateStats();
  }, [fetchInsights, calculateStats, entityType, entityId]);

  const handleRefresh = useCallback(async () => {
    const filters = entityType && entityId 
      ? { entityType, entityId } 
      : undefined;
    await fetchInsights(filters);
    await calculateStats();
  }, [fetchInsights, calculateStats, entityType, entityId]);

  const handleGenerateInsights = useCallback(async () => {
    if (!entityType || !entityId) return;
    await generateInsights({
      entityType,
      entityId,
      entityData: {} // En producción, pasar datos reales
    });
  }, [generateInsights, entityType, entityId]);

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'recommendation': return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'prediction': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'opportunity': return <Sparkles className="h-4 w-4 text-emerald-500" />;
      case 'risk': return <ShieldAlert className="h-4 w-4 text-orange-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const filterInsights = (tab: string) => {
    switch (tab) {
      case 'pending': return insights.filter(i => i.status === 'pending');
      case 'high': return insights.filter(i => i.priority === 'critical' || i.priority === 'high');
      case 'recommendations': return insights.filter(i => i.insight_type === 'recommendation');
      case 'alerts': return insights.filter(i => i.insight_type === 'alert' || i.insight_type === 'risk');
      default: return insights;
    }
  };

  const filteredInsights = filterInsights(activeTab);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-xs text-muted-foreground">
              {stats?.pending || 0} pendientes de revisar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          {entityType && entityId && (
            <Button size="sm" onClick={handleGenerateInsights} disabled={isGenerating}>
              <Sparkles className={cn("h-4 w-4 mr-1", isGenerating && "animate-pulse")} />
              Generar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-lg border bg-card text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pendientes</div>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <div className="text-2xl font-bold text-red-500">{stats.highPriority}</div>
            <div className="text-xs text-muted-foreground">Alta Prioridad</div>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <div className="text-2xl font-bold text-emerald-500">{stats.avgConfidence}%</div>
            <div className="text-xs text-muted-foreground">Confianza</div>
          </div>
        </div>
      )}

      {/* Tabs & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="high">Urgentes</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {filteredInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      isSelected={selectedInsight?.id === insight.id}
                      onSelect={() => setSelectedInsight(
                        selectedInsight?.id === insight.id ? null : insight
                      )}
                      onAccept={() => acceptInsight(insight.id)}
                      onDismiss={() => dismissInsight(insight.id)}
                      onComplete={(helpful) => completeInsight(insight.id, helpful)}
                      getTypeIcon={getTypeIcon}
                      getPriorityColor={getPriorityColor}
                      getPriorityBadgeVariant={getPriorityBadgeVariant}
                    />
                  ))}
                  {filteredInsights.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No hay insights en esta categoría</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Insight Detail */}
      {selectedInsight && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedInsight.insight_type)}
                <CardTitle className="text-base">{selectedInsight.title}</CardTitle>
              </div>
              <Badge variant={getPriorityBadgeVariant(selectedInsight.priority)}>
                {selectedInsight.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">{selectedInsight.description}</p>
            
            {selectedInsight.action_items.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Acciones Sugeridas:</div>
                <ul className="space-y-1">
                  {selectedInsight.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedInsight.reasoning && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="font-medium mb-1">Razonamiento IA:</div>
                <p className="text-muted-foreground">{selectedInsight.reasoning}</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Confianza: {Math.round(selectedInsight.confidence * 100)}%
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => dismissInsight(selectedInsight.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Descartar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => acceptInsight(selectedInsight.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aceptar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// === Sub-components ===

interface InsightCardProps {
  insight: AIInsight;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onComplete: (helpful: boolean) => void;
  getTypeIcon: (type: InsightType) => React.ReactNode;
  getPriorityColor: (priority: InsightPriority) => string;
  getPriorityBadgeVariant: (priority: InsightPriority) => 'default' | 'secondary' | 'destructive' | 'outline';
}

function InsightCard({
  insight,
  isSelected,
  onSelect,
  onAccept,
  onDismiss,
  getTypeIcon,
  getPriorityColor,
  getPriorityBadgeVariant
}: InsightCardProps) {
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
        isSelected && "border-primary bg-primary/5",
        insight.status === 'pending' && "border-l-4 border-l-amber-500"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getTypeIcon(insight.insight_type)}</div>
          <div>
            <div className="font-medium text-sm">{insight.title}</div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {insight.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={getPriorityBadgeVariant(insight.priority)} className="text-xs">
                {insight.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(insight.created_at), { locale: es, addSuffix: true })}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(insight.confidence * 100)}% confianza
              </span>
            </div>
          </div>
        </div>
        {insight.status === 'pending' && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAccept}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {insight.status !== 'pending' && (
          <Badge variant="outline" className="text-xs">
            {insight.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default AIInsightsPanel;
