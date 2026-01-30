/**
 * Gamificación con IA - Tendencia Disruptiva 2025-2026
 * Puntos y clasificaciones para vendedores basados en métricas predictivas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Zap,
  Target,
  TrendingUp,
  Award,
  Crown,
  Sparkles,
  Gift,
  Clock,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesRep {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  rank: number;
  previousRank: number;
  badges: Badge[];
  streak: number;
  level: number;
  xpToNextLevel: number;
  currentXp: number;
  stats: {
    dealsWon: number;
    pipelineValue: number;
    winRate: number;
    avgCycleTime: number;
    followUpScore: number;
  };
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  endsAt: Date;
  type: 'daily' | 'weekly' | 'monthly';
}

const RANK_ICONS = [Crown, Trophy, Medal];
const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export function GamificationLeaderboard() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  
  const [salesReps] = useState<SalesRep[]>([
    {
      id: '1',
      name: 'María García',
      points: 12450,
      rank: 1,
      previousRank: 2,
      streak: 15,
      level: 24,
      xpToNextLevel: 1000,
      currentXp: 750,
      badges: [
        { id: 'b1', name: 'Cerrador Legendario', icon: '🏆', description: 'Cerró 10 deals en un mes', rarity: 'legendary', earnedAt: new Date() },
        { id: 'b2', name: 'Rey del Follow-Up', icon: '👑', description: 'Racha de 30 días sin deals fríos', rarity: 'epic', earnedAt: new Date() },
      ],
      stats: { dealsWon: 28, pipelineValue: 450000, winRate: 42, avgCycleTime: 18, followUpScore: 95 },
    },
    {
      id: '2',
      name: 'Carlos Ruiz',
      points: 11200,
      rank: 2,
      previousRank: 1,
      streak: 8,
      level: 22,
      xpToNextLevel: 1000,
      currentXp: 400,
      badges: [
        { id: 'b3', name: 'Velocista', icon: '⚡', description: 'Ciclo de venta < 10 días', rarity: 'rare', earnedAt: new Date() },
      ],
      stats: { dealsWon: 24, pipelineValue: 380000, winRate: 38, avgCycleTime: 15, followUpScore: 88 },
    },
    {
      id: '3',
      name: 'Ana López',
      points: 9800,
      rank: 3,
      previousRank: 3,
      streak: 12,
      level: 20,
      xpToNextLevel: 1000,
      currentXp: 600,
      badges: [
        { id: 'b4', name: 'Constante', icon: '🎯', description: '30 días activo', rarity: 'common', earnedAt: new Date() },
      ],
      stats: { dealsWon: 20, pipelineValue: 320000, winRate: 35, avgCycleTime: 22, followUpScore: 82 },
    },
    {
      id: '4',
      name: 'Pedro Sánchez',
      points: 8500,
      rank: 4,
      previousRank: 5,
      streak: 5,
      level: 18,
      xpToNextLevel: 1000,
      currentXp: 200,
      badges: [],
      stats: { dealsWon: 16, pipelineValue: 250000, winRate: 32, avgCycleTime: 25, followUpScore: 75 },
    },
  ]);

  const [challenges] = useState<Challenge[]>([
    {
      id: 'c1',
      title: 'Cerrador Veloz',
      description: 'Cierra 3 deals esta semana',
      progress: 2,
      target: 3,
      reward: 500,
      endsAt: new Date(Date.now() + 259200000),
      type: 'weekly',
    },
    {
      id: 'c2',
      title: 'Rey del Follow-Up',
      description: 'Contacta todos tus deals abiertos hoy',
      progress: 8,
      target: 12,
      reward: 100,
      endsAt: new Date(Date.now() + 43200000),
      type: 'daily',
    },
    {
      id: 'c3',
      title: 'Pipeline Master',
      description: 'Alcanza €500k en pipeline este mes',
      progress: 380000,
      target: 500000,
      reward: 2000,
      endsAt: new Date(Date.now() + 864000000),
      type: 'monthly',
    },
  ]);

  const currentUser = salesReps[0];

  const getRankChange = (current: number, previous: number) => {
    const diff = previous - current;
    if (diff > 0) return <ArrowUp className="h-3 w-3 text-green-500" />;
    if (diff < 0) return <ArrowDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* User Stats Header */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-yellow-500">
              <AvatarFallback className="text-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-yellow-500 text-white text-xs font-bold">
              {currentUser.level}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{currentUser.name}</h3>
              <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                <Crown className="h-3 w-3 mr-1" />
                Rank #{currentUser.rank}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {currentUser.points.toLocaleString()} pts
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                {currentUser.streak} días racha
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Nivel {currentUser.level}</span>
                <span>{currentUser.currentXp}/{currentUser.xpToNextLevel} XP</span>
              </div>
              <Progress value={(currentUser.currentXp / currentUser.xpToNextLevel) * 100} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard" className="text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Retos
          </TabsTrigger>
          <TabsTrigger value="badges" className="text-xs">
            <Award className="h-3 w-3 mr-1" />
            Insignias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Clasificación del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {salesReps.map((rep, idx) => {
                    const RankIcon = RANK_ICONS[idx] || Medal;
                    return (
                      <div 
                        key={rep.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          idx === 0 && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/30"
                        )}
                      >
                        <div className="flex items-center gap-2 w-12">
                          {idx < 3 ? (
                            <RankIcon className={cn("h-5 w-5", RANK_COLORS[idx])} />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">#{rep.rank}</span>
                          )}
                          {getRankChange(rep.rank, rep.previousRank)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40">
                            {rep.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{rep.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{rep.stats.dealsWon} deals</span>
                            <span>•</span>
                            <span>{rep.stats.winRate}% win rate</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-orange-500" />
                              {rep.streak}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{rep.points.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">puntos</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="mt-3">
          <div className="space-y-2">
            {challenges.map((challenge) => {
              const progressPercent = (challenge.progress / challenge.target) * 100;
              const isCompleted = progressPercent >= 100;
              return (
                <Card key={challenge.id} className={cn(isCompleted && "border-green-500/30 bg-green-50/50 dark:bg-green-950/20")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{challenge.title}</h4>
                          <Badge variant="outline" className="text-[10px]">
                            {challenge.type}
                          </Badge>
                          {isCompleted && (
                            <Badge className="bg-green-500 text-white text-[10px]">
                              ¡Completado!
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{challenge.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Gift className="h-4 w-4" />
                        <span className="font-bold text-sm">{challenge.reward}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.ceil((challenge.endsAt.getTime() - Date.now()) / 86400000)} días
                        </span>
                      </div>
                      <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Tus Insignias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {currentUser.badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className={cn(
                      "p-3 rounded-lg text-center",
                      getRarityColor(badge.rarity)
                    )}
                  >
                    <div className="text-3xl mb-1">{badge.icon}</div>
                    <div className="font-medium text-sm">{badge.name}</div>
                    <div className="text-xs opacity-80">{badge.description}</div>
                  </div>
                ))}
                {currentUser.badges.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aún no tienes insignias</p>
                    <p className="text-xs">¡Completa retos para ganarlas!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GamificationLeaderboard;
