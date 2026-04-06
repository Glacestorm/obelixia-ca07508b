/**
 * Edge Function: erp-hr-industry-templates
 * Fase 9: Industry Cloud Templates - Verticalización por sector CNAE
 * 
 * Funcionalidades:
 * - Generación de plantillas por sector con IA
 * - Recomendaciones de templates según industria
 * - Aplicación de plantillas a entidades
 * - Validación de compliance sectorial
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface TemplateRequest {
  action: 'generate_template' | 'get_recommendations' | 'apply_template' | 'validate_compliance';
  company_id?: string;
  template_id?: string;
  entity_type?: string;
  entity_id?: string;
  variable_values?: Record<string, unknown>;
  params?: {
    template_type: string;
    industry: string;
    cnae_code: string;
    jurisdiction: string;
    collective_agreement?: string;
    specific_requirements?: string;
  };
  context?: {
    industry: string;
    cnae_codes: string[];
    employee_count: number;
    current_templates: string[];
  };
}

// Mapeo de industrias a CNAE
const INDUSTRY_CNAE_MAP: Record<string, string[]> = {
  technology: ['62', '63', '58', '61'],
  healthcare: ['86', '87', '88'],
  hospitality: ['55', '56'],
  construction: ['41', '42', '43'],
  retail: ['47', '46'],
  manufacturing: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
  finance: ['64', '65', '66'],
  education: ['85'],
  logistics: ['49', '50', '51', '52', '53'],
  agriculture: ['01', '02', '03'],
  energy: ['35', '36', '37', '38', '39'],
  professional_services: ['69', '70', '71', '72', '73', '74', '75'],
  real_estate: ['68'],
  media: ['59', '60', '90', '91', '92', '93']
};

// Requisitos de compliance por industria
const INDUSTRY_COMPLIANCE: Record<string, string[]> = {
  healthcare: [
    'Ley 41/2002 (Autonomía del paciente)',
    'RD 1146/2006 (Protección radiológica)',
    'Acreditación sanitaria obligatoria'
  ],
  construction: [
    'Ley 32/2006 (Subcontratación)',
    'RD 1627/1997 (Seguridad en obras)',
    'Coordinación actividades empresariales'
  ],
  hospitality: [
    'RD 1620/2011 (Empleados hogar)',
    'Normativa APPCC alimentaria',
    'Prevención acoso laboral'
  ],
  finance: [
    'Ley 10/2010 (Prevención blanqueo)',
    'MiFID II formación obligatoria',
    'Certificaciones CNMV'
  ],
  technology: [
    'RGPD/LOPDGDD',
    'Esquema Nacional de Seguridad',
    'Teletrabajo RDL 28/2020'
  ]
};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, template_id, entity_type, entity_id, variable_values, params, context } = await req.json() as TemplateRequest;

    console.log(`[erp-hr-industry-templates] Action: ${action}`);

    switch (action) {
      case 'generate_template': {
        if (!params) throw new Error('Params required for generate_template');

        const industryCompliance = INDUSTRY_COMPLIANCE[params.industry] || [];
        const cnaeCodes = INDUSTRY_CNAE_MAP[params.industry] || [];

        const systemPrompt = `Eres un experto en derecho laboral español y gestión de RRHH especializado en el sector ${params.industry}.
Genera plantillas profesionales adaptadas a la normativa española vigente (2025-2026).

CONTEXTO SECTORIAL:
- Industria: ${params.industry}
- Código CNAE: ${params.cnae_code}
- Jurisdicción: ${params.jurisdiction}
${params.collective_agreement ? `- Convenio colectivo: ${params.collective_agreement}` : ''}

REQUISITOS DE COMPLIANCE SECTORIALES:
${industryCompliance.map(c => `- ${c}`).join('\n')}

INSTRUCCIONES:
1. Genera contenido específico para tipo: ${params.template_type}
2. Incluye todas las cláusulas legales obligatorias
3. Adapta el lenguaje al sector específico
4. Define variables dinámicas para personalización
5. Incluye requisitos de compliance aplicables

${params.specific_requirements ? `REQUISITOS ADICIONALES:\n${params.specific_requirements}` : ''}

FORMATO DE RESPUESTA (JSON estricto):
{
  "template_name": "string",
  "template_description": "string",
  "template_content": {
    "sections": [
      {
        "title": "string",
        "content": "string con {{variables}}",
        "is_mandatory": boolean
      }
    ],
    "footer": "string",
    "legal_references": ["string"]
  },
  "variables": [
    {
      "key": "string",
      "label": "string",
      "type": "text|number|date|select|boolean",
      "required": boolean,
      "default_value": "any",
      "employee_field_mapping": "string opcional"
    }
  ],
  "compliance_requirements": [
    {
      "requirement_id": "string",
      "requirement_name": "string",
      "regulation_reference": "string",
      "is_mandatory": boolean,
      "validation_type": "document|signature|training|certification|approval",
      "deadline_days": number
    }
  ]
}`;

        const userPrompt = `Genera una plantilla de tipo "${params.template_type}" para el sector ${params.industry} (CNAE ${params.cnae_code}) en ${params.jurisdiction}.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        let template;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            template = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.error('[erp-hr-industry-templates] Parse error:', parseError);
          template = { rawContent: content, parseError: true };
        }

        return new Response(JSON.stringify({
          success: true,
          template: {
            ...template,
            industry_category: params.industry,
            cnae_codes: [params.cnae_code, ...cnaeCodes.slice(0, 3)],
            template_type: params.template_type,
            applicable_jurisdictions: [params.jurisdiction],
            collective_agreements: params.collective_agreement ? [params.collective_agreement] : []
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_recommendations': {
        if (!context) throw new Error('Context required for recommendations');

        const industryCompliance = INDUSTRY_COMPLIANCE[context.industry] || [];

        const systemPrompt = `Eres un consultor experto en transformación digital de RRHH para el sector ${context.industry}.
Analiza la situación actual y recomienda plantillas Industry Cloud específicas.

PERFIL DE LA EMPRESA:
- Industria: ${context.industry}
- Códigos CNAE: ${context.cnae_codes.join(', ')}
- Número de empleados: ${context.employee_count}
- Plantillas actuales: ${context.current_templates.length > 0 ? context.current_templates.join(', ') : 'Ninguna'}

COMPLIANCE SECTORIAL REQUERIDO:
${industryCompliance.map(c => `- ${c}`).join('\n')}

TIPOS DE PLANTILLAS DISPONIBLES:
- contract: Contratos laborales adaptados al sector
- onboarding: Procesos de incorporación sectoriales
- offboarding: Procesos de salida con requisitos específicos
- policy: Políticas internas (teletrabajo, gastos, etc.)
- compliance: Documentación de cumplimiento normativo
- payroll_config: Configuraciones de nómina por convenio
- benefits: Programas de beneficios sectoriales
- safety: Prevención de riesgos específica
- training: Formación obligatoria por sector

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommended_templates": [
    {
      "template_type": "string",
      "reason": "string explicando por qué es necesaria",
      "priority": "high|medium|low",
      "estimated_time_savings": "string (ej: 2 horas/empleado)"
    }
  ],
  "industry_insights": ["string con insights del sector"],
  "compliance_gaps": ["string con gaps de compliance detectados"],
  "best_practices": ["string con mejores prácticas recomendadas"]
}`;

        const userPrompt = `Analiza la situación y recomienda las plantillas más importantes para esta empresa del sector ${context.industry}.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        let recommendations;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            recommendations = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch (parseError) {
          console.error('[erp-hr-industry-templates] Parse error:', parseError);
          recommendations = {
            recommended_templates: [],
            industry_insights: ['Error al procesar recomendaciones'],
            compliance_gaps: [],
            best_practices: []
          };
        }

        return new Response(JSON.stringify({
          success: true,
          recommendations
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'apply_template': {
        if (!template_id || !entity_type || !entity_id) {
          throw new Error('template_id, entity_type and entity_id required');
        }

        // Fetch template
        const { data: template, error: templateError } = await supabase
          .from('erp_hr_industry_templates')
          .select('*')
          .eq('id', template_id)
          .single();

        if (templateError || !template) {
          throw new Error('Template not found');
        }

        // Process template with variables
        let processedContent = template.template_content;
        const variables = template.variables || [];

        // Replace variables in content
        if (variable_values && typeof processedContent === 'object') {
          const contentStr = JSON.stringify(processedContent);
          let processed = contentStr;
          
          for (const variable of variables) {
            const value = variable_values[variable.key] ?? variable.default_value ?? '';
            const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
            processed = processed.replace(regex, String(value));
          }
          
          processedContent = JSON.parse(processed);
        }

        // Create application record
        const { data: application, error: appError } = await supabase
          .from('erp_hr_template_applications')
          .insert([{
            template_id,
            entity_type,
            entity_id,
            variable_values: variable_values || {},
            generated_content: processedContent,
            status: 'applied',
            applied_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (appError) {
          console.error('[erp-hr-industry-templates] Application error:', appError);
          throw new Error('Error applying template');
        }

        // Update template usage
        await supabase
          .from('erp_hr_industry_templates')
          .update({ 
            usage_count: (template.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', template_id);

        return new Response(JSON.stringify({
          success: true,
          application,
          generated_content: processedContent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'validate_compliance': {
        if (!template_id) throw new Error('template_id required');

        const { data: template, error: templateError } = await supabase
          .from('erp_hr_industry_templates')
          .select('*')
          .eq('id', template_id)
          .single();

        if (templateError || !template) {
          throw new Error('Template not found');
        }

        const industryCompliance = INDUSTRY_COMPLIANCE[template.industry_category] || [];
        const templateCompliance = template.compliance_requirements || [];

        const coverage = templateCompliance.length > 0 
          ? (templateCompliance.filter((tc: any) => 
              industryCompliance.some(ic => tc.regulation_reference?.includes(ic))
            ).length / industryCompliance.length) * 100
          : 0;

        const missingRequirements = industryCompliance.filter(ic =>
          !templateCompliance.some((tc: any) => tc.regulation_reference?.includes(ic))
        );

        return new Response(JSON.stringify({
          success: true,
          validation: {
            compliance_coverage: Math.round(coverage),
            total_requirements: industryCompliance.length,
            covered_requirements: templateCompliance.length,
            missing_requirements: missingRequirements,
            is_compliant: coverage >= 80,
            recommendations: missingRequirements.length > 0
              ? `Añadir requisitos de compliance para: ${missingRequirements.join(', ')}`
              : 'La plantilla cumple con los requisitos del sector'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Action not supported: ${action}`);
    }

  } catch (error) {
    console.error('[erp-hr-industry-templates] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
