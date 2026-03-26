/**
 * useHRDocumentGenerator — Motor de generación documental automática
 * V2-ES.4 Paso 5.2: Generación idempotente de registros documentales draft
 *
 * REGLAS:
 * - Crea registros en erp_hr_employee_documents con status 'draft'
 * - Idempotente: no duplica si ya existe (employee_id + document_type + related_entity)
 * - Metadata incluye generation_mode: 'auto' para trazabilidad
 * - No genera archivo físico ni contenido — solo registros placeholder
 * - Compatible con checklist, alertas, expediente y versionado existentes
 * - Graceful degradation cuando no hay reglas para el proceso
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHRDocGenerationRules, type DocGenerationRule } from './useHRDocGenerationRules';
import { toast } from 'sonner';
import { buildLedgerRow, LEDGER_EVENT_LABELS } from '@/engines/erp/hr/ledgerEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerationContext {
  companyId: string;
  employeeId: string;
  employeeName?: string;
  requestType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface GenerationResult {
  generated: number;
  skipped: number;
  failed: number;
  details: Array<{
    documentType: string;
    label: string;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    documentId?: string;
  }>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRDocumentGenerator() {
  const { getRulesForRequest, isLoading: rulesLoading } = useHRDocGenerationRules();
  const [isGenerating, setIsGenerating] = useState(false);
  // Note: companyId comes from context.companyId in generateDocuments
  // We use a lazy writer approach below

  /**
   * Genera registros documentales draft para un proceso HR.
   * Idempotente: compara contra documentos existentes antes de insertar.
   */
  const generateDocuments = useCallback(async (
    context: GenerationContext,
  ): Promise<GenerationResult> => {
    const rules = getRulesForRequest(context.requestType);
    const result: GenerationResult = { generated: 0, skipped: 0, failed: 0, details: [] };

    if (rules.length === 0) {
      return result;
    }

    setIsGenerating(true);

    try {
      // 1. Fetch existing docs for this entity to check idempotency
      let query = supabase
        .from('erp_hr_employee_documents')
        .select('id, document_type')
        .eq('employee_id', context.employeeId)
        .eq('company_id', context.companyId);

      if (context.relatedEntityType && context.relatedEntityId) {
        query = query
          .eq('related_entity_type', context.relatedEntityType)
          .eq('related_entity_id', context.relatedEntityId);
      }

      const { data: existingDocs, error: fetchError } = await query;

      if (fetchError) {
        console.error('[useHRDocumentGenerator] Error fetching existing docs:', fetchError.message);
        toast.error('Error al verificar documentos existentes');
        return result;
      }

      const existingTypes = new Set(
        (existingDocs ?? []).map(d => d.document_type.toLowerCase().trim()),
      );

      // 2. Generate each missing document
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      for (const rule of rules) {
        const normalizedType = rule.document_type_code.toLowerCase().trim();

        // Idempotency check
        if (existingTypes.has(normalizedType)) {
          result.skipped++;
          result.details.push({
            documentType: rule.document_type_code,
            label: rule.label,
            status: 'skipped',
            reason: 'Ya existe un documento de este tipo',
          });
          continue;
        }

        // Resolve placeholders in document name
        const documentName = rule.default_document_name.replace(
          '{employee}',
          context.employeeName ?? 'Empleado',
        );

        try {
          const { data: newDoc, error: insertError } = await supabase
            .from('erp_hr_employee_documents')
            .insert({
              company_id: context.companyId,
              employee_id: context.employeeId,
              document_type: rule.document_type_code,
              document_name: documentName,
              document_url: 'pending://auto-generated',
              document_status: 'draft',
              category: rule.default_category,
              subcategory: rule.default_subcategory,
              is_confidential: rule.is_confidential_default,
              notes: rule.notes_template,
              source: 'auto_generated',
              related_entity_type: context.relatedEntityType ?? null,
              related_entity_id: context.relatedEntityId ?? null,
              uploaded_by: userId ?? null,
              metadata: {
                generation_mode: rule.generation_mode ?? 'auto',
                generation_rule_id: rule.id,
                process_type: context.requestType,
                generated_at: new Date().toISOString(),
                ...(rule.metadata_defaults ?? {}),
              },
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Audit: log generation event (best-effort)
          if (newDoc?.id) {
            (supabase as any)
              .from('erp_hr_document_access_log')
              .insert({
                document_id: newDoc.id,
                document_table: 'erp_hr_employee_documents',
                user_id: userId ?? null,
                action: 'doc_auto_generated',
                metadata: {
                  generation_mode: rule.generation_mode ?? 'auto',
                  generation_rule_id: rule.id,
                  process_type: context.requestType,
                  document_type_code: rule.document_type_code,
                  related_entity_type: context.relatedEntityType,
                  related_entity_id: context.relatedEntityId,
                },
              })
              .then(({ error: auditErr }: any) => {
                if (auditErr) console.warn('[useHRDocumentGenerator] Audit log failed (non-blocking):', auditErr.message);
              });
          }

          result.generated++;
          result.details.push({
            documentType: rule.document_type_code,
            label: rule.label,
            status: 'created',
            documentId: newDoc?.id,
          });

          // Ledger: document_generated (fire-and-forget, inline since no stable companyId at hook level)
          if (newDoc?.id) {
            try {
              const row = await buildLedgerRow({
                companyId: context.companyId,
                eventType: 'document_generated',
                eventLabel: LEDGER_EVENT_LABELS['document_generated'],
                entityType: 'employee_document',
                entityId: newDoc.id,
                sourceModule: 'document_generator',
                actorId: userId,
                afterSnapshot: {
                  document_type: rule.document_type_code,
                  employee_id: context.employeeId,
                  process_type: context.requestType,
                  generation_mode: rule.generation_mode ?? 'auto',
                },
              });
              (supabase as any).from('erp_hr_ledger').insert(row).then(() => {});
            } catch (ledgerErr) {
              console.warn('[useHRDocumentGenerator] Ledger write failed (non-blocking):', ledgerErr);
            }
          }

          // Mark as existing to prevent intra-batch duplicates
          existingTypes.add(normalizedType);
        } catch (err) {
          console.error(`[useHRDocumentGenerator] Failed to create ${rule.document_type_code}:`, err);
          result.failed++;
          result.details.push({
            documentType: rule.document_type_code,
            label: rule.label,
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      }

      // 3. Summary toast
      if (result.generated > 0) {
        toast.success(
          `${result.generated} documento${result.generated > 1 ? 's' : ''} generado${result.generated > 1 ? 's' : ''} como borrador`,
        );
      } else if (result.skipped > 0 && result.generated === 0) {
        toast.info('Todos los documentos esperados ya existen');
      }

      return result;
    } catch (err) {
      console.error('[useHRDocumentGenerator] Unexpected error:', err);
      toast.error('Error inesperado en la generación documental');
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, [getRulesForRequest]);

  /**
   * Preview: returns which documents would be generated (without creating them).
   */
  const previewGeneration = useCallback(async (
    context: GenerationContext,
  ): Promise<GenerationResult['details']> => {
    const rules = getRulesForRequest(context.requestType);
    if (rules.length === 0) return [];

    let query = supabase
      .from('erp_hr_employee_documents')
      .select('document_type')
      .eq('employee_id', context.employeeId)
      .eq('company_id', context.companyId);

    if (context.relatedEntityType && context.relatedEntityId) {
      query = query
        .eq('related_entity_type', context.relatedEntityType)
        .eq('related_entity_id', context.relatedEntityId);
    }

    const { data: existingDocs } = await query;
    const existingTypes = new Set(
      (existingDocs ?? []).map(d => d.document_type.toLowerCase().trim()),
    );

    return rules.map(rule => {
      const exists = existingTypes.has(rule.document_type_code.toLowerCase().trim());
      return {
        documentType: rule.document_type_code,
        label: rule.label,
        status: exists ? 'skipped' as const : 'created' as const,
        reason: exists ? 'Ya existe' : undefined,
      };
    });
  }, [getRulesForRequest]);

  return {
    generateDocuments,
    previewGeneration,
    isGenerating,
    isLoading: rulesLoading,
  };
}
