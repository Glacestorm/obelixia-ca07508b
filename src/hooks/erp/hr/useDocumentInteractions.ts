/**
 * useDocumentInteractions — Lightweight hook for document viewing interactions
 * V2-RRHH-P3C: Extracts logAccess + selectedDocumentId WITHOUT triggering
 * the expensive company-wide documentsQuery from useHRDocumentExpedient.
 */
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AccessAction = 'view' | 'download' | 'print' | 'share' | 'export';

export function useDocumentInteractions(companyId: string) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const logAccess = useMutation({
    mutationFn: async (params: { document_id: string; action: AccessAction; document_table?: string }) => {
      const { error } = await (supabase as any)
        .from('erp_hr_document_access_log')
        .insert({
          company_id: companyId,
          document_id: params.document_id,
          document_table: params.document_table ?? 'erp_hr_employee_documents',
          action: params.action,
          user_agent: navigator.userAgent,
        });
      if (error) throw error;
    },
  });

  return { logAccess, selectedDocumentId, setSelectedDocumentId };
}
