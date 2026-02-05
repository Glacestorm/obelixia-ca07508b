/**
 * Email Templates Hook - Phase 1
 * Manages email templates for campaigns and sequences
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface TemplateVariable {
  name: string;
  default: string;
  description?: string;
}

export interface EmailTemplate {
  id: string;
  company_id: string | null;
  name: string;
  subject: string | null;
  preview_text: string | null;
  html_content: string | null;
  plain_content: string | null;
  design_json: Record<string, unknown> | null;
  variables: TemplateVariable[];
  category: 'newsletter' | 'promotional' | 'transactional' | 'nurturing' | 'notification' | null;
  thumbnail_url: string | null;
  is_active: boolean;
  stats: TemplateStats;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateStats {
  sent?: number;
  opened?: number;
  clicked?: number;
  open_rate?: number;
  click_rate?: number;
}

// === DEFAULT VARIABLES ===
export const DEFAULT_VARIABLES: TemplateVariable[] = [
  { name: 'first_name', default: 'Cliente', description: 'Nombre del contacto' },
  { name: 'last_name', default: '', description: 'Apellido del contacto' },
  { name: 'email', default: '', description: 'Email del contacto' },
  { name: 'company', default: '', description: 'Empresa del contacto' },
  { name: 'unsubscribe_url', default: '#', description: 'Link de baja' },
  { name: 'view_in_browser_url', default: '#', description: 'Ver en navegador' },
];

// === HOOK ===
export function useEmailTemplates(companyId?: string) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH TEMPLATES ===
  const fetchTemplates = useCallback(async (category?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('crm_email_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => ({
        ...row,
        variables: (row.variables || []) as unknown as TemplateVariable[],
        design_json: (row.design_json || null) as Record<string, unknown> | null,
        stats: (row.stats || {}) as TemplateStats,
        category: row.category as EmailTemplate['category'],
      })) as EmailTemplate[];

      setTemplates(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching templates';
      setError(message);
      console.error('[useEmailTemplates] fetchTemplates error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === CREATE TEMPLATE ===
  const createTemplate = useCallback(async (
    template: Partial<EmailTemplate>
  ): Promise<EmailTemplate | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('crm_email_templates')
        .insert([{
          name: template.name,
          subject: template.subject,
          preview_text: template.preview_text,
          html_content: template.html_content,
          plain_content: template.plain_content,
          category: template.category,
          company_id: template.company_id || companyId,
          created_by: userData.user?.id,
          is_active: true,
          variables: JSON.parse(JSON.stringify(template.variables || DEFAULT_VARIABLES)),
          design_json: template.design_json ? JSON.parse(JSON.stringify(template.design_json)) : null,
          stats: {},
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const newTemplate = {
        ...data,
        variables: (data.variables || []) as unknown as TemplateVariable[],
        design_json: (data.design_json || null) as Record<string, unknown> | null,
        stats: (data.stats || {}) as TemplateStats,
        category: data.category as EmailTemplate['category'],
      } as EmailTemplate;
      setTemplates(prev => [newTemplate, ...prev]);
      toast.success('Plantilla creada correctamente');
      return newTemplate;
    } catch (err) {
      console.error('[useEmailTemplates] createTemplate error:', err);
      toast.error('Error al crear la plantilla');
      return null;
    }
  }, [companyId]);

  // === UPDATE TEMPLATE ===
  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.variables) updateData.variables = JSON.parse(JSON.stringify(updates.variables));
      if (updates.design_json) updateData.design_json = JSON.parse(JSON.stringify(updates.design_json));
      if (updates.stats) updateData.stats = JSON.parse(JSON.stringify(updates.stats));
      
      const { error: updateError } = await supabase
        .from('crm_email_templates')
        .update(updateData as any)
        .eq('id', id);

      if (updateError) throw updateError;

      setTemplates(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
      ));
      toast.success('Plantilla actualizada');
      return true;
    } catch (err) {
      console.error('[useEmailTemplates] updateTemplate error:', err);
      toast.error('Error al actualizar la plantilla');
      return false;
    }
  }, []);

  // === DELETE TEMPLATE ===
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Soft delete
      const { error: updateError } = await supabase
        .from('crm_email_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) throw updateError;

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Plantilla eliminada');
      return true;
    } catch (err) {
      console.error('[useEmailTemplates] deleteTemplate error:', err);
      toast.error('Error al eliminar la plantilla');
      return false;
    }
  }, []);

  // === DUPLICATE TEMPLATE ===
  const duplicateTemplate = useCallback(async (
    id: string
  ): Promise<EmailTemplate | null> => {
    const original = templates.find(t => t.id === id);
    if (!original) return null;

    const { id: _, created_at, updated_at, stats, ...rest } = original;
    
    return createTemplate({
      ...rest,
      name: `${original.name} (copia)`,
    });
  }, [templates, createTemplate]);

  // === PREVIEW TEMPLATE ===
  const previewTemplate = useCallback((
    template: EmailTemplate,
    variables?: Record<string, string>
  ): string => {
    let html = template.html_content || '';
    
    const mergedVars = {
      ...Object.fromEntries(
        (template.variables || []).map(v => [v.name, v.default])
      ),
      ...variables,
    };

    Object.entries(mergedVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      html = html.replace(regex, value);
    });

    return html;
  }, []);

  // === GET STARTER TEMPLATES ===
  const getStarterTemplates = useCallback((): Partial<EmailTemplate>[] => {
    return [
      {
        name: 'Bienvenida Simple',
        category: 'nurturing',
        subject: 'Bienvenido a {{company_name}}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">¡Hola {{first_name}}!</h1>
            <p>Gracias por unirte a nosotros. Estamos encantados de tenerte.</p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>Saludos,<br>El equipo</p>
          </div>
        `,
      },
      {
        name: 'Newsletter Básica',
        category: 'newsletter',
        subject: 'Novedades de {{company_name}} - {{month}}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Novedades del mes</h1>
            <p>Hola {{first_name}},</p>
            <p>Estas son las últimas novedades:</p>
            <ul>
              <li>Novedad 1</li>
              <li>Novedad 2</li>
              <li>Novedad 3</li>
            </ul>
            <p>¡Hasta pronto!</p>
          </div>
        `,
      },
      {
        name: 'Oferta Promocional',
        category: 'promotional',
        subject: '🎉 Oferta especial para ti, {{first_name}}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
            <h1 style="color: #e74c3c;">¡OFERTA ESPECIAL!</h1>
            <p style="font-size: 24px;">{{discount}}% de descuento</p>
            <p>Usa el código: <strong>{{promo_code}}</strong></p>
            <a href="{{cta_url}}" style="display: inline-block; background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">COMPRAR AHORA</a>
          </div>
        `,
        variables: [
          ...DEFAULT_VARIABLES,
          { name: 'discount', default: '20', description: 'Porcentaje de descuento' },
          { name: 'promo_code', default: 'PROMO20', description: 'Código promocional' },
          { name: 'cta_url', default: '#', description: 'URL del botón' },
        ],
      },
      {
        name: 'Recordatorio',
        category: 'transactional',
        subject: 'Recordatorio: {{reminder_subject}}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hola {{first_name}},</h2>
            <p>Te recordamos que {{reminder_message}}</p>
            <p>Si tienes alguna duda, estamos aquí para ayudarte.</p>
          </div>
        `,
        variables: [
          ...DEFAULT_VARIABLES,
          { name: 'reminder_subject', default: 'tu cita', description: 'Asunto del recordatorio' },
          { name: 'reminder_message', default: 'tienes una cita pendiente', description: 'Mensaje del recordatorio' },
        ],
      },
    ];
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    defaultVariables: DEFAULT_VARIABLES,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate,
    getStarterTemplates,
  };
}

export default useEmailTemplates;
