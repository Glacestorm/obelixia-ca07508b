/**
 * ERPAgentLeaderboard - Sistema de ranking competitivo entre agentes
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Crown, Star, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentDomain } from '@/hooks/admin/agents/erpAgentTypes';
import { DOMAIN_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';

interface AgentRank {
  id: string;
  name: string;
  domain: AgentDomain;
  score: number;
  successRate: number;
  actionsExecuted: number;
  insightsGenerated: number;
  avgResponseTime: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  badges: string[];
  streak: number;
}

const BADGE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'champion': { icon: Crown, color: 'text-yellow-500' },
  'top_performer': { icon: Trophy, color: 'text-amber-500' },
  'rising_star': { icon: Star, color: 'text-blue-500' },
  'speed_demon': { icon: Zap, color: 'text-purple-500' },
  'insight_master': { icon: Award, color: 'text-emerald-500' }
};

const generateMockRankings = (): AgentRank[] => {
  const agents: AgentRank[] = [
    { id: 'a1', name: 'Agente de Ventas', domain: 'crm_cs', score: 96, successRate: 94, actionsExecuted: 1247, insightsGenerated: 89, avgResponseTime: 145, trend: 'up', trendValue: 8, badges: ['champion', 'top_performer'], streak: 12 },
    { id: 'a2', name: 'Agente GDPR', domain: 'compliance', score: 94, successRate: 98, actionsExecuted: 892, insightsGenerated: 67, avgResponseTime: 180, trend: 'up', trendValue: 5, badges: ['top_performer'], streak: 8 },
    { id: 'a3', name: 'Agente Tesorería', domain: 'financial', score: 91, successRate: 92, actionsExecuted: 1103, insightsGenerated: 78, avgResponseTime: 160, trend: 'stable', trendValue: 0, badges: ['insight_master'], streak: 5 },
    { id: 'a4', name: 'Agente Anti-Churn', domain: 'crm_cs', score: 89, successRate: 87, actionsExecuted: 756, insightsGenerated: 95, avgResponseTime: 200, trend: 'up', trendValue: 12, badges: ['rising_star'], streak: 7 },
    { id: 'a5', name: 'Agente Inventario', domain: 'operations', score: 87, successRate: 90, actionsExecuted: 1456, insightsGenerated: 45, avgResponseTime: 120, trend: 'down', trendValue: 3, badges: ['speed_demon'], streak: 3 },
    { id: 'a6', name: 'Agente Analytics', domain: 'analytics', score: 85, successRate: 88, actionsExecuted: 678, insightsGenerated: 112, avgResponseTime: 250, trend: 'up', trendValue: 6, badges: ['insight_master'], streak: 9 },
  ];
  return agents.sort((a, b) => b.score - a.score);
};

export function ERPAgentLeaderboard() {
  const [rankings, setRankings] = useState<AgentRank[]>(generateMockRankings());
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const topThree = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  return (
    <div className="space-y-6">
      {/* Podium */}
      <div className="flex items-end justify-center gap-4 pt-8">
        {[1, 0, 2].map((idx) => {
          const agent = topThree[idx];
          if (!agent) return null;
          const isFirst = idx === 0;
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "flex flex-col items-center p-4 rounded-t-xl border-t border-x",
                isFirst ? "bg-gradient-to-b from-yellow-500/20 to-transparent h-48" :
                idx === 1 ? "bg-gradient-to-b from-gray-400/20 to-transparent h-36" :
                "bg-gradient-to-b from-amber-700/20 to-transparent h-32"
              )}
            >
              <div className={cn(
                "p-2 rounded-full mb-2",
                isFirst ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-amber-700"
              )}>
                {isFirst ? <Crown className="h-6 w-6 text-white" /> : <Medal className="h-5 w-5 text-white" />}
              </div>
              <p className="font-bold text-sm text-center">{agent.name}</p>
              <p className="text-2xl font-bold">{agent.score}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {DOMAIN_CONFIG[agent.domain].name.split(' ')[0]}
              </Badge>
              <div className="flex gap-1 mt-2">
                {agent.badges.slice(0, 2).map((badge, i) => {
                  const BadgeIcon = BADGE_ICONS[badge]?.icon || Star;
                  return <BadgeIcon key={i} className={cn("h-4 w-4", BADGE_ICONS[badge]?.color)} />;
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Timeframe selector */}
      <div className="flex justify-center gap-2">
        {(['day', 'week', 'month'] as const).map((t) => (
          <Button
            key={t}
            variant={timeframe === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe(t)}
          >
            {t === 'day' ? 'Hoy' : t === 'week' ? 'Semana' : 'Mes'}
          </Button>
        ))}
      </div>

      {/* Full rankings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Clasificación Completa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {rankings.map((agent, idx) => (
              <div
                key={agent.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors mb-2 border"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  idx < 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{agent.name}</p>
                    {agent.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {agent.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {agent.trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{agent.successRate}% éxito</span>
                    <span>{agent.actionsExecuted} acciones</span>
                    <span>{agent.insightsGenerated} insights</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{agent.score}</p>
                  <div className="flex gap-1 justify-end">
                    {agent.badges.slice(0, 2).map((badge, i) => {
                      const BadgeIcon = BADGE_ICONS[badge]?.icon || Star;
                      return <BadgeIcon key={i} className={cn("h-3 w-3", BADGE_ICONS[badge]?.color)} />;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ERPAgentLeaderboard;
