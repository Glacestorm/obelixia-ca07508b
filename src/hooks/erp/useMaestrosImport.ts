/**
 * Hook para importación inteligente de datos Maestros con IA
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type EntityType = 'customers' | 'suppliers' | 'items' | 'taxes' | 'payment_terms' | 'warehouses';

export interface DetectedEntity {
  entity_type: EntityType;
  confidence: number;
  records_count: number;
  sample_data: Record<string, unknown>[];
  field_mapping: Record<string, string>;
  warnings: string[];
  ready_to_import: boolean;
}

export interface AnalysisResult {
  detected_entities: DetectedEntity[];
  file_format: string;
  encoding_issues: boolean;
  total_records: number;
  summary: string;
}

export interface ImportError {
  row: number;
  field: string;
  error: string;
  original_value: unknown;
}

export interface ImportResult {
  entity_type: EntityType;
  records: Record<string, unknown>[];
  total_processed: number;
  valid_count: number;
  invalid_count: number;
  errors: ImportError[];
  warnings: string[];
  auto_generated_codes: number;
}

export interface ImportExecution {
  id: string;
  entity_type: EntityType;
  status: 'pending' | 'processing' | 'success' | 'partial' | 'error';
  total_records: number;
  inserted_count: number;
  error_count: number;
  errors: ImportError[];
  started_at: Date;
  completed_at?: Date;
}

export function useMaestrosImport() {
  const { currentCompany } = useERPContext();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [importResults, setImportResults] = useState<ImportExecution[]>([]);
  const [currentFile, setCurrentFile] = useState<{ name: string; content: string } | null>(null);

  // Leer archivo como texto
  const readFileContent = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      
      // Para Excel, necesitamos procesar diferente
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        // Leer como base64 para Excel
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }, []);

  // Analizar archivo con IA
  const analyzeFile = useCallback(async (file: File) => {
    if (!companyId) {
      toast.error('Selecciona una empresa primero');
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const content = await readFileContent(file);
      setCurrentFile({ name: file.name, content });

      const { data, error } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          action: 'analyze',
          fileContent: content,
          fileName: file.name,
          companyId
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setAnalysisResult(data.data);
        toast.success('Archivo analizado correctamente');
        return data.data as AnalysisResult;
      }

      throw new Error(data?.error || 'Error en el análisis');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar archivo';
      toast.error(message);
      console.error('[useMaestrosImport] analyzeFile error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, readFileContent]);

  // Importar entidad específica
  const importEntity = useCallback(async (entityType: EntityType): Promise<ImportExecution | null> => {
    if (!companyId || !currentFile) {
      toast.error('No hay archivo para importar');
      return null;
    }

    const executionId = crypto.randomUUID();
    const execution: ImportExecution = {
      id: executionId,
      entity_type: entityType,
      status: 'processing',
      total_records: 0,
      inserted_count: 0,
      error_count: 0,
      errors: [],
      started_at: new Date()
    };

    setImportResults(prev => [...prev, execution]);
    setIsImporting(true);

    try {
      // Paso 1: Procesar con IA
      const { data: aiData, error: aiError } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          action: 'import',
          fileContent: currentFile.content,
          fileName: currentFile.name,
          entityType,
          companyId
        }
      });

      if (aiError) throw aiError;

      if (!aiData?.success || !aiData?.data?.records) {
        throw new Error(aiData?.error || 'Error procesando datos');
      }

      const importData = aiData.data as ImportResult;
      execution.total_records = importData.total_processed;

      // Paso 2: Insertar en base de datos
      const records = importData.records.map((record: Record<string, unknown>) => ({
        ...record,
        company_id: companyId
      }));

      if (records.length === 0) {
        execution.status = 'error';
        execution.errors = [{ row: 0, field: '', error: 'No hay registros válidos para importar', original_value: null }];
        setImportResults(prev => prev.map(e => e.id === executionId ? execution : e));
        toast.error('No hay registros válidos para importar');
        return execution;
      }

      // Insertar en lotes de 50
      const batchSize = 50;
      let insertedCount = 0;
      const insertErrors: ImportError[] = [...importData.errors];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        let inserted: unknown[] | null = null;
        let insertError: Error | null = null;

        // Insertar según tipo de entidad
        try {
          switch (entityType) {
            case 'customers':
              const customersResult = await supabase.from('customers').insert(batch as any).select();
              inserted = customersResult.data;
              if (customersResult.error) insertError = customersResult.error;
              break;
            case 'suppliers':
              const suppliersResult = await supabase.from('suppliers').insert(batch as any).select();
              inserted = suppliersResult.data;
              if (suppliersResult.error) insertError = suppliersResult.error;
              break;
            case 'items':
              const itemsResult = await supabase.from('items').insert(batch as any).select();
              inserted = itemsResult.data;
              if (itemsResult.error) insertError = itemsResult.error;
              break;
            case 'taxes':
              const taxesResult = await supabase.from('taxes').insert(batch as any).select();
              inserted = taxesResult.data;
              if (taxesResult.error) insertError = taxesResult.error;
              break;
            case 'payment_terms':
              const paymentTermsResult = await supabase.from('payment_terms').insert(batch as any).select();
              inserted = paymentTermsResult.data;
              if (paymentTermsResult.error) insertError = paymentTermsResult.error;
              break;
            case 'warehouses':
              const warehousesResult = await supabase.from('warehouses').insert(batch as any).select();
              inserted = warehousesResult.data;
              if (warehousesResult.error) insertError = warehousesResult.error;
              break;
          }
        } catch (err) {
          insertError = err instanceof Error ? err : new Error('Unknown error');
        }

        if (insertError) {
          console.error(`[useMaestrosImport] Batch insert error:`, insertError);
          insertErrors.push({
            row: i,
            field: '',
            error: insertError.message,
            original_value: batch
          });
        } else {
          insertedCount += inserted?.length || 0;
        }
      }

      execution.inserted_count = insertedCount;
      execution.error_count = importData.invalid_count + insertErrors.length;
      execution.errors = insertErrors;
      execution.completed_at = new Date();
      execution.status = insertedCount === records.length ? 'success' : 
                         insertedCount > 0 ? 'partial' : 'error';

      setImportResults(prev => prev.map(e => e.id === executionId ? execution : e));

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [entityType, companyId] });

      if (execution.status === 'success') {
        toast.success(`${insertedCount} ${getEntityLabel(entityType)} importados correctamente`);
      } else if (execution.status === 'partial') {
        toast.warning(`${insertedCount} importados, ${execution.error_count} errores`);
      } else {
        toast.error('Error en la importación');
      }

      return execution;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en la importación';
      execution.status = 'error';
      execution.errors = [{ row: 0, field: '', error: message, original_value: null }];
      execution.completed_at = new Date();
      setImportResults(prev => prev.map(e => e.id === executionId ? execution : e));
      toast.error(message);
      console.error('[useMaestrosImport] importEntity error:', err);
      return execution;
    } finally {
      setIsImporting(false);
    }
  }, [companyId, currentFile, queryClient]);

  // Importar todas las entidades detectadas
  const importAll = useCallback(async () => {
    if (!analysisResult?.detected_entities.length) {
      toast.error('No hay entidades detectadas para importar');
      return;
    }

    const entitiesToImport = analysisResult.detected_entities
      .filter(e => e.ready_to_import && e.confidence >= 70);

    if (entitiesToImport.length === 0) {
      toast.error('No hay entidades listas para importar');
      return;
    }

    const results: ImportExecution[] = [];

    for (const entity of entitiesToImport) {
      const result = await importEntity(entity.entity_type);
      if (result) results.push(result);
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const partialCount = results.filter(r => r.status === 'partial').length;

    if (successCount === results.length) {
      toast.success('Todas las entidades importadas correctamente');
    } else if (successCount + partialCount > 0) {
      toast.warning(`${successCount} completas, ${partialCount} parciales`);
    }

    return results;
  }, [analysisResult, importEntity]);

  // Reset estado
  const reset = useCallback(() => {
    setAnalysisResult(null);
    setImportResults([]);
    setCurrentFile(null);
  }, []);

  return {
    // Estado
    isAnalyzing,
    isImporting,
    analysisResult,
    importResults,
    currentFile,
    
    // Acciones
    analyzeFile,
    importEntity,
    importAll,
    reset,
  };
}

// Helper para labels
function getEntityLabel(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    customers: 'clientes',
    suppliers: 'proveedores',
    items: 'artículos',
    taxes: 'impuestos',
    payment_terms: 'condiciones de pago',
    warehouses: 'almacenes'
  };
  return labels[entityType];
}

export default useMaestrosImport;
