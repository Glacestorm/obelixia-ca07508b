/**
 * Lead Scoring Dashboard
 * Panel principal para visualizar y gestionar lead scoring con IA
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Sparkles,
  Brain,
  Flame,
  Thermometer,
  Snowflake,
  BarChart3,
  Settings,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { useCRMLeadScoring, type LeadScore, type ScoringStats } from '@/hooks/crm/scoring';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeadScoringDashboardProps {
  className?: string;
}

export function LeadScoringDashboard({ className }: LeadScoringDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    models,
    activeModel,
    scores,
    stats,
    isLoading,
    fetchModels,
    fetchScores,
    calculateStats,
    getTierColor,
    getReadinessColor,
    getTierBadgeVariant
  } = useCRMLeadScoring();

  // Initial load
  useEffect(() => {
    fetchModels();
    fetchScores({ limit: 50 });
    calculateStats();
  }, [fetchModels, fetchScores, calculateStats]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchScores({ limit: 50 }),
      calculateStats()
    ]);
  }, [fetchScores, calculateStats]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getReadinessIcon = (readiness: string) => {
    switch (readiness) {
      case 'hot': return <Flame className="h-4 w-4 text-red-500" />;
      case 'warm': return <Thermometer className="h-4 w-4 text-amber-500" />;
      case 'cold': return <Snowflake className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Lead Scoring IA</h2>
            <p className="text-sm text-muted-foreground">
              Modelo activo: {activeModel?.name || 'Ninguno'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Scoring Masivo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={<Users className="h-5 w-5" />}
            description="Leads con scoring"
          />
          <StatsCard
            title="Leads Calientes"
            value={stats.hotLeads}
            icon={<Flame className="h-5 w-5 text-red-500" />}
            description={`${Math.round(stats.hotLeads / stats.totalLeads * 100)}% del total`}
            variant="hot"
          />
          <StatsCard
            title="Score Promedio"
            value={stats.averageScore}
            suffix="/100"
            icon={<BarChart3 className="h-5 w-5" />}
            description="Puntuación media"
          />
          <StatsCard
            title="Precisión Modelo"
            value={stats.modelAccuracy}
            suffix="%"
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            description="Accuracy del modelo"
          />
        </div>
      )}

      {/* Distribution Chart */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-32">
              {stats.scoreDistribution.map(({ tier, count }) => {
                const percentage = stats.totalLeads > 0 ? (count / stats.totalLeads * 100) : 0;
                return (
                  <div key={tier} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all",
                        tier === 'A' && "bg-emerald-500",
                        tier === 'B' && "bg-blue-500",
                        tier === 'C' && "bg-amber-500",
                        tier === 'D' && "bg-red-500"
                      )}
                      style={{ height: `${Math.max(percentage, 5)}%` }}
                    />
                    <div className="text-center">
                      <div className="font-bold">{tier}</div>
                      <div className="text-xs text-muted-foreground">{count}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="hot">Hot Leads</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads Recientes</CardTitle>
              <CardDescription>Top 20 leads por score</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {scores.slice(0, 20).map((score) => (
                    <LeadScoreCard 
                      key={score.id} 
                      score={score} 
                      getTierColor={getTierColor}
                      getReadinessColor={getReadinessColor}
                      getTierBadgeVariant={getTierBadgeVariant}
                      getTrendIcon={getTrendIcon}
                      getReadinessIcon={getReadinessIcon}
                    />
                  ))}
                  {scores.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay leads con scoring aún
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hot" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Leads Calientes
              </CardTitle>
              <CardDescription>Leads listos para contactar</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {scores.filter(s => s.readiness === 'hot').map((score) => (
                    <LeadScoreCard 
                      key={score.id} 
                      score={score}
                      getTierColor={getTierColor}
                      getReadinessColor={getReadinessColor}
                      getTierBadgeVariant={getTierBadgeVariant}
                      getTrendIcon={getTrendIcon}
                      getReadinessIcon={getReadinessIcon}
                    />
                  ))}
                  {scores.filter(s => s.readiness === 'hot').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay leads calientes actualmente
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <div className="grid gap-4">
            {models.map((model) => (
              <Card key={model.id} className={cn(model.is_default && "border-primary")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{model.name}</CardTitle>
                      {model.is_default && (
                        <Badge variant="default" className="text-xs">Por defecto</Badge>
                      )}
                    </div>
                    <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                      {model.status}
                    </Badge>
                  </div>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Tipo</div>
                      <div className="font-medium">{model.model_type}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Versión</div>
                      <div className="font-medium">v{model.version}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Precisión</div>
                      <div className="font-medium">
                        {model.accuracy ? `${Math.round(model.accuracy * 100)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Entrenado</div>
                      <div className="font-medium">
                        {model.last_trained_at 
                          ? formatDistanceToNow(new Date(model.last_trained_at), { locale: es, addSuffix: true })
                          : 'Nunca'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Scoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <div className="font-medium">Umbrales de Readiness</div>
                    <div className="text-sm text-muted-foreground">Define cuándo un lead es hot/warm/cold</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-red-500" />
                      <span>Hot: ≥80</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-amber-500" />
                      <span>Warm: ≥50</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-blue-500" />
                      <span>Cold: &lt;50</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <div className="font-medium">Pesos del Modelo</div>
                    <div className="text-sm text-muted-foreground">Distribución de factores de scoring</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Fit: 40%</span>
                    <span>Engagement: 30%</span>
                    <span>Intent: 30%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Sub-components ===

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  description: string;
  variant?: 'default' | 'hot';
}

function StatsCard({ title, value, suffix, icon, description, variant = 'default' }: StatsCardProps) {
  return (
    <Card className={cn(variant === 'hot' && "border-red-200 bg-red-50/50 dark:bg-red-950/20")}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">
            {value}{suffix}
          </div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LeadScoreCardProps {
  score: LeadScore;
  getTierColor: (tier: string) => string;
  getReadinessColor: (readiness: string) => string;
  getTierBadgeVariant: (tier: string) => 'default' | 'secondary' | 'destructive' | 'outline';
  getTrendIcon: (trend: string) => React.ReactNode;
  getReadinessIcon: (readiness: string) => React.ReactNode;
}

function LeadScoreCard({ 
  score, 
  getTierColor, 
  getTierBadgeVariant,
  getTrendIcon, 
  getReadinessIcon 
}: LeadScoreCardProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className={cn("text-3xl font-bold", getTierColor(score.tier))}>
            {score.total_score}
          </div>
          <Badge variant={getTierBadgeVariant(score.tier)} className="text-xs">
            Tier {score.tier}
          </Badge>
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            Lead {score.lead_id.slice(0, 8)}...
            {getReadinessIcon(score.readiness)}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
            <span>Fit: {score.fit_score}</span>
            <span>Engagement: {score.engagement_score}</span>
            <span>Intent: {score.intent_score}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {getTrendIcon(score.score_trend)}
          <span className="text-sm">
            {score.trend_percentage > 0 ? '+' : ''}{score.trend_percentage}%
          </span>
        </div>
        {score.conversion_probability !== null && (
          <div className="text-sm">
            <span className="text-muted-foreground">Conv: </span>
            <span className="font-medium">{Math.round(score.conversion_probability * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadScoringDashboard;
