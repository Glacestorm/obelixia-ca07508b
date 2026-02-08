import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectProfile {
  name: string;
  description: string;
  sector: string;
  municipality: string;
  legalForm: string;
  employeesCount: number;
  annualRevenue?: number;
  yearsOperating?: number;
  totalInvestment: number;
  requestedGrant: number;
  projectType: string;
  activities: string[];
  hasEnvironmentalImpact?: boolean;
  createsJobs?: boolean;
  jobsToCreate?: number;
  isRuralArea?: boolean;
  previousGrants?: number;
}

interface SimulatorRequest {
  action: 'simulate' | 'find_matching' | 'get_improvements';
  project: ProjectProfile;
  context?: {
    galId?: string;
    region?: string;
  };
  eligibilityResult?: unknown;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, project, context, eligibilityResult } = await req.json() as SimulatorRequest;
    console.log(`[galia-convocatoria-simulator] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'simulate':
        systemPrompt = `Eres un experto evaluador de subvenciones LEADER/FEDER en España.

CONTEXTO NORMATIVO:
- Ley 38/2003, General de Subvenciones
- Reglamento UE 1305/2013 (FEADER)
- Marco Nacional de Desarrollo Rural
- Normativa específica de cada GAL

EVALÚA el proyecto según criterios LEADER:
1. Elegibilidad legal (forma jurídica, obligaciones tributarias/SS)
2. Elegibilidad territorial (zona LEADER, municipio rural)
3. Elegibilidad sectorial (sectores subvencionables)
4. Elegibilidad económica (límites de inversión, intensidad ayuda)
5. Criterios de valoración (puntuación previsible)

RESPONDE EN JSON ESTRICTO:
{
  "eligibility": {
    "isEligible": boolean,
    "eligibilityScore": 0-100,
    "passedCriteria": [
      { "id": string, "name": string, "description": string, "category": "legal"|"economic"|"territorial"|"sectoral"|"documentary", "status": "passed", "details": string, "weight": number }
    ],
    "failedCriteria": [...],
    "warningCriteria": [...],
    "summary": string
  },
  "grantEstimate": {
    "estimatedAmount": number,
    "minAmount": number,
    "maxAmount": number,
    "percentageOfInvestment": number,
    "breakdownByCategory": [
      { "category": string, "amount": number, "percentage": number }
    ],
    "confidenceLevel": 0-100,
    "factors": [
      { "factor": string, "impact": "positive"|"negative"|"neutral", "adjustment": number, "explanation": string }
    ]
  },
  "scoring": {
    "predictedScore": number,
    "maxPossibleScore": number,
    "percentile": 0-100,
    "ranking": "alto"|"medio"|"bajo",
    "scoreBreakdown": [
      { "criterion": string, "points": number, "maxPoints": number, "justification": string }
    ],
    "competitivenessAnalysis": string
  },
  "improvements": [
    {
      "id": string,
      "title": string,
      "description": string,
      "category": "eligibility"|"scoring"|"documentation"|"strategy",
      "priority": "high"|"medium"|"low",
      "impact": number,
      "effort": "easy"|"moderate"|"difficult",
      "timeline": string,
      "specificActions": string[]
    }
  ],
  "matchingCalls": [
    {
      "id": string,
      "title": string,
      "organization": string,
      "deadline": string,
      "budget": number,
      "matchScore": 0-100,
      "eligibilityStatus": "eligible"|"partial"|"ineligible",
      "keyRequirements": string[],
      "recommendedActions": string[]
    }
  ]
}`;

        userPrompt = `SIMULA ELEGIBILIDAD Y PUNTUACIÓN para este proyecto:

PERFIL DEL PROYECTO:
- Nombre: ${project.name}
- Descripción: ${project.description}
- Sector: ${project.sector}
- Municipio: ${project.municipality}
- Forma jurídica: ${project.legalForm}
- Empleados: ${project.employeesCount}
- Ingresos anuales: ${project.annualRevenue ? `${project.annualRevenue}€` : 'No indicado'}
- Años operando: ${project.yearsOperating || 'Nuevo'}
- Inversión total: ${project.totalInvestment}€
- Ayuda solicitada: ${project.requestedGrant}€
- Tipo de proyecto: ${project.projectType}
- Actividades: ${project.activities.join(', ')}
- Impacto ambiental: ${project.hasEnvironmentalImpact ? 'Sí' : 'No'}
- Crea empleo: ${project.createsJobs ? `Sí, ${project.jobsToCreate} empleos` : 'No'}
- Zona rural: ${project.isRuralArea ? 'Sí' : 'No determinado'}
- Subvenciones previas: ${project.previousGrants || 0}€

REGIÓN: ${context?.region || 'Asturias'}

Proporciona una evaluación detallada con criterios reales LEADER, estimación de ayuda ajustada y sugerencias de mejora específicas.`;
        break;

      case 'find_matching':
        systemPrompt = `Eres un buscador de convocatorias de subvenciones en España.

Conoces las convocatorias LEADER activas y otras líneas de ayuda compatibles:
- LEADER/FEADER en GALs de diferentes CCAA
- Líneas de emprendimiento rural
- Ayudas a la digitalización
- Programas de sostenibilidad
- Subvenciones sectoriales

RESPONDE EN JSON ESTRICTO:
{
  "matchingCalls": [
    {
      "id": string,
      "title": string,
      "organization": string,
      "deadline": "YYYY-MM-DD",
      "budget": number,
      "matchScore": 0-100,
      "eligibilityStatus": "eligible"|"partial"|"ineligible",
      "keyRequirements": string[],
      "recommendedActions": string[]
    }
  ]
}`;

        userPrompt = `BUSCA CONVOCATORIAS compatibles con este proyecto:

- Sector: ${project.sector}
- Tipo: ${project.projectType}
- Municipio: ${project.municipality}
- Inversión: ${project.totalInvestment}€
- Forma jurídica: ${project.legalForm}
- Región: ${context?.region || 'Asturias'}

Incluye convocatorias LEADER activas y otras líneas complementarias.`;
        break;

      case 'get_improvements':
        systemPrompt = `Eres un consultor experto en optimización de solicitudes de subvenciones LEADER.

Tu objetivo es proporcionar sugerencias CONCRETAS y ACCIONABLES para mejorar la elegibilidad y puntuación de proyectos.

RESPONDE EN JSON ESTRICTO:
{
  "improvements": [
    {
      "id": string,
      "title": string,
      "description": string,
      "category": "eligibility"|"scoring"|"documentation"|"strategy",
      "priority": "high"|"medium"|"low",
      "impact": number,
      "effort": "easy"|"moderate"|"difficult",
      "timeline": string,
      "specificActions": string[]
    }
  ]
}`;

        userPrompt = `GENERA SUGERENCIAS DE MEJORA para este proyecto:

${JSON.stringify(project, null, 2)}

${eligibilityResult ? `\nRESULTADO DE ELEGIBILIDAD PREVIO:\n${JSON.stringify(eligibilityResult, null, 2)}` : ''}

Proporciona sugerencias específicas, priorizadas y con acciones concretas.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[galia-convocatoria-simulator] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-convocatoria-simulator] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-convocatoria-simulator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
