/**
 * useMaestrosAgents - Agentes IA especializados para cada sub-módulo de Maestros
 * Con un supervisor general que coordina y atiende a todos
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS ===

export type MaestrosModuleType = 
  | 'customers' 
  | 'suppliers' 
  | 'items' 
  | 'taxes' 
  | 'payment_terms' 
  | 'warehouses' 
  | 'locations' 
  | 'banks' 
  | 'sepa' 
  | 'series';

export interface MaestrosAgent {
  id: string;
  type: MaestrosModuleType;
  name: string;
  description: string;
  icon: string;
  status: 'idle' | 'analyzing' | 'processing' | 'active' | 'error' | 'paused';
  capabilities: string[];
  lastActivity: string | null;
  tasksCompleted: number;
  successRate: number;
}

export interface MaestrosSupervisor {
  status: 'idle' | 'coordinating' | 'running' | 'optimizing';
  activeAgents: number;
  totalAgents: number;
  lastCoordination: string | null;
  insights: SupervisorInsight[];
  autonomousMode: boolean;
}

export interface SupervisorInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'optimization' | 'conflict';
  message: string;
  affectedModules: MaestrosModuleType[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  targetModule: MaestrosModuleType;
  fileName: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors: string[];
  warnings: string[];
  startedAt: string;
  completedAt: string | null;
  result: ImportResult | null;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: Record<string, unknown>;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
  mappedData: Record<string, unknown>[];
}

// === CONFIGURACIÓN DE AGENTES ===

export const MAESTROS_AGENT_CONFIG: Record<MaestrosModuleType, Omit<MaestrosAgent, 'id' | 'status' | 'lastActivity' | 'tasksCompleted' | 'successRate'>> = {
  customers: {
    type: 'customers',
    name: 'Agente Clientes',
    description: 'Especialista en gestión, importación y análisis de clientes',
    icon: 'Users',
    capabilities: [
      'import_customers',
      'validate_tax_ids',
      'detect_duplicates',
      'enrich_data',
      'segment_customers',
      'analyze_credit_risk'
    ]
  },
  suppliers: {
    type: 'suppliers',
    name: 'Agente Proveedores',
    description: 'Especialista en gestión y evaluación de proveedores',
    icon: 'Truck',
    capabilities: [
      'import_suppliers',
      'validate_banking_data',
      'detect_duplicates',
      'evaluate_supplier',
      'check_compliance'
    ]
  },
  items: {
    type: 'items',
    name: 'Agente Artículos',
    description: 'Especialista en catálogo de productos y servicios',
    icon: 'Package',
    capabilities: [
      'import_items',
      'categorize_items',
      'detect_duplicates',
      'suggest_pricing',
      'analyze_margins',
      'optimize_inventory'
    ]
  },
  taxes: {
    type: 'taxes',
    name: 'Agente Impuestos',
    description: 'Especialista en configuración fiscal e impuestos',
    icon: 'Receipt',
    capabilities: [
      'import_taxes',
      'validate_rates',
      'detect_conflicts',
      'suggest_configurations',
      'compliance_check'
    ]
  },
  payment_terms: {
    type: 'payment_terms',
    name: 'Agente Cond. Pago',
    description: 'Especialista en condiciones de pago y financiación',
    icon: 'Wallet',
    capabilities: [
      'import_payment_terms',
      'analyze_terms',
      'suggest_optimizations',
      'detect_risks'
    ]
  },
  warehouses: {
    type: 'warehouses',
    name: 'Agente Almacenes',
    description: 'Especialista en gestión de almacenes',
    icon: 'Warehouse',
    capabilities: [
      'import_warehouses',
      'validate_locations',
      'optimize_layout',
      'analyze_capacity'
    ]
  },
  locations: {
    type: 'locations',
    name: 'Agente Ubicaciones',
    description: 'Especialista en ubicaciones dentro de almacenes',
    icon: 'MapPin',
    capabilities: [
      'import_locations',
      'validate_codes',
      'optimize_picking',
      'analyze_usage'
    ]
  },
  banks: {
    type: 'banks',
    name: 'Agente Bancos',
    description: 'Especialista en cuentas bancarias y datos SEPA',
    icon: 'CreditCard',
    capabilities: [
      'import_bank_accounts',
      'validate_iban',
      'validate_swift',
      'detect_duplicates'
    ]
  },
  sepa: {
    type: 'sepa',
    name: 'Agente SEPA',
    description: 'Especialista en mandatos SEPA y domiciliaciones',
    icon: 'FileCheck',
    capabilities: [
      'import_mandates',
      'validate_sepa_format',
      'check_expiration',
      'manage_renewals'
    ]
  },
  series: {
    type: 'series',
    name: 'Agente Series',
    description: 'Especialista en series de facturación y documentos',
    icon: 'Hash',
    capabilities: [
      'import_series',
      'validate_sequences',
      'detect_gaps',
      'suggest_naming'
    ]
  }
};

// === HOOK PRINCIPAL ===

export function useMaestrosAgents() {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<MaestrosAgent[]>([]);
  const [supervisor, setSupervisor] = useState<MaestrosSupervisor | null>(null);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const isMountedRef = useRef(true);

  // === INICIALIZAR AGENTES ===
  const initializeAgents = useCallback(() => {
    const initialAgents: MaestrosAgent[] = Object.entries(MAESTROS_AGENT_CONFIG).map(
      ([key, config]) => ({
        id: `maestros_agent_${key}`,
        ...config,
        status: 'idle' as const,
        lastActivity: null,
        tasksCompleted: 0,
        successRate: 100
      })
    );

    setAgents(initialAgents);

    setSupervisor({
      status: 'running',
      activeAgents: 0,
      totalAgents: initialAgents.length,
      lastCoordination: new Date().toISOString(),
      insights: [],
      autonomousMode: false
    });

    setLastRefresh(new Date());
    return initialAgents;
  }, []);

  // === EJECUTAR IMPORTACIÓN IA ===
  const executeAIImport = useCallback(async (
    file: File,
    targetModule: MaestrosModuleType,
    options?: {
      autoMap?: boolean;
      validateOnly?: boolean;
      skipDuplicates?: boolean;
    }
  ): Promise<ImportJob | null> => {
    if (!isMountedRef.current) return null;
    setIsLoading(true);

    const jobId = `import_${Date.now()}`;
    const newJob: ImportJob = {
      id: jobId,
      status: 'pending',
      targetModule,
      fileName: file.name,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      errors: [],
      warnings: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null
    };

    setImportJobs(prev => [newJob, ...prev]);

    // Actualizar estado del agente
    setAgents(prev => prev.map(a => 
      a.type === targetModule ? { ...a, status: 'processing' as const } : a
    ));

    try {
      // Leer archivo
      const fileContent = await readFileContent(file);
      
      // Actualizar job a processing
      setImportJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'processing' as const } : j
      ));

      // Llamar a edge function
      const { data, error } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          action: 'smart_import',
          targetModule,
          fileName: file.name,
          fileType: file.type,
          fileContent,
          options: {
            autoMap: options?.autoMap ?? true,
            validateOnly: options?.validateOnly ?? false,
            skipDuplicates: options?.skipDuplicates ?? true
          }
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      const result = data as {
        success: boolean;
        totalRecords: number;
        processedRecords: number;
        failedRecords: number;
        errors: string[];
        warnings: string[];
        result: ImportResult;
      };

      // Actualizar job con resultado
      const finalJob: ImportJob = {
        ...newJob,
        status: result.success ? 'completed' : (result.failedRecords > 0 ? 'partial' : 'failed'),
        totalRecords: result.totalRecords || 0,
        processedRecords: result.processedRecords || 0,
        failedRecords: result.failedRecords || 0,
        errors: result.errors || [],
        warnings: result.warnings || [],
        completedAt: new Date().toISOString(),
        result: result.result || null
      };

      setImportJobs(prev => prev.map(j => 
        j.id === jobId ? finalJob : j
      ));

      // Actualizar agente
      setAgents(prev => prev.map(a => 
        a.type === targetModule ? { 
          ...a, 
          status: 'active' as const,
          lastActivity: new Date().toISOString(),
          tasksCompleted: a.tasksCompleted + 1
        } : a
      ));

      // Notificar
      if (result.success) {
        toast.success(`Importación completada: ${result.processedRecords} registros procesados`);
      } else if (result.failedRecords > 0) {
        toast.warning(`Importación parcial: ${result.processedRecords}/${result.totalRecords} registros`);
      } else {
        toast.error('Error en la importación');
      }

      return finalJob;
    } catch (error) {
      console.error('[useMaestrosAgents] executeAIImport error:', error);
      
      if (isMountedRef.current) {
        const failedJob: ImportJob = {
          ...newJob,
          status: 'failed',
          completedAt: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        };

        setImportJobs(prev => prev.map(j => 
          j.id === jobId ? failedJob : j
        ));

        setAgents(prev => prev.map(a => 
          a.type === targetModule ? { ...a, status: 'error' as const } : a
        ));

        toast.error('Error en la importación');
        return failedJob;
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // === COORDINAR SUPERVISOR ===
  const supervisorCoordinate = useCallback(async (
    objective: string
  ) => {
    if (!isMountedRef.current) return null;
    setIsLoading(true);

    try {
      setSupervisor(prev => prev ? { ...prev, status: 'coordinating' } : prev);

      const { data, error } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          action: 'supervisor_coordinate',
          objective,
          agents: agents.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            capabilities: a.capabilities
          }))
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      const result = data as {
        insights: SupervisorInsight[];
        recommendations: string[];
      };

      setSupervisor(prev => prev ? {
        ...prev,
        status: 'running',
        lastCoordination: new Date().toISOString(),
        insights: result.insights || []
      } : prev);

      toast.success('Coordinación del supervisor completada');
      return result;
    } catch (error) {
      console.error('[useMaestrosAgents] supervisorCoordinate error:', error);
      if (isMountedRef.current) {
        toast.error('Error en coordinación');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setSupervisor(prev => prev ? { ...prev, status: 'running' } : prev);
      }
    }
  }, [agents]);

  // === ANALIZAR ARCHIVO ===
  const analyzeFile = useCallback(async (
    file: File
  ): Promise<{
    detectedFormat: string;
    suggestedModule: MaestrosModuleType;
    columns: string[];
    sampleData: Record<string, unknown>[];
    confidence: number;
  } | null> => {
    if (!isMountedRef.current) return null;
    setIsLoading(true);

    try {
      const fileContent = await readFileContent(file);

      const { data, error } = await supabase.functions.invoke('maestros-ai-import', {
        body: {
          action: 'analyze_file',
          fileName: file.name,
          fileType: file.type,
          fileContent: fileContent.substring(0, 10000) // Limitar para análisis
        }
      });

      if (error) throw error;
      if (!isMountedRef.current) return null;

      return data as {
        detectedFormat: string;
        suggestedModule: MaestrosModuleType;
        columns: string[];
        sampleData: Record<string, unknown>[];
        confidence: number;
      };
    } catch (error) {
      console.error('[useMaestrosAgents] analyzeFile error:', error);
      toast.error('Error al analizar archivo');
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // === UTILIDADES ===
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      
      if (file.type.includes('json') || file.type.includes('csv') || file.type.includes('xml') || file.type.includes('text')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const clearImportJob = useCallback((jobId: string) => {
    setImportJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  const retryImportJob = useCallback(async (job: ImportJob, file: File) => {
    clearImportJob(job.id);
    return executeAIImport(file, job.targetModule);
  }, [clearImportJob, executeAIImport]);

  // === CLEANUP ===
  useEffect(() => {
    isMountedRef.current = true;
    initializeAgents();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [initializeAgents]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    agents,
    supervisor,
    importJobs,
    lastRefresh,
    // Configuración
    MAESTROS_AGENT_CONFIG,
    // Acciones
    initializeAgents,
    executeAIImport,
    supervisorCoordinate,
    analyzeFile,
    clearImportJob,
    retryImportJob
  };
}

export default useMaestrosAgents;
