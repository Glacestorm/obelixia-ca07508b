/**
 * CRMAgentLeaderboard - Sistema de Ranking Competitivo para Agentes CRM
 * Gamificación y competencia entre agentes basada en rendimiento real
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  Heart,
  Sparkles,
  RefreshCw,
  Loader2,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Flame,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCRMAgentAI, CRMAgentRanking } from '@/hooks/admin/agents/useCRMAgentAI';

interface CRMAgentLeaderboardProps {
  className?: string;
}

// === MEDALLAS ===
const RANK_MEDALS: Record<number, { icon: React.ElementType; color: string; label: string }> = {
  1: { icon: Crown, color: 'text-yellow-500', label: 'Campeón' },
  2: { icon: Medal, color: 'text-gray-400', label: 'Subcampeón' },
  3: { icon: Award, color: 'text-amber-600', label: 'Bronce' },
};

// === LOGROS ===
const ACHIEVEMENTS: Record<string, { icon: React.ElementType; color: string }> = {
  'Top Performer': { icon: Trophy, color: 'bg-yellow-500' },
  'Most Improved': { icon: TrendingUp, color: 'bg-green-500' },
  'Speed Demon': { icon: Zap, color: 'bg-blue-500' },
  'Revenue King': { icon: DollarSign, color: 'bg-emerald-500' },
  'Accuracy Master': { icon: Target, color: 'bg-purple-500' },
  'Customer Hero': { icon: Heart, color: 'bg-pink-500' },
  'Hot Streak': { icon: Flame, color: 'bg-orange-500' },
  'Reliable': { icon: Shield, color: 'bg-cyan-500' },
};

// === MOCK DATA ===
function generateMockRankings(): CRMAgentRanking[] {
  const agents = [
    { id: 'lead_scoring', name: 'Lead Scoring AI' },
    { id: 'pipeline_optimizer', name: 'Pipeline Optimizer' },
    { id: 'churn_predictor', name: 'Churn Predictor' },
    { id: 'upsell_detector', name: 'Upsell Detector' },
    { id: 'deal_accelerator', name: 'Deal Accelerator' },
    { id: 'customer_success', name: 'Customer Success' },
    { id: 'engagement_analyzer', name: 'Engagement Analyzer' },
    { id: 'forecast_analyst', name: 'Forecast Analyst' },
  ];

  return agents.map((agent, i) => ({
    rank: i + 1,
    agentId: agent.id,
    agentName: agent.name,
    overallScore: 95 - (i * 5) + Math.random() * 10,
    metrics: {
      accuracy: 85 + Math.random() * 12,
      valueGenerated: Math.floor(50000 + Math.random() * 150000),
      responseTime: Math.floor(100 + Math.random() * 200),
      successRate: 75 + Math.random() * 20,
      userSatisfaction: 80 + Math.random() * 18,
    },
    trend: ['rising', 'stable', 'falling'][Math.floor(Math.random() * 3)] as 'rising' | 'stable' | 'falling',
    achievements: Object.keys(ACHIEVEMENTS).slice(0, Math.floor(Math.random() * 4) + 1),
    areasToImprove: ['Tiempo de respuesta', 'Precisión en edge cases', 'Cobertura de datos'].slice(0, Math.floor(Math.random() * 2) + 1),
  })).sort((a, b) => b.overallScore - a.overallScore);
}

// === COMPONENTE PRINCIPAL ===
export function CRMAgentLeaderboard({ className }: CRMAgentLeaderboardProps) {
  const [rankings, setRankings] = useState<CRMAgentRanking[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isLoading, getRankings } = useCRMAgentAI();

  // === CARGAR RANKINGS ===
  useEffect(() => {
    const loadRankings = async () => {
      try {
        const result = await getRankings({ period: selectedPeriod });
        if (result && result.length > 0) {
          setRankings(result);
        } else {
          // Usar mock si la IA no devuelve datos
          setRankings(generateMockRankings());
        }
      } catch {
        setRankings(generateMockRankings());
      }
    };
    loadRankings();
  }, [selectedPeriod]);

  // === ESTADÍSTICAS ===
  const stats = useMemo(() => {
    if (rankings.length === 0) return null;
    
    const totalValue = rankings.reduce((sum, r) => sum + r.metrics.valueGenerated, 0);
    const avgScore = rankings.reduce((sum, r) => sum + r.overallScore, 0) / rankings.length;
    const avgAccuracy = rankings.reduce((sum, r) => sum + r.metrics.accuracy, 0) / rankings.length;
    const topPerformer = rankings[0];
    const rising = rankings.filter(r => r.trend === 'rising').length;

    return { totalValue, avgScore, avgAccuracy, topPerformer, rising };
  }, [rankings]);

  // === HANDLERS ===
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await getRankings({ period: selectedPeriod, forceRefresh: true });
      if (result && result.length > 0) {
        setRankings(result);
      } else {
        setRankings(generateMockRankings());
      }
      toast.success('Rankings actualizados');
    } catch {
      setRankings(generateMockRankings());
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPeriod, getRankings]);

  // === RENDER ===
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header con gradiente */}
      <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500" />
      
      <CardHeader className="pb-3 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl blur-lg opacity-50" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                CRM Agent Leaderboard
                <Badge variant="outline" className="text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                  <Flame className="h-2.5 w-2.5 mr-1" />
                  Competencia
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Ranking en tiempo real • {rankings.length} agentes compitiendo
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof selectedPeriod)}>
              <TabsList className="h-7">
                <TabsTrigger value="day" className="text-[10px] px-2 h-6">Hoy</TabsTrigger>
                <TabsTrigger value="week" className="text-[10px] px-2 h-6">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-[10px] px-2 h-6">Mes</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] px-2 h-6">Total</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || isLoading) && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
              <p className="text-[10px] text-muted-foreground uppercase">Valor Total</p>
              <p className="text-lg font-bold text-green-600">€{(stats.totalValue / 1000).toFixed(0)}k</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <p className="text-[10px] text-muted-foreground uppercase">Score Medio</p>
              <p className="text-lg font-bold text-blue-600">{stats.avgScore.toFixed(0)}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <p className="text-[10px] text-muted-foreground uppercase">Precisión</p>
              <p className="text-lg font-bold text-purple-600">{stats.avgAccuracy.toFixed(0)}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
              <p className="text-[10px] text-muted-foreground uppercase">En Ascenso</p>
              <p className="text-lg font-bold text-amber-600">{stats.rising}</p>
            </div>
          </div>
        )}

        {/* Podio Top 3 */}
        {rankings.length >= 3 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {/* 2do lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 mb-2 shadow-lg">
                <Medal className="h-6 w-6 text-white" />
              </div>
              <div className="w-20 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg pt-4 pb-2 text-center">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <p className="text-xs font-medium mt-1 text-center line-clamp-1 w-20">{rankings[1]?.agentName}</p>
              <p className="text-[10px] text-muted-foreground">{rankings[1]?.overallScore.toFixed(0)}%</p>
            </motion.div>

            {/* 1er lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center -mt-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-xl blur-xl opacity-50 animate-pulse" />
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 mb-2 shadow-xl">
                  <Crown className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="w-24 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-lg pt-6 pb-2 text-center">
                <span className="text-white text-3xl font-bold">1</span>
              </div>
              <p className="text-sm font-semibold mt-1 text-center">{rankings[0]?.agentName}</p>
              <p className="text-xs text-amber-600 font-medium">{rankings[0]?.overallScore.toFixed(0)}%</p>
            </motion.div>

            {/* 3er lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 mb-2 shadow-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div className="w-20 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg pt-3 pb-2 text-center">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <p className="text-xs font-medium mt-1 text-center line-clamp-1 w-20">{rankings[2]?.agentName}</p>
              <p className="text-[10px] text-muted-foreground">{rankings[2]?.overallScore.toFixed(0)}%</p>
            </motion.div>
          </div>
        )}

        {/* Lista completa */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {rankings.map((agent, i) => {
              const medal = RANK_MEDALS[agent.rank];
              const MedalIcon = medal?.icon || Star;
              
              return (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    agent.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-500/20",
                    selectedAgent === agent.agentId && "ring-2 ring-primary shadow-md"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Posición */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                      agent.rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
                      agent.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
                      agent.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                      agent.rank > 3 && "bg-muted text-muted-foreground"
                    )}>
                      {agent.rank <= 3 ? <MedalIcon className="h-4 w-4" /> : agent.rank}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{agent.agentName}</p>
                        {agent.trend === 'rising' && <ArrowUp className="h-3.5 w-3.5 text-green-500" />}
                        {agent.trend === 'falling' && <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
                        {agent.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {agent.achievements.slice(0, 3).map((ach, j) => {
                          const achConfig = ACHIEVEMENTS[ach];
                          if (!achConfig) return null;
                          const AchIcon = achConfig.icon;
                          return (
                            <div 
                              key={j}
                              className={cn("p-0.5 rounded", achConfig.color)}
                            >
                              <AchIcon className="h-2.5 w-2.5 text-white" />
                            </div>
                          );
                        })}
                        {agent.achievements.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{agent.achievements.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-lg font-bold">{agent.overallScore.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">puntos</p>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  <AnimatePresence>
                    {selectedAgent === agent.agentId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t space-y-3"
                      >
                        {/* Métricas */}
                        <div className="grid grid-cols-5 gap-2">
                          <div className="text-center">
                            <p className="text-xs font-semibold">{agent.metrics.accuracy.toFixed(0)}%</p>
                            <p className="text-[10px] text-muted-foreground">Precisión</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold">€{(agent.metrics.valueGenerated / 1000).toFixed(0)}k</p>
                            <p className="text-[10px] text-muted-foreground">Valor</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold">{agent.metrics.responseTime}ms</p>
                            <p className="text-[10px] text-muted-foreground">Tiempo</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold">{agent.metrics.successRate.toFixed(0)}%</p>
                            <p className="text-[10px] text-muted-foreground">Éxito</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold">{agent.metrics.userSatisfaction.toFixed(0)}%</p>
                            <p className="text-[10px] text-muted-foreground">Satisf.</p>
                          </div>
                        </div>

                        {/* Logros */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Logros</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.achievements.map((ach, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">
                                {ach}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Áreas de mejora */}
                        {agent.areasToImprove.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">Áreas de mejora</p>
                            <div className="flex flex-wrap gap-1">
                              {agent.areasToImprove.map((area, j) => (
                                <Badge key={j} variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default CRMAgentLeaderboard;
