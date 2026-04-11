/**
 * useSEPACTBatch — P2.3
 * Hook for SEPA CT batch lifecycle management.
 * Assembles lines from payroll records + settlements, validates, generates XML.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import {
  type SEPACTBatch,
  type SEPACTBatchStatus,
  type SEPACTLine,
  type SEPACTCompanyInfo,
  type SEPACTValidationIssue,
  validateBatch,
  generateSEPACTXml,
  canTransition,
  evaluateValidationReadiness,
  computeBatchSummary,
  SEPACT_STATUS_LABELS,
} from '@/engines/erp/hr/sepaCtEngine';

export function useSEPACTBatch(companyId: string) {
  const [batch, setBatch] = useState<SEPACTBatch | null>(null);
  const [batches, setBatches] = useState<SEPACTBatch[]>([]);
  const [issues, setIssues] = useState<SEPACTValidationIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { writeLedgerWithEvidence } = useHRLedgerWriter(companyId, 'sepa_ct');

  // ─── Fetch company info ─────────────────────────────────────
  const fetchCompanyInfo = useCallback(async (): Promise<SEPACTCompanyInfo | null> => {
    try {
      const { data } = await supabase
        .from('erp_companies')
        .select('name, tax_id, iban, bic')
        .eq('id', companyId)
        .single();
      if (!data) return null;
      return {
        name: (data as any).name || '',
        cif: (data as any).tax_id || '',
        iban: (data as any).iban || '',
        bic: (data as any).bic || '',
      };
    } catch {
      return null;
    }
  }, [companyId]);

  // ─── Assemble lines from a payroll period ───────────────────
  const assembleFromPeriod = useCallback(async (
    periodId: string,
    periodLabel: string,
    requestedExecutionDate: string,
  ): Promise<SEPACTBatch | null> => {
    setIsLoading(true);
    try {
      // Fetch payroll records with employee data
      const { data: records, error } = await supabase
        .from('hr_payroll_records')
        .select('id, employee_id, net_salary, status, payment_reference')
        .eq('payroll_period_id', periodId)
        .neq('status', 'cancelled');

      if (error) throw error;
      if (!records || records.length === 0) {
        toast.error('No hay registros de nómina en este período');
        return null;
      }

      // Fetch employee IBANs
      const employeeIds = records.map((r: any) => r.employee_id);
      const { data: employees } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, iban')
        .in('id', employeeIds);

      const employeeMap = new Map(
        (employees || []).map((e: any) => [e.id, e])
      );

      const lines: SEPACTLine[] = records.map((r: any, idx: number) => {
        const emp = employeeMap.get(r.employee_id) as any;
        const alreadyPaid = r.status === 'paid';
        return {
          id: `line-${r.id}`,
          employeeId: r.employee_id,
          employeeName: emp ? `${emp.last_name}, ${emp.first_name}` : `Empleado ${r.employee_id.slice(0, 8)}`,
          iban: emp?.iban || '',
          amount: r.net_salary || 0,
          currency: 'EUR',
          concept: `Nómina ${periodLabel}`,
          sourceType: 'payroll' as const,
          sourceId: r.id,
          excluded: alreadyPaid,
          exclusionReason: alreadyPaid ? 'Ya pagado' : undefined,
        };
      });

      const activeLines = lines.filter(l => !l.excluded);
      const newBatch: SEPACTBatch = {
        id: crypto.randomUUID(),
        companyId,
        status: 'draft',
        periodLabel,
        requestedExecutionDate,
        lines,
        totalAmount: activeLines.reduce((s, l) => s + l.amount, 0),
        lineCount: activeLines.length,
        createdAt: new Date().toISOString(),
      };

      setBatch(newBatch);
      setBatches(prev => [newBatch, ...prev]);
      toast.success(`Lote creado: ${activeLines.length} líneas, ${newBatch.totalAmount.toFixed(2)} €`);
      return newBatch;
    } catch (err) {
      console.error('[useSEPACTBatch] assembleFromPeriod error:', err);
      toast.error('Error al crear lote SEPA CT');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ─── Toggle line exclusion ──────────────────────────────────
  const toggleLineExclusion = useCallback((lineId: string, reason?: string) => {
    setBatch(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        lines: prev.lines.map(l =>
          l.id === lineId
            ? { ...l, excluded: !l.excluded, exclusionReason: !l.excluded ? (reason || 'Excluido manualmente') : undefined }
            : l
        ),
      };
      const active = updated.lines.filter(l => !l.excluded);
      updated.totalAmount = active.reduce((s, l) => s + l.amount, 0);
      updated.lineCount = active.length;
      return updated;
    });
  }, []);

  // ─── Validate batch ─────────────────────────────────────────
  const validateCurrentBatch = useCallback(async (): Promise<boolean> => {
    if (!batch) return false;
    const company = await fetchCompanyInfo();
    if (!company) {
      toast.error('No se pudo obtener datos de la empresa');
      return false;
    }

    const foundIssues = validateBatch(batch, company);
    setIssues(foundIssues);

    const readiness = evaluateValidationReadiness(batch, company);
    if (!readiness.allowed) {
      toast.error(readiness.reason || 'Validación fallida');
      return false;
    }

    // Transition to validated
    const transition = canTransition(batch.status, 'validated');
    if (!transition.allowed) {
      toast.error(transition.reason);
      return false;
    }

    setBatch(prev => prev ? { ...prev, status: 'validated', validatedAt: new Date().toISOString() } : prev);
    toast.success('Lote validado correctamente');
    return true;
  }, [batch, fetchCompanyInfo]);

  // ─── Generate XML ───────────────────────────────────────────
  const generateXml = useCallback(async (): Promise<string | null> => {
    if (!batch) return null;
    const company = await fetchCompanyInfo();
    if (!company) {
      toast.error('No se pudo obtener datos de la empresa');
      return null;
    }

    const transition = canTransition(batch.status, 'generated');
    if (!transition.allowed) {
      toast.error(transition.reason);
      return null;
    }

    try {
      const xml = generateSEPACTXml(batch, company);
      const now = new Date().toISOString();

      setBatch(prev => prev ? { ...prev, status: 'generated', generatedAt: now, xmlContent: xml } : prev);

      // Ledger + evidence
      await writeLedgerWithEvidence(
        {
          eventType: 'sepa_ct_generated' as any,
          eventLabel: 'XML SEPA CT generado',
          entityType: 'sepa_ct_batch',
          entityId: batch.id,
          afterSnapshot: {
            period: batch.periodLabel,
            lines: batch.lineCount,
            total: batch.totalAmount,
            execution_date: batch.requestedExecutionDate,
          },
          metadata: { format: 'pain.001.001.03', automation: 'safe' },
        },
        [{
          evidenceType: 'system_generated',
          evidenceLabel: 'Fichero SEPA CT pain.001.001.03',
          refEntityType: 'sepa_ct_batch',
          refEntityId: batch.id,
          evidenceSnapshot: {
            xml_size_bytes: new Blob([xml]).size,
            active_lines: batch.lineCount,
            total_amount: batch.totalAmount,
          },
          metadata: {
            description: `SEPA CT ${batch.periodLabel}: ${batch.lineCount} transferencias por ${batch.totalAmount.toFixed(2)} €`,
          },
        }],
      );

      toast.success('XML SEPA CT generado');
      return xml;
    } catch (err) {
      console.error('[useSEPACTBatch] generateXml error:', err);
      toast.error('Error al generar XML');
      return null;
    }
  }, [batch, fetchCompanyInfo, writeLedgerWithEvidence]);

  // ─── Download XML ───────────────────────────────────────────
  const downloadXml = useCallback(() => {
    if (!batch?.xmlContent) {
      toast.error('No hay XML generado');
      return;
    }
    const blob = new Blob([batch.xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEPA_CT_${batch.periodLabel}_${batch.id.slice(0, 8)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [batch]);

  // ─── Mark exported ──────────────────────────────────────────
  const markExported = useCallback(async () => {
    if (!batch) return false;
    const t = canTransition(batch.status, 'exported');
    if (!t.allowed) { toast.error(t.reason); return false; }

    setBatch(prev => prev ? { ...prev, status: 'exported', exportedAt: new Date().toISOString() } : prev);
    toast.success('Lote marcado como exportado');
    return true;
  }, [batch]);

  // ─── Mark paid ──────────────────────────────────────────────
  const markPaid = useCallback(async () => {
    if (!batch) return false;
    const t = canTransition(batch.status, 'paid');
    if (!t.allowed) { toast.error(t.reason); return false; }

    setBatch(prev => prev ? { ...prev, status: 'paid', paidAt: new Date().toISOString() } : prev);
    toast.success('Lote confirmado como pagado');
    return true;
  }, [batch]);

  // ─── Cancel ─────────────────────────────────────────────────
  const cancelBatch = useCallback(async () => {
    if (!batch) return false;
    const t = canTransition(batch.status, 'cancelled');
    if (!t.allowed) { toast.error(t.reason); return false; }

    setBatch(prev => prev ? { ...prev, status: 'cancelled', cancelledAt: new Date().toISOString() } : prev);
    toast.success('Lote anulado');
    return true;
  }, [batch]);

  // ─── Reset to draft ─────────────────────────────────────────
  const resetToDraft = useCallback(() => {
    if (!batch) return;
    const t = canTransition(batch.status, 'draft');
    if (!t.allowed) { toast.error(t.reason); return; }
    setBatch(prev => prev ? {
      ...prev,
      status: 'draft',
      validatedAt: undefined,
      generatedAt: undefined,
      xmlContent: undefined,
    } : prev);
    setIssues([]);
  }, [batch]);

  // ─── Summary ────────────────────────────────────────────────
  const getSummary = useCallback(async () => {
    if (!batch) return null;
    const company = await fetchCompanyInfo();
    if (!company) return null;
    return computeBatchSummary(batch, company);
  }, [batch, fetchCompanyInfo]);

  return {
    batch,
    batches,
    issues,
    isLoading,
    assembleFromPeriod,
    toggleLineExclusion,
    validateCurrentBatch,
    generateXml,
    downloadXml,
    markExported,
    markPaid,
    cancelBatch,
    resetToDraft,
    getSummary,
    setBatch,
  };
}
