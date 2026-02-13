/**
 * GALIA - Hook de Vinculaciones Empresariales
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VinculacionResult {
  vinculaciones: Array<{
    tipo: string;
    entidad_vinculada: string;
    nif_vinculado: string;
    nivel_riesgo: string;
    detalle: string;
    requiere_accion: boolean;
  }>;
  resumen: {
    total_vinculaciones: number;
    riesgo_global: string;
    recomendacion: string;
  };
}

export function useGaliaVinculaciones() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VinculacionResult | null>(null);

  const analizarVinculaciones = useCallback(async (nif: string, nombre: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('galia-vinculacion-analysis', {
        body: {
          action: 'detect_vinculaciones',
          nif,
          beneficiarioNombre: nombre
        }
      });

      if (error) throw error;
      if (data?.success && data?.data) {
        setResult(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Error analizando vinculaciones:', error);
      toast.error('Error al analizar vinculaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    result,
    analizarVinculaciones
  };
}

export default useGaliaVinculaciones;
