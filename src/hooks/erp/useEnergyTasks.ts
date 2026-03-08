import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyTask {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_user_id: string | null;
  task_type: string;
  created_at: string;
  updated_at: string;
}

export const TASK_TYPES: Record<string, { label: string; icon: string }> = {
  revisar_contrato: { label: 'Revisar contrato', icon: '📋' },
  validar_factura: { label: 'Validar factura', icon: '🧾' },
  generar_informe: { label: 'Generar informe', icon: '📊' },
  llamar_cliente: { label: 'Llamar al cliente', icon: '📞' },
  revisar_primera_factura: { label: 'Revisar 1ª factura tras cambio', icon: '🔍' },
  seguimiento: { label: 'Seguimiento', icon: '👁️' },
  general: { label: 'General', icon: '📌' },
};

export const TASK_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-600' },
  in_progress: { label: 'En curso', color: 'text-blue-600' },
  completed: { label: 'Completada', color: 'text-emerald-600' },
  cancelled: { label: 'Cancelada', color: 'text-muted-foreground' },
};

export function useEnergyTasks(caseId: string | null) {
  const [tasks, setTasks] = useState<EnergyTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!caseId) { setTasks([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_tasks')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data as EnergyTask[]) || []);
    } catch (err) {
      console.error('[useEnergyTasks] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createTask = useCallback(async (values: Partial<EnergyTask>) => {
    if (!caseId) return null;
    try {
      const { data, error } = await supabase
        .from('energy_tasks')
        .insert([{ ...values, case_id: caseId }] as any)
        .select()
        .single();
      if (error) throw error;
      const task = data as EnergyTask;
      setTasks(prev => [task, ...prev]);
      toast.success('Tarea creada');
      return task;
    } catch (err) {
      toast.error('Error al crear tarea');
      return null;
    }
  }, [caseId]);

  const updateTask = useCallback(async (id: string, values: Partial<EnergyTask>) => {
    try {
      const { data, error } = await supabase
        .from('energy_tasks')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as EnergyTask;
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      toast.success('Tarea actualizada');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar tarea');
      return null;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Tarea eliminada');
    } catch (err) {
      toast.error('Error al eliminar tarea');
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, loading, fetchTasks, createTask, updateTask, deleteTask };
}
