
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DemoConfig {
  isActive: boolean;
  dataset: 'galia' | 'crm' | 'erp' | 'banking' | 'all';
}

export function useDemoMode() {
  const { user } = useAuth();
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoDataset, setDemoDataset] = useState<DemoConfig['dataset']>('all');
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('galia-demo-mode', {
        body: { action: 'get_status', userId: user.id }
      });
      
      if (error) throw error;
      
      setIsDemoActive(data.isActive);
      setDemoDataset(data.dataset);
    } catch (err) {
      console.error('Error checking demo status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const toggleDemoMode = useCallback(async (dataset: DemoConfig['dataset'] = 'all') => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('galia-demo-mode', {
        body: { action: 'toggle', userId: user.id, dataset }
      });

      if (error) throw error;

      setIsDemoActive(data.isActive);
      setDemoDataset(data.dataset);
      
      toast.success(data.isActive 
        ? 'Modo Demo activado: Datos de prueba cargados' 
        : 'Modo Demo desactivado: Volviendo a datos reales'
      );
      
      // Forzar recarga para actualizar vistas
      window.location.reload();
      
    } catch (err) {
      console.error('Error toggling demo mode:', err);
      toast.error('Error al cambiar el modo demo');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isDemoActive,
    demoDataset,
    isLoading,
    toggleDemoMode
  };
}
