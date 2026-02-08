import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GALIA Gamification Edge Function
 * Sistema de puntos, logros y rankings para incentivar productividad de técnicos
 */

interface GamificationRequest {
  action: 'award_points' | 'check_achievements' | 'get_leaderboard' | 'get_user_stats' | 'get_challenges' | 'complete_challenge';
  user_id?: string;
  gal_id?: string;
  activity_type?: string;
  activity_data?: Record<string, unknown>;
  challenge_id?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

// Definición de puntos por actividad
const ACTIVITY_POINTS: Record<string, { points: number; description: string }> = {
  'expediente_resuelto': { points: 50, description: 'Expediente resuelto' },
  'expediente_sin_incidencias': { points: 75, description: 'Expediente sin incidencias' },
  'documento_verificado': { points: 10, description: 'Documento verificado' },
  'respuesta_rapida': { points: 25, description: 'Respuesta en menos de 24h' },
  'beneficiario_satisfecho': { points: 40, description: 'Valoración positiva del beneficiario' },
  'primer_expediente_dia': { points: 15, description: 'Primer expediente del día' },
  'racha_3_dias': { points: 100, description: 'Racha de 3 días consecutivos' },
  'racha_7_dias': { points: 250, description: 'Racha de 7 días consecutivos' },
  'meta_semanal_cumplida': { points: 150, description: 'Meta semanal cumplida' },
  'formacion_completada': { points: 200, description: 'Módulo de formación completado' },
  'mentor_nuevo_tecnico': { points: 100, description: 'Mentorizar a nuevo técnico' },
  'sugerencia_aceptada': { points: 50, description: 'Sugerencia de mejora aceptada' },
  'zero_errores_semana': { points: 300, description: 'Semana sin errores' }
};

// Definición de logros
const ACHIEVEMENTS = [
  { id: 'novato', name: 'Novato', description: 'Completar primer expediente', icon: '🌱', points_required: 0, condition: 'first_expediente' },
  { id: 'trabajador', name: 'Trabajador', description: 'Alcanzar 500 puntos', icon: '⭐', points_required: 500, condition: 'points' },
  { id: 'experto', name: 'Experto', description: 'Alcanzar 2000 puntos', icon: '🏆', points_required: 2000, condition: 'points' },
  { id: 'maestro', name: 'Maestro LEADER', description: 'Alcanzar 5000 puntos', icon: '👑', points_required: 5000, condition: 'points' },
  { id: 'veloz', name: 'Rayo', description: 'Resolver 10 expedientes en un día', icon: '⚡', points_required: 0, condition: 'speed_10' },
  { id: 'perfeccionista', name: 'Perfeccionista', description: 'Semana sin incidencias', icon: '💎', points_required: 0, condition: 'zero_errors_week' },
  { id: 'madrugador', name: 'Madrugador', description: '10 días empezando antes de las 8:00', icon: '🌅', points_required: 0, condition: 'early_bird' },
  { id: 'mentor', name: 'Mentor', description: 'Ayudar a 5 compañeros', icon: '🎓', points_required: 0, condition: 'mentor_5' },
  { id: 'imparable', name: 'Imparable', description: 'Racha de 30 días', icon: '🔥', points_required: 0, condition: 'streak_30' },
  { id: 'lider', name: 'Líder del GAL', description: 'Primer puesto del mes', icon: '🥇', points_required: 0, condition: 'monthly_leader' }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, gal_id, activity_type, activity_data, challenge_id, period } = await req.json() as GamificationRequest;

