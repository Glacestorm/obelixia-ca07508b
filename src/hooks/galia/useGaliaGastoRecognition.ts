/**
 * GALIA - Hook de Reconocimiento de Gastos
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GastoAnalysisResult {
  factura: {
    proveedor: string;
    nif_proveedor: string;
    numero_factura: string;
    fecha_emision: string;
    total: number;
    base_imponible: number;
    cuota_iva: number;
  };
  confianza: number;
}

export function useGaliaGastoRecognition() {
  const [isProcessing, setIsProcessing] = useState(false);

  const procesarFactura = useCallback(async (textoFactura: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('galia-gasto-recognition', {
        body: {
          action: 'extract_factura',
          facturaTexto: textoFactura
        }
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        toast.success('Factura procesada correctamente');
        return data.data as GastoAnalysisResult;
      }
    } catch (error) {
      console.error('Error procesando factura:', error);
      toast.error('Error al procesar factura');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    procesarFactura
  };
}

export default useGaliaGastoRecognition;
