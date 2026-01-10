import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  order_position: number;
  probability: number | null;
  probability_mode: 'auto' | 'manual';
  color: string;
  icon: string | null;
  is_terminal: boolean;
  terminal_type: 'won' | 'lost' | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreatePipelineStage = Omit<PipelineStage, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePipelineStage = Partial<CreatePipelineStage> & { id: string };

export function usePipelineStages() {
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    staleTime: 60000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-stages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_stages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createStage = useMutation({
    mutationFn: async (data: CreatePipelineStage) => {
      const { data: result, error } = await supabase
        .from('pipeline_stages')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast.success('Etapa creada correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear etapa: ' + error.message);
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...data }: UpdatePipelineStage) => {
      const { data: result, error } = await supabase
        .from('pipeline_stages')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast.success('Etapa actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar etapa: ' + error.message);
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast.success('Etapa eliminada');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar etapa: ' + error.message);
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each stage's order_position
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('pipeline_stages')
          .update({ order_position: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast.success('Orden actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al reordenar: ' + error.message);
    },
  });

  const setDefaultStage = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from('pipeline_stages')
        .update({ is_default: false })
        .eq('is_default', true);
      
      // Then set the new default
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast.success('Etapa por defecto actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Helper: get default stage
  const defaultStage = stages.find(s => s.is_default) || stages[0];
  
  // Helper: get stage by id
  const getStageById = (id: string) => stages.find(s => s.id === id);
  
  // Helper: get stage by slug (for backward compatibility)
  const getStageBySlug = (slug: string) => stages.find(s => s.slug === slug);

  // Helper: get non-terminal stages
  const activeStages = stages.filter(s => !s.is_terminal);
  
  // Helper: get terminal stages
  const terminalStages = stages.filter(s => s.is_terminal);

  return {
    stages,
    isLoading,
    error,
    refetch,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    setDefaultStage,
    // Helpers
    defaultStage,
    getStageById,
    getStageBySlug,
    activeStages,
    terminalStages,
  };
}
