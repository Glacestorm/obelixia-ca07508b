/**
 * Hook para gestión de SII (Suministro Inmediato de Información)
 * Cola de registros, estados, incidencias, workflow de corrección
 * 
 * NOTA: Usa datos demo hasta que los tipos de Supabase se regeneren
 */

import { useState, useCallback, useEffect } from 'react';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// ============ TYPES ============

export type SIIBookType = 'emitted' | 'received' | 'intra' | 'recc_cobros' | 'recc_pagos';
export type SIIRecordStatus = 'pending' | 'generated' | 'sent' | 'accepted' | 'accepted_with_errors' | 'rejected';
export type SIITaskStatus = 'open' | 'in_progress' | 'done';

export interface SIIConfig {
  company_id: string;
  enabled: boolean;
  start_date?: string;
  end_date?: string;
  certificate_id?: string;
  auto_send: boolean;
  storage_path?: string;
  tax_id?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SIIRecord {
  id: string;
  company_id: string;
  book: SIIBookType;
  source_type: string;
  source_id?: string;
  document_number?: string;
  issue_date: string;
  counterparty_tax_id?: string;
  counterparty_name?: string;
  base_amount: number;
  tax_amount: number;
  total_amount: number;
  tax_rate?: number;
  operation_type?: string;
  status: SIIRecordStatus;
  generation_date?: string;
  sent_date?: string;
  response_date?: string;
  csv_code?: string;
  last_error?: string;
  last_response_json?: Record<string, unknown>;
  retry_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SIIShipment {
  id: string;
  company_id: string;
  book: SIIBookType;
  record_count: number;
  status: string;
  payload_xml?: string;
  response_xml?: string;
  response_json?: Record<string, unknown>;
  accepted_count: number;
  rejected_count: number;
  error_message?: string;
  sent_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SIITask {
  id: string;
  company_id: string;
  record_id?: string;
  shipment_id?: string;
  task_type: string;
  priority: string;
  assigned_to_user_id?: string;
  status: SIITaskStatus;
  title: string;
  description?: string;
  error_code?: string;
  notes?: string;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  record?: SIIRecord;
}

export interface SIIStats {
  pending: number;
  generated: number;
  sent: number;
  accepted: number;
  accepted_with_errors: number;
  rejected: number;
  openTasks: number;
}

export interface SIIFilters {
  book?: SIIBookType;
  status?: SIIRecordStatus;
  dateFrom?: string;
  dateTo?: string;
  counterpartyTaxId?: string;
}

// ============ DEMO DATA ============

const createDemoRecords = (companyId: string): SIIRecord[] => [
  {
    id: 'demo-sii-0',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0001',
    issue_date: '2025-01-15',
    counterparty_tax_id: 'B12345678',
    counterparty_name: 'Distribuidora Europa S.L.',
    base_amount: 10000,
    tax_amount: 2100,
    total_amount: 12100,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-1',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0002',
    issue_date: '2025-01-18',
    counterparty_tax_id: 'A98765432',
    counterparty_name: 'TechServices International S.A.',
    base_amount: 5500,
    tax_amount: 1155,
    total_amount: 6655,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'generated',
    generation_date: new Date().toISOString(),
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-2',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0003',
    issue_date: '2025-01-20',
    counterparty_tax_id: 'B55667788',
    counterparty_name: 'Consulting Pro S.L.',
    base_amount: 8200,
    tax_amount: 1722,
    total_amount: 9922,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'sent',
    generation_date: new Date(Date.now() - 86400000).toISOString(),
    sent_date: new Date().toISOString(),
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-3',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0004',
    issue_date: '2025-01-22',
    counterparty_tax_id: 'B11223344',
    counterparty_name: 'Logística Rápida S.L.',
    base_amount: 3400,
    tax_amount: 714,
    total_amount: 4114,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'accepted',
    generation_date: new Date(Date.now() - 172800000).toISOString(),
    sent_date: new Date(Date.now() - 86400000).toISOString(),
    response_date: new Date().toISOString(),
    csv_code: 'CSV202501220001',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-4',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0005',
    issue_date: '2025-01-10',
    counterparty_tax_id: 'B99887766',
    counterparty_name: 'Importaciones del Norte S.L.',
    base_amount: 15000,
    tax_amount: 3150,
    total_amount: 18150,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'accepted_with_errors',
    generation_date: new Date(Date.now() - 259200000).toISOString(),
    sent_date: new Date(Date.now() - 172800000).toISOString(),
    response_date: new Date(Date.now() - 86400000).toISOString(),
    csv_code: 'CSV202501100001',
    last_error: 'Error en NIF receptor: formato incorrecto',
    retry_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-5',
    company_id: companyId,
    book: 'emitted',
    source_type: 'invoice',
    document_number: 'FV-2025-0006',
    issue_date: '2025-01-08',
    counterparty_tax_id: 'INVALID123',
    counterparty_name: 'Cliente Prueba',
    base_amount: 2500,
    tax_amount: 525,
    total_amount: 3025,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'rejected',
    generation_date: new Date(Date.now() - 345600000).toISOString(),
    sent_date: new Date(Date.now() - 259200000).toISOString(),
    response_date: new Date(Date.now() - 172800000).toISOString(),
    last_error: 'Error 1000: NIF del destinatario no válido.',
    retry_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-6',
    company_id: companyId,
    book: 'received',
    source_type: 'purchase',
    document_number: 'FP-2025-0001',
    issue_date: '2025-01-12',
    counterparty_tax_id: 'A12348765',
    counterparty_name: 'Proveedores Industriales S.A.',
    base_amount: 7800,
    tax_amount: 1638,
    total_amount: 9438,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-7',
    company_id: companyId,
    book: 'received',
    source_type: 'purchase',
    document_number: 'FP-2025-0002',
    issue_date: '2025-01-14',
    counterparty_tax_id: 'B44556677',
    counterparty_name: 'Materiales del Sur S.L.',
    base_amount: 4200,
    tax_amount: 882,
    total_amount: 5082,
    tax_rate: 21,
    operation_type: 'F1',
    status: 'accepted',
    generation_date: new Date(Date.now() - 86400000).toISOString(),
    sent_date: new Date(Date.now() - 43200000).toISOString(),
    response_date: new Date().toISOString(),
    csv_code: 'CSV202501140001',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sii-8',
    company_id: companyId,
    book: 'intra',
    source_type: 'invoice',
    document_number: 'FI-2025-0001',
    issue_date: '2025-01-16',
    counterparty_tax_id: 'FR12345678901',
    counterparty_name: 'French Supplies SARL',
    base_amount: 25000,
    tax_amount: 0,
    total_amount: 25000,
    tax_rate: 0,
    operation_type: 'F1',
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const createDemoTasks = (companyId: string): SIITask[] => [
  {
    id: 'demo-task-1',
    company_id: companyId,
    record_id: 'demo-sii-4',
    task_type: 'correction',
    priority: 'medium',
    status: 'open',
    title: 'Corregir NIF receptor FV-2025-0005',
    description: 'El NIF del receptor tiene formato incorrecto.',
    error_code: '1000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-task-2',
    company_id: companyId,
    record_id: 'demo-sii-5',
    task_type: 'correction',
    priority: 'high',
    status: 'open',
    title: 'Reenviar factura FV-2025-0006',
    description: 'Factura rechazada por NIF inválido.',
    error_code: '1000',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============ HOOK ============

export function useERPSII() {
  const { currentCompany } = useERPContext();
  
  const [config, setConfig] = useState<SIIConfig | null>(null);
  const [records, setRecords] = useState<SIIRecord[]>([]);
  const [shipments, setShipments] = useState<SIIShipment[]>([]);
  const [tasks, setTasks] = useState<SIITask[]>([]);
  const [stats, setStats] = useState<SIIStats>({
    pending: 0,
    generated: 0,
    sent: 0,
    accepted: 0,
    accepted_with_errors: 0,
    rejected: 0,
    openTasks: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SIIFilters>({});
  const useDemoData = true; // Siempre demo hasta que tipos se regeneren

  // ============ LOAD DEMO DATA ============

  const loadDemoData = useCallback(() => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    
    const demoRecords = createDemoRecords(currentCompany.id);
    const demoTasks = createDemoTasks(currentCompany.id);
    
    // Aplicar filtros
    let filtered = demoRecords;
    if (filters.book) {
      filtered = filtered.filter(r => r.book === filters.book);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    
    setRecords(filtered);
    setTasks(demoTasks);
    
    // Calcular stats
    setStats({
      pending: demoRecords.filter(r => r.status === 'pending').length,
      generated: demoRecords.filter(r => r.status === 'generated').length,
      sent: demoRecords.filter(r => r.status === 'sent').length,
      accepted: demoRecords.filter(r => r.status === 'accepted').length,
      accepted_with_errors: demoRecords.filter(r => r.status === 'accepted_with_errors').length,
      rejected: demoRecords.filter(r => r.status === 'rejected').length,
      openTasks: demoTasks.filter(t => t.status === 'open').length,
    });
    
    setLoading(false);
  }, [currentCompany?.id, filters]);

  const fetchRecords = useCallback(() => {
    loadDemoData();
  }, [loadDemoData]);

  const fetchTasks = useCallback(() => {
    // Ya cargados en loadDemoData
  }, []);

  const fetchShipments = useCallback(() => {
    setShipments([]);
  }, []);

  // ============ ACTIONS ============

  const generateRecord = useCallback(async (recordId: string) => {
    setRecords(prev => prev.map(r => 
      r.id === recordId 
        ? { ...r, status: 'generated' as SIIRecordStatus, generation_date: new Date().toISOString() }
        : r
    ));
    toast.success('Registro SII generado');
    return true;
  }, []);

  const markAsSent = useCallback(async (recordId: string) => {
    setRecords(prev => prev.map(r => 
      r.id === recordId 
        ? { ...r, status: 'sent' as SIIRecordStatus, sent_date: new Date().toISOString() }
        : r
    ));
    toast.success('Registro marcado como enviado');
    return true;
  }, []);

  const simulateResponse = useCallback(async (recordId: string, responseType: 'accepted' | 'accepted_with_errors' | 'rejected') => {
    const record = records.find(r => r.id === recordId);
    if (!record) return false;

    const updates: Partial<SIIRecord> = {
      status: responseType,
      response_date: new Date().toISOString(),
    };

    if (responseType === 'accepted') {
      updates.csv_code = `CSV${Date.now()}`;
    } else if (responseType === 'accepted_with_errors') {
      updates.last_error = 'Advertencia: El importe declarado difiere del calculado en menos de 1€';
      updates.csv_code = `CSV${Date.now()}`;
    } else {
      updates.last_error = 'Error 3001: El NIF del destinatario no consta en el censo de la AEAT';
      updates.retry_count = (record.retry_count || 0) + 1;
    }

    setRecords(prev => prev.map(r => 
      r.id === recordId ? { ...r, ...updates } : r
    ));

    // Si rechazado o con errores, crear tarea
    if (responseType === 'rejected' || responseType === 'accepted_with_errors') {
      const newTask: SIITask = {
        id: `task-${Date.now()}`,
        company_id: currentCompany?.id || '',
        record_id: recordId,
        task_type: 'correction',
        priority: responseType === 'rejected' ? 'high' : 'medium',
        status: 'open',
        title: `Corregir ${record.document_number}`,
        description: updates.last_error,
        error_code: responseType === 'rejected' ? '3001' : 'ADV',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
      toast.warning(`Respuesta con ${responseType === 'rejected' ? 'rechazo' : 'errores'} - Tarea de corrección creada`);
    } else {
      toast.success('Registro aceptado correctamente');
    }

    return true;
  }, [records, currentCompany?.id]);

  const createTask = useCallback(async (recordId: string, taskData: Partial<SIITask>) => {
    const record = records.find(r => r.id === recordId);
    if (!record || !currentCompany?.id) return null;

    const newTask: SIITask = {
      id: `task-${Date.now()}`,
      company_id: currentCompany.id,
      record_id: recordId,
      task_type: taskData.task_type || 'review',
      priority: taskData.priority || 'medium',
      status: 'open',
      title: taskData.title || `Revisar ${record.document_number}`,
      description: taskData.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks(prev => [newTask, ...prev]);
    toast.success('Tarea creada');
    return newTask;
  }, [records, currentCompany?.id]);

  const updateTaskStatus = useCallback(async (taskId: string, status: SIITaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status, 
            updated_at: new Date().toISOString(),
            completed_at: status === 'done' ? new Date().toISOString() : undefined,
          }
        : t
    ));
    toast.success(`Tarea ${status === 'done' ? 'completada' : 'actualizada'}`);
    return true;
  }, []);

  const saveConfig = useCallback(async (configData: Partial<SIIConfig>) => {
    setConfig(prev => prev ? { ...prev, ...configData } : {
      company_id: currentCompany?.id || '',
      enabled: false,
      auto_send: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...configData,
    });
    toast.success('Configuración SII guardada');
    return true;
  }, [currentCompany?.id]);

  const generateBatch = useCallback(async (recordIds: string[]) => {
    for (const id of recordIds) {
      await generateRecord(id);
    }
    toast.success(`${recordIds.length} registros generados`);
  }, [generateRecord]);

  const sendBatch = useCallback(async (recordIds: string[]) => {
    for (const id of recordIds) {
      await markAsSent(id);
    }
    toast.success(`${recordIds.length} registros enviados`);
  }, [markAsSent]);

  // ============ EFFECTS ============

  useEffect(() => {
    if (currentCompany?.id) {
      loadDemoData();
    }
  }, [currentCompany?.id, loadDemoData]);

  return {
    config,
    records,
    shipments,
    tasks,
    stats,
    loading,
    error,
    filters,
    useDemoData,
    setFilters,
    fetchRecords,
    fetchTasks,
    fetchShipments,
    generateRecord,
    markAsSent,
    simulateResponse,
    createTask,
    updateTaskStatus,
    saveConfig,
    generateBatch,
    sendBatch,
  };
}

export default useERPSII;
