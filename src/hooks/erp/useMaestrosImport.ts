/**
 * Hook para importación inteligente de datos maestros usando IA
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ImportEntityType = 
  | 'customers' 
  | 'suppliers' 
  | 'items' 
  | 'taxes' 
  | 'payment_terms' 
  | 'warehouses' 
  | 'bank_accounts';

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: ImportError[];
  mappedData: Record<string, unknown>[];
}

export interface ImportProgress {
  stage: 'idle' | 'reading' | 'analyzing' | 'mapping' | 'importing' | 'complete' | 'error';
  percent: number;
  message: string;
}

const ENTITY_LABELS: Record<ImportEntityType, string> = {
  customers: 'Clientes',
  suppliers: 'Proveedores',
  items: 'Artículos',
  taxes: 'Impuestos',
  payment_terms: 'Condiciones de Pago',
  warehouses: 'Almacenes',
  bank_accounts: 'Cuentas Bancarias'
};

const TABLE_NAMES: Record<ImportEntityType, string> = {
  customers: 'erp_customers',
  suppliers: 'erp_suppliers',
  items: 'erp_items',
  taxes: 'erp_taxes',
  payment_terms: 'erp_payment_terms',
  warehouses: 'erp_warehouses',
  bank_accounts: 'erp_bank_accounts'
};

export function useMaestrosImport(companyId: string | undefined) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    percent: 0,
    message: ''
  });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);

  const resetState = useCallback(() => {
    setIsImporting(false);
    setProgress({ stage: 'idle', percent: 0, message: '' });
    setResult(null);
    setPreviewData(null);
  }, []);

  const readFileContent = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }, []);

  const analyzeFile = useCallback(async (
    file: File,
    targetEntity: ImportEntityType
  ): Promise<ImportResult | null> => {
    if (!companyId) {
      toast.error('No hay empresa seleccionada');
      return null;
    }

    setIsImporting(true);
    setResult(null);
    setPreviewData(null);

    try {
      // Stage 1: Reading file
      setProgress({ stage: 'reading', percent: 10, message: 'Leyendo archivo...' });
      const fileContent = await readFileContent(file);

      if (!fileContent.trim()) {
        throw new Error('El archivo está vacío');
      }

      // Stage 2: Analyzing with AI
      setProgress({ stage: 'analyzing', percent: 30, message: 'Analizando con IA...' });

      const { data, error } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          fileContent,
          fileName: file.name,
          fileType: file.type || 'text/plain',
          targetEntity,
          companyId
        }
      });

      if (error) {
        console.error('[useMaestrosImport] Edge function error:', error);
        throw new Error(error.message || 'Error en el procesamiento');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar el archivo');
      }

      // Stage 3: Mapping complete
      setProgress({ stage: 'mapping', percent: 70, message: 'Datos mapeados correctamente' });

      const importResult: ImportResult = {
        success: true,
        totalRows: data.totalRows,
        importedRows: data.importedRows,
        failedRows: data.failedRows,
        errors: data.errors || [],
        mappedData: data.mappedData || []
      };

      setResult(importResult);
      setPreviewData(data.mappedData?.slice(0, 10) || []);
      setProgress({ stage: 'complete', percent: 100, message: 'Análisis completado' });

      return importResult;

    } catch (error) {
      console.error('[useMaestrosImport] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setProgress({ stage: 'error', percent: 0, message: errorMessage });
      toast.error(`Error: ${errorMessage}`);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [companyId, readFileContent]);

  // Notify Supervisor General (erp-module-agent) about import completion
  const notifySupervisor = useCallback(async (
    targetEntity: ImportEntityType,
    importResult: ImportResult
  ) => {
    try {
      await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'coordinate',
          agentType: 'supervisor',
          domain: 'maestros',
          context: {
            operation: 'import_completed',
            entity: targetEntity,
            totalRows: importResult.totalRows,
            importedRows: importResult.importedRows,
            failedRows: importResult.failedRows,
            timestamp: new Date().toISOString()
          }
        }
      });
      console.log('[useMaestrosImport] Supervisor notified');
    } catch (error) {
      console.warn('[useMaestrosImport] Could not notify supervisor:', error);
    }
  }, []);

  const confirmImport = useCallback(async (
    targetEntity: ImportEntityType
  ): Promise<boolean> => {
    if (!companyId || !result?.mappedData?.length) {
      toast.error('No hay datos para importar');
      return false;
    }

    setIsImporting(true);
    setProgress({ stage: 'importing', percent: 50, message: 'Importando datos...' });

    try {
      const tableName = TABLE_NAMES[targetEntity];
      const dataToInsert = result.mappedData.map(row => ({
        ...row,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insert in batches of 100 using raw SQL via RPC or direct insert
      const batchSize = 100;
      let insertedCount = 0;
      const errors: ImportError[] = [];

      for (let i = 0; i < dataToInsert.length; i += batchSize) {
        const batch = dataToInsert.slice(i, i + batchSize);
        
        // Use type assertion for dynamic table names
        const { error: insertError } = await (supabase
          .from(tableName as any)
          .insert(batch) as any);

        if (insertError) {
          console.error(`[useMaestrosImport] Insert error batch ${i}:`, insertError);
          errors.push({
            row: i,
            field: 'batch',
            message: insertError.message
          });
        } else {
          insertedCount += batch.length;
        }

        const percent = 50 + Math.round((i / dataToInsert.length) * 50);
        setProgress({
          stage: 'importing',
          percent,
          message: `Importando ${insertedCount}/${dataToInsert.length}...`
        });
      }

      if (errors.length === 0) {
        toast.success(`${insertedCount} ${ENTITY_LABELS[targetEntity]} importados correctamente`);
        setProgress({ stage: 'complete', percent: 100, message: 'Importación completada' });
        const finalResult: ImportResult = {
          ...result!,
          success: true,
          importedRows: insertedCount
        };
        setResult(finalResult);
        // Notify Supervisor General
        await notifySupervisor(targetEntity, finalResult);
        return true;
      } else {
        toast.warning(`Importados ${insertedCount} registros con ${errors.length} errores`);
        setResult(prev => prev ? {
          ...prev,
          errors: [...(prev.errors || []), ...errors],
          failedRows: errors.length
        } : null);
        return insertedCount > 0;
      }

    } catch (error) {
      console.error('[useMaestrosImport] Confirm import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al importar';
      setProgress({ stage: 'error', percent: 0, message: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [companyId, result]);

  return {
    // State
    isImporting,
    progress,
    result,
    previewData,
    // Actions
    analyzeFile,
    confirmImport,
    resetState,
    // Utilities
    entityLabels: ENTITY_LABELS
  };
}

export default useMaestrosImport;
