/**
 * GaliaGamificationPanel - Panel de gamificación para técnicos
 * Puntos, logros, desafíos y rankings
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Award,
  Flame,
  Crown,
  Medal,
  Clock,
  TrendingUp,
  Gift,
  CheckCircle,
  Lock
} from 'lucide-react';
import { useGaliaGamification } from '@/hooks/galia/useGaliaGamification';
import { cn } from '@/lib/utils';

interface GaliaGamificationPanelProps {
  galId?: string;
  className?: string;
}

export function GaliaGamificationPanel({ galId, className }: GaliaGamificationPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const {
    isLoading,
    stats,
    achievements,
    leaderboard,
    challenges,
    currentLevel,
    isTopTen,
    fetchLeaderboard,
    getLevelInfo
  } = useGaliaGamification(galId);

  const levelInfo = stats ? getLevelInfo(stats.total_points) : null;

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setLeaderboardPeriod(period);
    fetchLeaderboard(period);
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-amber-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Medal className="h-5 w-5 text-orange-400" />;
    return null;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header con nivel y puntos */}
      {stats && levelInfo && (
        <Card className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar y nivel */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{currentLevel}</span>
                  </div>
                  {isTopTen && (
                    <div className="absolute -top-1 -right-1 p-1 bg-amber-500 rounded-full">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tu nivel</p>
                  <h3 className="text-xl font-bold">{levelInfo.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Racha: {stats.streak_days} días</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <Star className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                  <p className="text-2xl font-bold">{stats.total_points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Puntos totales</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <Trophy className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">#{stats.rank}</p>
                  <p className="text-xs text-muted-foreground">Ranking</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <Award className="h-6 w-6 mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold">{stats.achievements_earned}</p>
                  <p className="text-xs text-muted-foreground">Logros</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <Zap className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                  <p className="text-2xl font-bold">{stats.weekly_points}</p>
                  <p className="text-xs text-muted-foreground">Esta semana</p>
                </div>
              </div>
            </div>

            {/* Barra de progreso al siguiente nivel */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso al nivel {currentLevel + 1}</span>
                <span className="text-muted-foreground">
                  {levelInfo.pointsToNextLevel} puntos restantes
                </span>
              </div>
              <Progress value={levelInfo.progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="achievements">Logros</TabsTrigger>
          <TabsTrigger value="challenges">Desafíos</TabsTrigger>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Logros recientes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  Últimos Logros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.slice(0, 4).map((achievement) => (
                    <div 
                      key={achievement.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                      {achievement.earned_at && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                  {achievements.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Aún no tienes logros. ¡Sigue trabajando!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Desafíos activos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Desafíos Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {challenges.slice(0, 4).map((challenge) => (
                    <div 
                      key={challenge.id}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            challenge.type === 'daily' ? 'default' : 
                            challenge.type === 'weekly' ? 'secondary' : 'outline'
                          }>
                            {challenge.type === 'daily' ? 'Diario' : 
                             challenge.type === 'weekly' ? 'Semanal' : 'Especial'}
                          </Badge>
                          <span className="font-medium">{challenge.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Gift className="h-4 w-4" />
                          <span className="font-bold">+{challenge.reward}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {challenge.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(challenge.progress / challenge.target) * 100} 
                          className="h-2 flex-1"
                        />
                        <span className="text-xs font-medium">
                          {challenge.progress}/{challenge.target}
                        </span>
                      </div>
                    </div>
                  ))}
                  {challenges.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay desafíos activos ahora mismo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Todos los logros */}
        <TabsContent value="achievements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Logros</CardTitle>
              <CardDescription>
                {stats?.achievements_earned || 0} de {stats?.achievements_available || 0} desbloqueados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => {
                    const isEarned = !!achievement.earned_at;
                    
                    return (
                      <div 
                        key={achievement.id}
                        className={cn(
                          "p-4 rounded-lg border text-center transition-all",
                          isEarned 
                            ? "bg-primary/5 border-primary/30" 
                            : "bg-muted/30 opacity-60"
                        )}
                      >
                        <div className={cn(
                          "text-4xl mb-2",
                          !isEarned && "grayscale"
                        )}>
                          {achievement.icon}
                        </div>
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        {isEarned ? (
                          <Badge className="mt-2" variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Desbloqueado
                          </Badge>
                        ) : (
                          <div className="mt-2">
                            {achievement.progress !== undefined && (
                              <Progress 
                                value={(achievement.progress / (achievement.points_required || 100)) * 100} 
                                className="h-1.5 mb-1"
                              />
                            )}
                            <Badge variant="outline" className="text-muted-foreground">
                              <Lock className="h-3 w-3 mr-1" />
                              Bloqueado
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desafíos */}
        <TabsContent value="challenges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Desafíos Disponibles</CardTitle>
              <CardDescription>Completa desafíos para ganar puntos extra</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {challenges.map((challenge) => (
                  <div 
                    key={challenge.id}
                    className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            challenge.type === 'daily' ? 'default' : 
                            challenge.type === 'weekly' ? 'secondary' : 'outline'
                          }>
                            {challenge.type === 'daily' ? 'Diario' : 
                             challenge.type === 'weekly' ? 'Semanal' : 'Especial'}
                          </Badge>
                          <h4 className="font-medium">{challenge.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                        {challenge.expires_at && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Expira: {new Date(challenge.expires_at).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="h-4 w-4" />
                          +{challenge.reward}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progreso</span>
                        <span className="font-medium">{challenge.progress}/{challenge.target}</span>
                      </div>
                      <Progress 
                        value={(challenge.progress / challenge.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
                {challenges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay desafíos disponibles</p>
                    <p className="text-sm">Vuelve más tarde para nuevos desafíos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Tabla de Clasificación
                  </CardTitle>
                  <CardDescription>Los mejores técnicos del GAL</CardDescription>
                </div>
                <div className="flex gap-1">
                  {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                    <Button
                      key={period}
                      variant={leaderboardPeriod === period ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handlePeriodChange(period)}
                    >
                      {period === 'daily' ? 'Hoy' : period === 'weekly' ? 'Semana' : 'Mes'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.user_id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                        index < 3 && "bg-gradient-to-r",
                        index === 0 && "from-amber-500/10 to-transparent border-amber-500/30",
                        index === 1 && "from-gray-400/10 to-transparent border-gray-400/30",
                        index === 2 && "from-orange-400/10 to-transparent border-orange-400/30"
                      )}
                    >
                      <div className="flex items-center justify-center w-8">
                        {getPositionIcon(entry.rank) || (
                          <span className="font-bold text-muted-foreground">{entry.rank}</span>
                        )}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar} />
                        <AvatarFallback>
                          {entry.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{entry.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Nivel {entry.level}</span>
                          {entry.streak > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Flame className="h-3 w-3 text-orange-500" />
                                {entry.streak} días
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{entry.points.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">puntos</p>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay datos de ranking</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaGamificationPanel;
