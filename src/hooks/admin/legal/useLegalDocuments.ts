/**
 * useLegalDocuments - Hook para generación de documentos legales
 * Fase 3: Sistema de plantillas y generación de documentos jurídicos
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface LegalTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: 'contract' | 'complaint' | 'response' | 'motion' | 'agreement' | 'policy' | 'notice' | 'letter' | 'memo' | 'report';
  legal_area: string;
  jurisdiction_code: string;
  template_content: string;
  variables: TemplateVariable[];
  required_fields: string[];
  optional_fields: string[];
  example_filled: string | null;
  usage_instructions: string | null;
  version: string;
  is_official: boolean;
  is_active: boolean;
  usage_count: number;
  avg_rating: number;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  template_id: string;
  template_name: string;
  document_content: string;
  variables_used: Record<string, unknown>;
  jurisdiction: string;
  generated_by: string;
  generated_at: string;
  status: 'draft' | 'reviewed' | 'approved' | 'signed';
  review_notes?: string;
  approved_by?: string;
  approved_at?: string;
}

// Helper to parse JSON fields safely
const parseJsonArray = <T>(value: Json | null, defaultValue: T[]): T[] => {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value as unknown as T[];
  return defaultValue;
};

export function useLegalDocuments() {
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  // === FETCH TEMPLATES ===
  const fetchTemplates = useCallback(async (filters?: {
    type?: string;
    area?: string;
    jurisdiction?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('legal_case_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (filters?.type) {
        query = query.eq('template_type', filters.type);
      }
      if (filters?.area) {
        query = query.eq('legal_area', filters.area);
      }
      if (filters?.jurisdiction) {
        query = query.eq('jurisdiction_code', filters.jurisdiction);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;
      
      // Map to interface
      const mappedData: LegalTemplate[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        template_type: item.template_type as LegalTemplate['template_type'],
        legal_area: item.legal_area,
        jurisdiction_code: item.jurisdiction_code,
        template_content: item.template_content,
        variables: parseJsonArray<TemplateVariable>(item.variables, []),
        required_fields: parseJsonArray<string>(item.required_fields, []),
        optional_fields: parseJsonArray<string>(item.optional_fields, []),
        example_filled: item.example_filled,
        usage_instructions: item.usage_instructions,
        version: item.version || '1.0',
        is_official: item.is_official ?? false,
        is_active: item.is_active ?? true,
        usage_count: item.usage_count ?? 0,
        avg_rating: item.avg_rating ?? 0,
        created_at: item.created_at
      }));

      setTemplates(mappedData);
      return mappedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalDocuments] fetchTemplates error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE DOCUMENT ===
  const generateDocument = useCallback(async (
    templateType: string,
    variables: Record<string, unknown>,
    jurisdiction: string = 'ES'
  ): Promise<GeneratedDocument | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'generate_document',
            document_type: templateType,
            document_data: variables,
            jurisdictions: [jurisdiction]
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const generatedDoc: GeneratedDocument = {
          id: crypto.randomUUID(),
          template_id: templateType,
          template_name: templateType,
          document_content: data.document_content,
          variables_used: variables,
          jurisdiction,
          generated_by: 'current_user',
          generated_at: new Date().toISOString(),
          status: 'draft'
        };

        setGeneratedDocs(prev => [generatedDoc, ...prev]);
        toast.success('Documento generado correctamente');
        return generatedDoc;
      }

      throw new Error(data?.error || 'Error en generación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalDocuments] generateDocument error:', err);
      toast.error('Error al generar documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE TEMPLATE ===
  const createTemplate = useCallback(async (template: {
    name: string;
    template_type: string;
    legal_area: string;
    jurisdiction_code: string;
    template_content: string;
    description?: string;
    variables?: TemplateVariable[];
    required_fields?: string[];
    optional_fields?: string[];
    usage_instructions?: string;
  }) => {
    setIsLoading(true);
    try {
      // Convert variables to Json-compatible format
      const variablesJson: Json = (template.variables || []).map(v => ({
        name: v.name,
        type: v.type,
        required: v.required,
        description: v.description
      })) as Json;

      const { data, error: dbError } = await supabase
        .from('legal_case_templates')
        .insert([{
          name: template.name,
          template_type: template.template_type,
          legal_area: template.legal_area,
          jurisdiction_code: template.jurisdiction_code,
          template_content: template.template_content,
          description: template.description,
          variables: variablesJson,
          required_fields: (template.required_fields || []) as Json,
          optional_fields: (template.optional_fields || []) as Json,
          usage_instructions: template.usage_instructions,
          version: '1.0',
          is_active: true,
          is_official: false,
          usage_count: 0,
          avg_rating: 0
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Plantilla creada correctamente');
      await fetchTemplates();
      return data;
    } catch (err) {
      console.error('[useLegalDocuments] createTemplate error:', err);
      toast.error('Error al crear plantilla');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchTemplates]);

  // === UPDATE TEMPLATE ===
  const updateTemplate = useCallback(async (
    id: string,
    updates: {
      name?: string;
      description?: string;
      template_content?: string;
      usage_instructions?: string;
    }
  ) => {
    try {
      const { error: dbError } = await supabase
        .from('legal_case_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Plantilla actualizada');
      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('[useLegalDocuments] updateTemplate error:', err);
      toast.error('Error al actualizar plantilla');
      return false;
    }
  }, [fetchTemplates]);

  // === INCREMENT USAGE ===
  const incrementTemplateUsage = useCallback(async (id: string) => {
    try {
      // Get current value and increment
      const { data: current } = await supabase
        .from('legal_case_templates')
        .select('usage_count')
        .eq('id', id)
        .single();
      
      if (current) {
        await supabase
          .from('legal_case_templates')
          .update({ usage_count: (current.usage_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[useLegalDocuments] incrementTemplateUsage error:', err);
    }
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    isLoading,
    templates,
    generatedDocs,
    error,
    fetchTemplates,
    generateDocument,
    createTemplate,
    updateTemplate,
    incrementTemplateUsage,
  };
}

export default useLegalDocuments;
