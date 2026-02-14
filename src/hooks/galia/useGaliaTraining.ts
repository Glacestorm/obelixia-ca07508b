/**
 * useGaliaTraining - Hook para gestión de formación de técnicos GAL
 * Conecta con las tablas galia_training_progress y galia_training_needs
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface TrainingModule {
  key: string;
  title: string;
  description: string;
  category: 'asistente' | 'panel' | 'toolkit' | 'circuito' | 'normativa' | 'exportacion';
  estimatedMinutes: number;
  icon: string;
}

export interface TrainingProgress {
  id: string;
  user_id: string;
  module_key: string;
  module_title: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingNeed {
  id: string;
  user_id: string;
  area: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'resolved';
  created_at: string;
  updated_at: string;
}

// === MÓDULOS FORMATIVOS PREDEFINIDOS ===
export const TRAINING_MODULES: TrainingModule[] = [
  {
    key: 'mod-asistente-basico',
    title: 'Uso del Asistente IA',
    description: 'Aprende a interactuar con el asistente inteligente para consultas normativas, análisis de expedientes y generación de informes.',
    category: 'asistente',
    estimatedMinutes: 30,
    icon: '🤖',
  },
  {
    key: 'mod-panel-control',
    title: 'Panel de Control y Dashboard',
    description: 'Navegación por el dashboard, interpretación de KPIs, alertas y estado de expedientes en tiempo real.',
    category: 'panel',
    estimatedMinutes: 25,
    icon: '📊',
  },
  {
    key: 'mod-moderacion-costes',
    title: 'Moderación de Costes Automatizada',
    description: 'Uso de la herramienta de comparación de presupuestos con catálogos de referencia y detección de desviaciones.',
    category: 'toolkit',
    estimatedMinutes: 40,
    icon: '💰',
  },
  {
    key: 'mod-circuito-tramitacion',
    title: 'Circuito de Tramitación LEADER',
    description: 'Flujo completo de 49 pasos: desde solicitud hasta cierre, incluyendo bifurcaciones y subsanaciones.',
    category: 'circuito',
    estimatedMinutes: 60,
    icon: '🔄',
  },
  {
    key: 'mod-deteccion-fraude',
    title: 'Detección de Fraude e Indicios',
    description: 'Sistema de scoring para fraccionamiento de contratos, facturas sospechosas y conflictos de interés.',
    category: 'toolkit',
    estimatedMinutes: 35,
    icon: '🛡️',
  },
  {
    key: 'mod-clasificacion-docs',
    title: 'Clasificación Documental con IA',
    description: 'Reconocimiento y clasificación automática de documentación: DNI, escrituras, facturas, certificados.',
    category: 'toolkit',
    estimatedMinutes: 25,
    icon: '📄',
  },
  {
    key: 'mod-vinculaciones',
    title: 'Análisis de Empresas Vinculadas',
    description: 'Cruce de NIF/CIF, detección de participaciones >25% y límites de minimis (Reg. UE 2023/2831).',
    category: 'toolkit',
    estimatedMinutes: 30,
    icon: '🔗',
  },
  {
    key: 'mod-generacion-informes',
    title: 'Generación de Informes y Resoluciones',
    description: 'Elaboración automatizada de requerimientos, informes técnicos y resoluciones con CSV (Ley 39/2015).',
    category: 'exportacion',
    estimatedMinutes: 35,
    icon: '📝',
  },
  {
    key: 'mod-normativa-rag',
    title: 'Base de Conocimiento Normativo',
    description: 'Consulta inteligente de legislación: BOE, BOPA, DOUE, reglamentos FEDER/LEADER y BDNS.',
    category: 'normativa',
    estimatedMinutes: 20,
    icon: '⚖️',
  },
  {
    key: 'mod-gasto-recognition',
    title: 'Reconocimiento Automático de Gastos',
    description: 'Extracción de datos de facturas, clasificación contable (PGC 2007) y validación de gastos justificados.',
    category: 'toolkit',
    estimatedMinutes: 30,
    icon: '🧾',
  },
];

// === HOOK ===
export function useGaliaTraining() {
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [needs, setNeeds] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(false);

  // === FETCH PROGRESS ===
  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('galia_training_progress')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProgress((data || []) as TrainingProgress[]);
    } catch (err) {
      console.error('[useGaliaTraining] fetchProgress error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // === START MODULE ===
  const startModule = useCallback(async (moduleKey: string) => {
    const mod = TRAINING_MODULES.find(m => m.key === moduleKey);
    if (!mod) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Inicia sesión para continuar'); return; }

      const { error } = await supabase
        .from('galia_training_progress')
        .upsert({
          user_id: user.id,
          module_key: moduleKey,
          module_title: mod.title,
          status: 'in_progress',
          progress_percentage: 10,
          started_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,module_key' });

      if (error) throw error;
      toast.success(`Módulo "${mod.title}" iniciado`);
      await fetchProgress();
    } catch (err) {
      console.error('[useGaliaTraining] startModule error:', err);
      toast.error('Error al iniciar módulo');
    }
  }, [fetchProgress]);

  // === UPDATE PROGRESS ===
  const updateModuleProgress = useCallback(async (moduleKey: string, percentage: number) => {
    try {
      const isCompleted = percentage >= 100;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = progress.find(p => p.module_key === moduleKey);
      if (!existing) return;

      const { error } = await supabase
        .from('galia_training_progress')
        .update({
          progress_percentage: Math.min(percentage, 100),
          status: isCompleted ? 'completed' : 'in_progress',
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', existing.id);

      if (error) throw error;
      if (isCompleted) toast.success('¡Módulo completado! 🎉');
      await fetchProgress();
    } catch (err) {
      console.error('[useGaliaTraining] updateProgress error:', err);
    }
  }, [progress, fetchProgress]);

  // === FETCH NEEDS ===
  const fetchNeeds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('galia_training_needs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNeeds((data || []) as TrainingNeed[]);
    } catch (err) {
      console.error('[useGaliaTraining] fetchNeeds error:', err);
    }
  }, []);

  // === SUBMIT NEED ===
  const submitNeed = useCallback(async (area: string, description: string, priority: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Inicia sesión'); return; }

      const { error } = await supabase
        .from('galia_training_needs')
        .insert({
          user_id: user.id,
          area,
          description,
          priority,
        } as any);

      if (error) throw error;
      toast.success('Necesidad formativa registrada');
      await fetchNeeds();
    } catch (err) {
      console.error('[useGaliaTraining] submitNeed error:', err);
      toast.error('Error al registrar necesidad');
    }
  }, [fetchNeeds]);

  // === COMPUTED STATS ===
  const stats = {
    totalModules: TRAINING_MODULES.length,
    completed: progress.filter(p => p.status === 'completed').length,
    inProgress: progress.filter(p => p.status === 'in_progress').length,
    pending: TRAINING_MODULES.length - progress.length,
    overallProgress: TRAINING_MODULES.length > 0
      ? Math.round(progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / TRAINING_MODULES.length)
      : 0,
    totalHours: Math.round(TRAINING_MODULES.reduce((sum, m) => sum + m.estimatedMinutes, 0) / 60 * 10) / 10,
  };

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchProgress();
    fetchNeeds();
  }, [fetchProgress, fetchNeeds]);

  return {
    progress,
    needs,
    loading,
    stats,
    modules: TRAINING_MODULES,
    fetchProgress,
    startModule,
    updateModuleProgress,
    fetchNeeds,
    submitNeed,
  };
}

export default useGaliaTraining;
