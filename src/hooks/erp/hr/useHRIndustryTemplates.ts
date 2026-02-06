/**
 * useHRIndustryTemplates - Hook para gestión de plantillas por industria
 * Fase 9: Industry Cloud Templates - Verticalización por sector CNAE
 * 
 * Sistema de plantillas específicas por sector para:
 * - Contratos laborales adaptados
 * - Procesos de onboarding sectoriales
 * - Compliance específico por industria
 * - Configuraciones de nómina por convenio
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TIPOS ============

export type IndustryCategory = 
  | 'technology'
  | 'healthcare'
  | 'hospitality'
  | 'construction'
  | 'retail'
  | 'manufacturing'
  | 'finance'
  | 'education'
  | 'logistics'
  | 'agriculture'
  | 'energy'
  | 'professional_services'
  | 'real_estate'
  | 'media'
  | 'other';

export type TemplateType = 
  | 'contract'
  | 'onboarding'
  | 'offboarding'
  | 'policy'
  | 'compliance'
  | 'payroll_config'
  | 'benefits'
  | 'safety'
  | 'training';

export type TemplateStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export interface IndustryTemplate {
  id: string;
  company_id: string;
  industry_category: IndustryCategory;
  cnae_codes: string[];
  template_type: TemplateType;
  template_name: string;
  template_description?: string;
  template_content: Record<string, unknown>;
  variables: TemplateVariable[];
  compliance_requirements: ComplianceRequirement[];
  applicable_jurisdictions: string[];
  collective_agreements?: string[];
  version: string;
  status: TemplateStatus;
  is_default: boolean;
  usage_count: number;
  last_used_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'employee_field';
  required: boolean;
  default_value?: unknown;
  options?: { value: string; label: string }[];
  employee_field_mapping?: string;
  validation_rules?: Record<string, unknown>;
}

export interface ComplianceRequirement {
  requirement_id: string;
  requirement_name: string;
  regulation_reference: string;
  is_mandatory: boolean;
  validation_type: 'document' | 'signature' | 'training' | 'certification' | 'approval';
  deadline_days?: number;
}

export interface IndustryProfile {
  id: string;
  company_id: string;
  primary_industry: IndustryCategory;
  secondary_industries: IndustryCategory[];
  cnae_codes: string[];
  employee_count_range: string;
  jurisdictions: string[];
  collective_agreements: CollectiveAgreement[];
  compliance_level: 'basic' | 'standard' | 'enhanced' | 'enterprise';
  auto_apply_templates: boolean;
  custom_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CollectiveAgreement {
  agreement_code: string;
  agreement_name: string;
  jurisdiction: string;
  effective_from: string;
  effective_to?: string;
  salary_tables?: Record<string, unknown>;
}

export interface TemplateApplication {
  id: string;
  template_id: string;
  entity_type: 'employee' | 'contract' | 'onboarding' | 'department';
  entity_id: string;
  applied_at: string;
  applied_by?: string;
  variable_values: Record<string, unknown>;
  generated_content?: Record<string, unknown>;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  notes?: string;
}

export interface IndustryTemplateStats {
  total_templates: number;
  templates_by_type: Record<TemplateType, number>;
  templates_by_industry: Record<IndustryCategory, number>;
  most_used_templates: { template_id: string; template_name: string; usage_count: number }[];
  compliance_coverage: number;
  last_template_update: string;
}

export interface AITemplateRecommendation {
  recommended_templates: {
    template_type: TemplateType;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimated_time_savings: string;
  }[];
  industry_insights: string[];
  compliance_gaps: string[];
  best_practices: string[];
}

// ============ HOOK ============

export function useHRIndustryTemplates() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [industryProfile, setIndustryProfile] = useState<IndustryProfile | null>(null);
  const [applications, setApplications] = useState<TemplateApplication[]>([]);
  const [stats, setStats] = useState<IndustryTemplateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ FETCH TEMPLATES ============
  const fetchTemplates = useCallback(async (
    companyId: string,
    filters?: {
      industry?: IndustryCategory;
      template_type?: TemplateType;
      status?: TemplateStatus;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('erp_hr_industry_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('template_name');

      if (filters?.industry) {
        query = query.eq('industry_category', filters.industry);
      }
      if (filters?.template_type) {
        query = query.eq('template_type', filters.template_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTemplates((data || []) as unknown as IndustryTemplate[]);
      return data as unknown as IndustryTemplate[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar plantillas';
      setError(message);
      console.error('[useHRIndustryTemplates] fetchTemplates error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ============ FETCH INDUSTRY PROFILE ============
  const fetchIndustryProfile = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_industry_profiles')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setIndustryProfile(data as unknown as IndustryProfile);
      return data as unknown as IndustryProfile;
    } catch (err) {
      console.error('[useHRIndustryTemplates] fetchIndustryProfile error:', err);
      return null;
    }
  }, []);

  // ============ CREATE/UPDATE TEMPLATE ============
  const saveTemplate = useCallback(async (
    template: Partial<IndustryTemplate> & { company_id: string }
  ) => {
    try {
      if (template.id) {
        // Update
        const { data, error: updateError } = await supabase
          .from('erp_hr_industry_templates')
          .update({
            ...template,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        setTemplates(prev => prev.map(t => t.id === template.id ? data as unknown as IndustryTemplate : t));
        toast.success('Plantilla actualizada');
        return data as unknown as IndustryTemplate;
      } else {
        // Create
        const { data, error: insertError } = await supabase
          .from('erp_hr_industry_templates')
          .insert([{
            ...template,
            version: '1.0',
            status: 'draft',
            usage_count: 0
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        setTemplates(prev => [...prev, data as unknown as IndustryTemplate]);
        toast.success('Plantilla creada');
        return data as unknown as IndustryTemplate;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar plantilla';
      toast.error(message);
      console.error('[useHRIndustryTemplates] saveTemplate error:', err);
      return null;
    }
  }, []);

  // ============ APPLY TEMPLATE ============
  const applyTemplate = useCallback(async (
    templateId: string,
    entityType: TemplateApplication['entity_type'],
    entityId: string,
    variableValues: Record<string, unknown>
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-industry-templates',
        {
          body: {
            action: 'apply_template',
            template_id: templateId,
            entity_type: entityType,
            entity_id: entityId,
            variable_values: variableValues
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Plantilla aplicada correctamente');
        
        // Increment usage count
        await supabase
          .from('erp_hr_industry_templates')
          .update({ 
            usage_count: supabase.rpc('increment', { row_id: templateId }),
            last_used_at: new Date().toISOString()
          })
          .eq('id', templateId);

        return fnData.application as TemplateApplication;
      }

      throw new Error(fnData?.error || 'Error al aplicar plantilla');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al aplicar plantilla';
      toast.error(message);
      console.error('[useHRIndustryTemplates] applyTemplate error:', err);
      return null;
    }
  }, []);

  // ============ GET AI RECOMMENDATIONS ============
  const getAIRecommendations = useCallback(async (
    companyId: string,
    context: {
      industry: IndustryCategory;
      cnae_codes: string[];
      employee_count: number;
      current_templates: string[];
    }
  ): Promise<AITemplateRecommendation | null> => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-industry-templates',
        {
          body: {
            action: 'get_recommendations',
            company_id: companyId,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        return fnData.recommendations as AITemplateRecommendation;
      }

      return null;
    } catch (err) {
      console.error('[useHRIndustryTemplates] getAIRecommendations error:', err);
      return null;
    }
  }, []);

  // ============ GENERATE TEMPLATE FROM AI ============
  const generateTemplateFromAI = useCallback(async (
    companyId: string,
    params: {
      template_type: TemplateType;
      industry: IndustryCategory;
      cnae_code: string;
      jurisdiction: string;
      collective_agreement?: string;
      specific_requirements?: string;
    }
  ): Promise<Partial<IndustryTemplate> | null> => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-industry-templates',
        {
          body: {
            action: 'generate_template',
            company_id: companyId,
            params
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Plantilla generada por IA');
        return fnData.template as Partial<IndustryTemplate>;
      }

      throw new Error(fnData?.error || 'Error al generar plantilla');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar plantilla';
      toast.error(message);
      console.error('[useHRIndustryTemplates] generateTemplateFromAI error:', err);
      return null;
    }
  }, []);

  // ============ SAVE INDUSTRY PROFILE ============
  const saveIndustryProfile = useCallback(async (
    profile: Partial<IndustryProfile> & { company_id: string }
  ) => {
    try {
      const { data, error: upsertError } = await supabase
        .from('erp_hr_industry_profiles')
        .upsert([{
          ...profile,
          updated_at: new Date().toISOString()
        }], { onConflict: 'company_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setIndustryProfile(data as unknown as IndustryProfile);
      toast.success('Perfil de industria guardado');
      return data as unknown as IndustryProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar perfil';
      toast.error(message);
      console.error('[useHRIndustryTemplates] saveIndustryProfile error:', err);
      return null;
    }
  }, []);

  // ============ FETCH STATS ============
  const fetchStats = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_industry_templates')
        .select('*')
        .eq('company_id', companyId);

      if (fetchError) throw fetchError;

      const templatesList = (data || []) as unknown as IndustryTemplate[];

      // Calculate stats
      const stats: IndustryTemplateStats = {
        total_templates: templatesList.length,
        templates_by_type: templatesList.reduce((acc, t) => {
          acc[t.template_type] = (acc[t.template_type] || 0) + 1;
          return acc;
        }, {} as Record<TemplateType, number>),
        templates_by_industry: templatesList.reduce((acc, t) => {
          acc[t.industry_category] = (acc[t.industry_category] || 0) + 1;
          return acc;
        }, {} as Record<IndustryCategory, number>),
        most_used_templates: templatesList
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5)
          .map(t => ({
            template_id: t.id,
            template_name: t.template_name,
            usage_count: t.usage_count
          })),
        compliance_coverage: templatesList.filter(t => 
          t.compliance_requirements && t.compliance_requirements.length > 0
        ).length / Math.max(templatesList.length, 1) * 100,
        last_template_update: templatesList.length > 0 
          ? templatesList.sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0].updated_at
          : new Date().toISOString()
      };

      setStats(stats);
      return stats;
    } catch (err) {
      console.error('[useHRIndustryTemplates] fetchStats error:', err);
      return null;
    }
  }, []);

  // ============ CLONE TEMPLATE ============
  const cloneTemplate = useCallback(async (
    templateId: string,
    newName: string,
    targetIndustry?: IndustryCategory
  ) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Plantilla no encontrada');

      const { id, created_at, updated_at, usage_count, last_used_at, ...rest } = template;

      const newTemplate = {
        ...rest,
        template_name: newName,
        industry_category: targetIndustry || template.industry_category,
        version: '1.0',
        status: 'draft' as TemplateStatus,
        is_default: false
      };

      return await saveTemplate(newTemplate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al clonar plantilla';
      toast.error(message);
      console.error('[useHRIndustryTemplates] cloneTemplate error:', err);
      return null;
    }
  }, [templates, saveTemplate]);

  // ============ DELETE TEMPLATE ============
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('erp_hr_industry_templates')
        .delete()
        .eq('id', templateId);

      if (deleteError) throw deleteError;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Plantilla eliminada');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar plantilla';
      toast.error(message);
      console.error('[useHRIndustryTemplates] deleteTemplate error:', err);
      return false;
    }
  }, []);

  return {
    // State
    templates,
    industryProfile,
    applications,
    stats,
    loading,
    error,
    // Actions
    fetchTemplates,
    fetchIndustryProfile,
    saveTemplate,
    applyTemplate,
    getAIRecommendations,
    generateTemplateFromAI,
    saveIndustryProfile,
    fetchStats,
    cloneTemplate,
    deleteTemplate
  };
}

export default useHRIndustryTemplates;
