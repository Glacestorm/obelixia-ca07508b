/**
 * useGaliaGamification - Hook para sistema de gamificación de técnicos
 * Puntos, logros, desafíos y rankings
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required?: number;
  condition: string;
  earned_at?: string;
  progress?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  streak: number;
  achievements_count: number;
  badge?: string;
}

export interface UserStats {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  level: number;
  points_to_next_level: number;
  streak_days: number;
  rank: number;
  achievements_earned: number;
  achievements_available: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  reward: number;
  type: 'daily' | 'weekly' | 'special';
  progress: number;
  target: number;
  expires_at: string | null;
}

export interface PointsResult {
  points_earned: number;
  base_points: number;
  multiplier: number;
  new_total: number;
  activity: string;
  new_achievements: Achievement[];
  streak: number;
}

export type ActivityType = 
  | 'expediente_resuelto'
  | 'expediente_sin_incidencias'
  | 'documento_verificado'
  | 'respuesta_rapida'
  | 'beneficiario_satisfecho'
  | 'primer_expediente_dia'
  | 'racha_3_dias'
  | 'racha_7_dias'
  | 'meta_semanal_cumplida'
  | 'formacion_completada'
  | 'mentor_nuevo_tecnico'
  | 'sugerencia_aceptada'
  | 'zero_errores_semana';

export function useGaliaGamification(galId?: string) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // === OTORGAR PUNTOS ===
  const awardPoints = useCallback(async (
    activityType: ActivityType,
    activityData?: Record<string, unknown>
  ): Promise<PointsResult | null> => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'award_points',
            user_id: user.id,
            gal_id: galId,
            activity_type: activityType,
            activity_data: activityData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const result = data.data as PointsResult;
        
        // Mostrar notificación de puntos
        toast.success(`+${result.points_earned} puntos!`, {
          description: result.activity,
          icon: '🎯'
        });

        // Notificar nuevos logros
        if (result.new_achievements?.length > 0) {
          result.new_achievements.forEach(achievement => {
            toast.success(`¡Logro desbloqueado!`, {
              description: `${achievement.icon} ${achievement.name}`,
              duration: 5000
            });
          });
        }

        // Actualizar stats locales
        if (stats) {
          setStats({
            ...stats,
            total_points: result.new_total,
            streak_days: result.streak
          });
        }

        return result;
      }

      throw new Error('Error otorgando puntos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGamification] awardPoints error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, galId, stats]);

  // === OBTENER ESTADÍSTICAS DEL USUARIO ===
  const fetchUserStats = useCallback(async () => {
    if (!user?.id) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'get_user_stats',
            user_id: user.id
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data.data.stats) {
        setStats(data.data.stats);
        setAchievements(data.data.achievements || []);
        return data.data;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGamification] fetchUserStats error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // === OBTENER TABLA DE CLASIFICACIÓN ===
  const fetchLeaderboard = useCallback(async (
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly'
  ) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'get_leaderboard',
            gal_id: galId,
            period
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setLeaderboard(data.data.leaderboard || []);
        return data.data.leaderboard;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaGamification] fetchLeaderboard error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [galId]);

  // === VERIFICAR LOGROS ===
  const checkAchievements = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'check_achievements',
            user_id: user.id
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaGamification] checkAchievements error:', err);
      return null;
    }
  }, [user?.id]);

  // === OBTENER DESAFÍOS ===
  const fetchChallenges = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'get_challenges',
            user_id: user.id
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setChallenges(data.data.active_challenges || []);
        return data.data.active_challenges;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaGamification] fetchChallenges error:', err);
      return [];
    }
  }, [user?.id]);

  // === COMPLETAR DESAFÍO ===
  const completeChallenge = useCallback(async (challengeId: string) => {
    if (!user?.id) return false;

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-gamification',
        {
          body: {
            action: 'complete_challenge',
            user_id: user.id,
            challenge_id: challengeId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data.data.completed) {
        toast.success('¡Desafío completado!', {
          description: `+${data.data.reward_earned} puntos`,
          icon: '🏆'
        });
        
        // Refrescar desafíos
        await fetchChallenges();
        await fetchUserStats();
        
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useGaliaGamification] completeChallenge error:', err);
      return false;
    }
  }, [user?.id, fetchChallenges, fetchUserStats]);

  // === CALCULAR NIVEL ===
  const getLevelInfo = useCallback((points: number) => {
    const level = Math.floor(points / 500) + 1;
    const pointsInLevel = points % 500;
    const pointsToNextLevel = 500 - pointsInLevel;
    const progressPercent = (pointsInLevel / 500) * 100;

    return {
      level,
      pointsInLevel,
      pointsToNextLevel,
      progressPercent,
      title: getLevelTitle(level)
    };
  }, []);

  // === CARGAR DATOS INICIALES ===
  useEffect(() => {
    if (user?.id) {
      fetchUserStats();
      fetchLeaderboard('weekly');
      fetchChallenges();
    }
  }, [user?.id, fetchUserStats, fetchLeaderboard, fetchChallenges]);

  return {
    isLoading,
    error,
    stats,
    achievements,
    leaderboard,
    challenges,
    // Acciones
    awardPoints,
    fetchUserStats,
    fetchLeaderboard,
    checkAchievements,
    fetchChallenges,
    completeChallenge,
    getLevelInfo,
    // Estado derivado
    currentLevel: stats ? Math.floor(stats.total_points / 500) + 1 : 1,
    isTopTen: stats ? stats.rank <= 10 : false
  };
}

// === HELPER: TÍTULO DE NIVEL ===
function getLevelTitle(level: number): string {
  if (level >= 20) return 'Gran Maestro LEADER';
  if (level >= 15) return 'Experto LEADER';
  if (level >= 10) return 'Técnico Senior';
  if (level >= 7) return 'Técnico Avanzado';
  if (level >= 5) return 'Técnico';
  if (level >= 3) return 'Técnico Junior';
  return 'Aprendiz';
}

export default useGaliaGamification;
