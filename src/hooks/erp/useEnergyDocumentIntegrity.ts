import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntegrityIssue {
  type: 'orphan_record' | 'missing_file' | 'legacy_url' | 'broken_reference' | 'missing_registry';
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity: string;
  entityId: string;
  field: string;
  value: string;
  description: string;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  stats: {
    invoicesChecked: number;
    contractsChecked: number;
    legacyUrlsFound: number;
    brokenReferences: number;
    missingRegistry: number;
  };
  timestamp: string;
}

/**
 * Detects document integrity issues:
 * - Invoices/contracts with legacy public URLs instead of internal paths
 * - Broken file references
 * - Missing registry entries
 */
export function useEnergyDocumentIntegrity(companyId: string) {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const issues: IntegrityIssue[] = [];
    let invoicesChecked = 0;
    let contractsChecked = 0;
    let legacyUrlsFound = 0;
    let brokenReferences = 0;
    let missingRegistry = 0;

    try {
      // Get all cases for this company
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id')
        .eq('company_id', companyId);

      if (!cases || cases.length === 0) {
        setReport({ issues, stats: { invoicesChecked: 0, contractsChecked: 0, legacyUrlsFound: 0, brokenReferences: 0, missingRegistry: 0 }, timestamp: new Date().toISOString() });
        setLoading(false);
        return;
      }

      const caseIds = cases.map(c => c.id);

      // Check invoices and contracts in parallel
      const [invoicesRes, contractsRes, registryRes] = await Promise.all([
        supabase.from('energy_invoices').select('id, case_id, document_url').in('case_id', caseIds),
        supabase.from('energy_contracts').select('id, case_id, signed_document_url').in('case_id', caseIds),
        supabase.from('energy_document_registry' as any).select('id, file_path, linked_entity_id, linked_entity_type, status').in('case_id', caseIds),
      ]);

      const registry = (registryRes.data || []) as Array<{ id: string; file_path: string; linked_entity_id: string; linked_entity_type: string; status: string }>;
      const registryByEntity = new Map<string, typeof registry[0]>();
      registry.forEach(r => { if (r.linked_entity_id) registryByEntity.set(r.linked_entity_id, r); });

      // Check invoices
      for (const inv of (invoicesRes.data || []) as Array<{ id: string; case_id: string; document_url: string | null }>) {
        invoicesChecked++;
        if (inv.document_url) {
          // Legacy URL detection
          if (inv.document_url.startsWith('http')) {
            legacyUrlsFound++;
            issues.push({
              type: 'legacy_url',
              severity: 'high',
              entity: 'energy_invoices',
              entityId: inv.id,
              field: 'document_url',
              value: inv.document_url.substring(0, 80),
              description: `Factura con URL pública legacy en lugar de path interno`,
            });
          }
          // Check registry
          if (!registryByEntity.has(inv.id)) {
            missingRegistry++;
            issues.push({
              type: 'missing_registry',
              severity: 'medium',
              entity: 'energy_invoices',
              entityId: inv.id,
              field: 'document_url',
              value: inv.document_url.substring(0, 80),
              description: 'Factura con documento no registrado en audit trail',
            });
          }
        }
      }

      // Check contracts
      for (const c of (contractsRes.data || []) as Array<{ id: string; case_id: string; signed_document_url: string | null }>) {
        contractsChecked++;
        if (c.signed_document_url) {
          if (c.signed_document_url.startsWith('http')) {
            legacyUrlsFound++;
            issues.push({
              type: 'legacy_url',
              severity: 'high',
              entity: 'energy_contracts',
              entityId: c.id,
              field: 'signed_document_url',
              value: c.signed_document_url.substring(0, 80),
              description: 'Contrato con URL pública legacy en lugar de path interno',
            });
          }
          if (!registryByEntity.has(c.id)) {
            missingRegistry++;
            issues.push({
              type: 'missing_registry',
              severity: 'medium',
              entity: 'energy_contracts',
              entityId: c.id,
              field: 'signed_document_url',
              value: c.signed_document_url.substring(0, 80),
              description: 'Contrato con documento no registrado en audit trail',
            });
          }
        }
      }

      // Check orphan registry entries (linked to entities that don't exist)
      const invoiceIds = new Set((invoicesRes.data || []).map((i: any) => i.id));
      const contractIds = new Set((contractsRes.data || []).map((c: any) => c.id));
      for (const r of registry) {
        if (r.linked_entity_type === 'energy_invoices' && r.linked_entity_id && !invoiceIds.has(r.linked_entity_id)) {
          brokenReferences++;
          issues.push({
            type: 'broken_reference',
            severity: 'medium',
            entity: 'energy_document_registry',
            entityId: r.id,
            field: 'linked_entity_id',
            value: r.linked_entity_id,
            description: 'Registro documental apunta a factura inexistente',
          });
        }
        if (r.linked_entity_type === 'energy_contracts' && r.linked_entity_id && !contractIds.has(r.linked_entity_id)) {
          brokenReferences++;
          issues.push({
            type: 'broken_reference',
            severity: 'medium',
            entity: 'energy_document_registry',
            entityId: r.id,
            field: 'linked_entity_id',
            value: r.linked_entity_id,
            description: 'Registro documental apunta a contrato inexistente',
          });
        }
      }

      setReport({
        issues,
        stats: { invoicesChecked, contractsChecked, legacyUrlsFound, brokenReferences, missingRegistry },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[useEnergyDocumentIntegrity] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  return { report, loading, runCheck };
}