    console.log(`[galia-gamification] Processing action: ${action} for user: ${user_id}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'award_points': {
        if (!user_id || !activity_type) {
          throw new Error('Se requiere user_id y activity_type');
        }

        const activityConfig = ACTIVITY_POINTS[activity_type];
        if (!activityConfig) {
          throw new Error(`Tipo de actividad no reconocido: ${activity_type}`);
        }

        // Obtener o crear registro de gamificación del usuario
        let { data: userGamification } = await supabase
          .from('galia_gamification')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (!userGamification) {
          const { data: newRecord } = await supabase
            .from('galia_gamification')
            .insert({
              user_id,
              gal_id,
              total_points: 0,
              level: 1,
              streak_days: 0,
              achievements: [],
              weekly_points: 0,
              monthly_points: 0
            })
            .select()
            .single();
          userGamification = newRecord;
        }

        // Calcular multiplicadores
        let multiplier = 1.0;
        const currentHour = new Date().getHours();
        
        // Bonus por hora temprana (antes de las 9)
        if (currentHour < 9) {
          multiplier += 0.1;
        }
        
        // Bonus por racha
        if (userGamification.streak_days >= 7) {
          multiplier += 0.25;
        } else if (userGamification.streak_days >= 3) {
          multiplier += 0.1;
        }

        const pointsEarned = Math.round(activityConfig.points * multiplier);

        // Actualizar puntos
        const { error: updateError } = await supabase
          .from('galia_gamification')
          .update({
            total_points: (userGamification.total_points || 0) + pointsEarned,
            weekly_points: (userGamification.weekly_points || 0) + pointsEarned,
            monthly_points: (userGamification.monthly_points || 0) + pointsEarned,
            last_activity_at: new Date().toISOString()
          })
          .eq('user_id', user_id);

        if (updateError) throw updateError;

        // Registrar transacción de puntos
        await supabase
          .from('galia_point_transactions')
          .insert({
            user_id,
            activity_type,
            points: pointsEarned,
            multiplier,
            description: activityConfig.description,
            metadata: activity_data
          });

        // Verificar logros desbloqueados
        const newAchievements = await checkAchievements(supabase, user_id, userGamification.total_points + pointsEarned);

        result = {
          points_earned: pointsEarned,
          base_points: activityConfig.points,
          multiplier,
          new_total: userGamification.total_points + pointsEarned,
          activity: activityConfig.description,
          new_achievements: newAchievements,
          streak: userGamification.streak_days
        };
        break;
      }

      case 'check_achievements': {
        if (!user_id) {
          throw new Error('Se requiere user_id');
        }

        const { data: userGamification } = await supabase
          .from('galia_gamification')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (!userGamification) {
          throw new Error('Usuario no encontrado en sistema de gamificación');
        }

        const earnedAchievements = userGamification.achievements || [];
        const availableAchievements = ACHIEVEMENTS.filter(a => !earnedAchievements.includes(a.id));
        
        // Verificar cuáles puede desbloquear
        const unlockable = availableAchievements.filter(a => {
          if (a.condition === 'points' && userGamification.total_points >= a.points_required) {
            return true;
          }
          return false;
        });

        result = {
          earned: earnedAchievements.map(id => ACHIEVEMENTS.find(a => a.id === id)),
          available: availableAchievements.map(a => ({
            ...a,
            progress: a.condition === 'points' 
              ? Math.min(100, (userGamification.total_points / a.points_required) * 100)
              : 0
          })),
          unlockable: unlockable.length,
          total_achievements: ACHIEVEMENTS.length
        };
        break;
      }

      case 'get_leaderboard': {
        const periodFilter = period || 'weekly';
        let pointsField = 'total_points';
        
        if (periodFilter === 'weekly') pointsField = 'weekly_points';
        else if (periodFilter === 'monthly') pointsField = 'monthly_points';

        let query = supabase
          .from('galia_gamification')
          .select('*, profile:profiles(full_name, avatar_url)')
          .order(pointsField, { ascending: false })
          .limit(20);

        if (gal_id) {
          query = query.eq('gal_id', gal_id);
        }

        const { data: leaderboard } = await query;

        result = {
          period: periodFilter,
          gal_id: gal_id || 'global',
          leaderboard: leaderboard?.map((entry, index) => ({
            rank: index + 1,
            user_id: entry.user_id,
            name: entry.profile?.full_name || 'Técnico',
            avatar: entry.profile?.avatar_url,
            points: entry[pointsField],
            level: entry.level,
            streak: entry.streak_days,
            achievements_count: entry.achievements?.length || 0,
            badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null
          })),
          last_updated: new Date().toISOString()
        };
        break;
      }

      case 'get_user_stats': {
        if (!user_id) {
          throw new Error('Se requiere user_id');
        }

        const { data: userGamification } = await supabase
          .from('galia_gamification')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (!userGamification) {
          result = {
            registered: false,
            message: 'Usuario no registrado en gamificación'
          };
          break;
        }

        // Obtener posición en ranking
        const { count: higherRanked } = await supabase
          .from('galia_gamification')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', userGamification.total_points);

        // Historial reciente
        const { data: recentTransactions } = await supabase
          .from('galia_point_transactions')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Calcular nivel
        const level = Math.floor(userGamification.total_points / 500) + 1;
        const pointsToNextLevel = (level * 500) - userGamification.total_points;

        result = {
          user_id,
          stats: {
            total_points: userGamification.total_points,
            weekly_points: userGamification.weekly_points,
            monthly_points: userGamification.monthly_points,
            level,
            points_to_next_level: pointsToNextLevel,
            streak_days: userGamification.streak_days,
            rank: (higherRanked || 0) + 1,
            achievements_earned: userGamification.achievements?.length || 0,
            achievements_available: ACHIEVEMENTS.length - (userGamification.achievements?.length || 0)
          },
          achievements: userGamification.achievements?.map(id => ACHIEVEMENTS.find(a => a.id === id)),
          recent_activity: recentTransactions?.map(t => ({
            activity: t.description,
            points: t.points,
            timestamp: t.created_at
          }))
        };
        break;
      }

      case 'get_challenges': {
        // Desafíos activos
        const challenges = [
          {
            id: 'daily_5',
            name: 'Meta Diaria',
            description: 'Resolver 5 expedientes hoy',
            reward: 100,
            type: 'daily',
            progress: 0,
            target: 5,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'weekly_quality',
            name: 'Semana de Calidad',
            description: 'Cerrar la semana sin incidencias',
            reward: 300,
            type: 'weekly',
            progress: 0,
            target: 1,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'speed_demon',
            name: 'Velocista',
            description: 'Resolver un expediente en menos de 2 horas',
            reward: 150,
            type: 'special',
            progress: 0,
            target: 1,
            expires_at: null
          },
          {
            id: 'team_player',
            name: 'Trabajo en Equipo',
            description: 'Ayudar a 3 compañeros esta semana',
            reward: 200,
            type: 'weekly',
            progress: 0,
            target: 3,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        result = {
          active_challenges: challenges,
          completed_today: 0,
          streak_bonus_active: false
        };
        break;
      }

      case 'complete_challenge': {
        if (!user_id || !challenge_id) {
          throw new Error('Se requiere user_id y challenge_id');
        }

        // Simular completar desafío
        const challengeReward = 100; // Obtener del desafío real

        // Otorgar puntos del desafío
        const { data: userGamification } = await supabase
          .from('galia_gamification')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (userGamification) {
          await supabase
            .from('galia_gamification')
            .update({
              total_points: userGamification.total_points + challengeReward,
              weekly_points: userGamification.weekly_points + challengeReward
            })
            .eq('user_id', user_id);

          await supabase
            .from('galia_point_transactions')
            .insert({
              user_id,
              activity_type: 'challenge_completed',
              points: challengeReward,
              description: `Desafío completado: ${challenge_id}`,
              metadata: { challenge_id }
            });
        }

        result = {
          challenge_id,
          completed: true,
          reward_earned: challengeReward,
          message: '¡Desafío completado! Has ganado puntos extra.'
        };
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-gamification] Action ${action} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-gamification] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Función auxiliar para verificar logros
async function checkAchievements(supabase: any, userId: string, totalPoints: number): Promise<any[]> {
  const { data: userGamification } = await supabase
    .from('galia_gamification')
    .select('achievements')
    .eq('user_id', userId)
    .single();

  const currentAchievements = userGamification?.achievements || [];
  const newAchievements: any[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (currentAchievements.includes(achievement.id)) continue;

    let earned = false;

    if (achievement.condition === 'points' && totalPoints >= achievement.points_required) {
      earned = true;
    }

    if (earned) {
      newAchievements.push(achievement);
      currentAchievements.push(achievement.id);
    }
  }

  if (newAchievements.length > 0) {
    await supabase
      .from('galia_gamification')
      .update({ achievements: currentAchievements })
      .eq('user_id', userId);
  }

  return newAchievements;
}
