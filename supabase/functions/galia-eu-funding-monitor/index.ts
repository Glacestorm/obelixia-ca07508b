/**
 * GALIA EU Funding Monitor - Edge Function
 * Monitoriza nuevas dotaciones de fondos UE/Estado y genera alertas
 * Fuentes: BOE, PRTR, EUR-Lex, BDNS
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FundingSource {
  id: string;
  name: string;
  url: string;
  type: 'BOE' | 'PRTR' | 'EURLEX' | 'BDNS';
}

interface FundingAlert {
  source: string;
  title: string;
  description: string;
  amount?: number;
  deadline?: string;
  url: string;
  relevance_score: number;
  detected_at: string;
}

const FUNDING_SOURCES: FundingSource[] = [
  { id: 'boe', name: 'BOE - Subvenciones', url: 'https://www.boe.es', type: 'BOE' },
  { id: 'prtr', name: 'Plan de Recuperación', url: 'https://planderecuperacion.gob.es', type: 'PRTR' },
  { id: 'bdns', name: 'Base Nacional Subvenciones', url: 'https://www.infosubvenciones.es', type: 'BDNS' },
  { id: 'eurlex', name: 'EUR-Lex Reglamentos', url: 'https://eur-lex.europa.eu', type: 'EURLEX' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, filters, gal_id } = await req.json();

    console.log(`[galia-eu-funding-monitor] Action: ${action}`);

    switch (action) {
      case 'scan_sources':
        return await scanFundingSources(LOVABLE_API_KEY, filters);
      
      case 'get_alerts':
        return await getRecentAlerts(gal_id);
      
      case 'analyze_opportunity':
        return await analyzeOpportunity(LOVABLE_API_KEY, filters);
      
      case 'subscribe_keywords':
        return await subscribeKeywords(gal_id, filters);
      
      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

  } catch (error) {
    console.error('[galia-eu-funding-monitor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scanFundingSources(apiKey: string, filters: any): Promise<Response> {
  const systemPrompt = `Eres un analista experto en fondos europeos y subvenciones públicas españolas.
Tu objetivo es identificar nuevas oportunidades de financiación relevantes para Grupos de Acción Local (GAL) LEADER.

ÁREAS DE INTERÉS PRINCIPAL:
- Fondos FEDER (Fondo Europeo de Desarrollo Regional)
- Programa LEADER / Desarrollo Rural
- NextGenerationEU / Plan de Recuperación (PRTR)
- Fondos de cohesión territorial
- Ayudas a zonas despobladas
- Subvenciones para emprendimiento rural
- Digitalización del medio rural
- Transición ecológica y sostenibilidad

FORMATO DE RESPUESTA (JSON):
{
  "alerts": [
    {
      "source": "BOE|PRTR|BDNS|EURLEX",
      "title": "Título de la convocatoria/dotación",
      "description": "Resumen ejecutivo (max 200 palabras)",
      "amount": 0,
      "deadline": "YYYY-MM-DD o null",
      "url": "URL de referencia",
      "relevance_score": 0-100,
      "keywords": ["keyword1", "keyword2"],
      "territory_scope": "nacional|autonómico|local",
      "beneficiary_types": ["GAL", "ayuntamientos", "empresas", "asociaciones"]
    }
  ],
  "summary": "Resumen general de oportunidades detectadas",
  "next_scan_recommended": "YYYY-MM-DD"
}`;

  const userPrompt = filters?.keywords 
    ? `Busca oportunidades de financiación relacionadas con: ${filters.keywords.join(', ')}. 
       Ámbito territorial: ${filters.territory || 'Asturias'}. 
       Tipos de beneficiario: ${filters.beneficiary_types?.join(', ') || 'todos'}.`
    : `Escanea las fuentes de financiación europeas y nacionales para detectar nuevas oportunidades 
       relevantes para GAL LEADER en zonas rurales de España, especialmente Asturias.
       Genera alertas para convocatorias publicadas recientemente o próximas a publicarse.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = { alerts: [], summary: content, next_scan_recommended: null };
    }
  } catch {
    result = { alerts: [], summary: content, parseError: true };
  }

  // Add detected_at timestamp
  if (result.alerts) {
    result.alerts = result.alerts.map((alert: FundingAlert) => ({
      ...alert,
      detected_at: new Date().toISOString()
    }));
  }

  console.log(`[galia-eu-funding-monitor] Found ${result.alerts?.length || 0} alerts`);

  return new Response(
    JSON.stringify({ success: true, data: result, sources: FUNDING_SOURCES }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getRecentAlerts(galId: string): Promise<Response> {
  // In production, this would fetch from database
  // For now, return structured sample data
  const sampleAlerts: FundingAlert[] = [
    {
      source: 'BOE',
      title: 'Ayudas LEADER 2024-2027 - Convocatoria Asturias',
      description: 'Nueva convocatoria de ayudas para proyectos de desarrollo rural en el marco del Programa de Desarrollo Rural del Principado de Asturias.',
      amount: 2500000,
      deadline: '2024-06-30',
      url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-XXXXX',
      relevance_score: 95,
      detected_at: new Date().toISOString()
    },
    {
      source: 'PRTR',
      title: 'Componente 4 - Digitalización Rural',
      description: 'Fondos NextGenerationEU para proyectos de conectividad y digitalización en municipios de menos de 5.000 habitantes.',
      amount: 15000000,
      deadline: '2024-09-15',
      url: 'https://planderecuperacion.gob.es/convocatorias',
      relevance_score: 88,
      detected_at: new Date().toISOString()
    }
  ];

  return new Response(
    JSON.stringify({ success: true, data: { alerts: sampleAlerts, gal_id: galId } }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyzeOpportunity(apiKey: string, filters: any): Promise<Response> {
  const { opportunity_url, gal_profile } = filters;

  const systemPrompt = `Eres un consultor especializado en gestión de fondos europeos para Grupos de Acción Local.
Analiza la oportunidad de financiación proporcionada y evalúa su idoneidad para el GAL.

ANÁLISIS REQUERIDO:
1. Resumen ejecutivo de la convocatoria
2. Requisitos de elegibilidad
3. Plazos y fechas clave
4. Presupuesto y porcentajes de ayuda
5. Documentación necesaria
6. Puntuación de ajuste (0-100) con el perfil del GAL
7. Recomendaciones estratégicas
8. Riesgos y consideraciones

FORMATO JSON:
{
  "summary": "...",
  "eligibility": ["requisito1", "requisito2"],
  "timeline": { "start": "...", "end": "...", "key_dates": [] },
  "budget": { "total": 0, "max_per_project": 0, "funding_rate": 0 },
  "required_docs": ["doc1", "doc2"],
  "fit_score": 0,
  "recommendations": ["rec1", "rec2"],
  "risks": ["risk1", "risk2"],
  "action_plan": ["paso1", "paso2"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analiza esta oportunidad: ${opportunity_url}\n\nPerfil del GAL: ${JSON.stringify(gal_profile)}` }
      ],
      temperature: 0.4,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
  } catch {
    result = { raw: content };
  }

  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function subscribeKeywords(galId: string, filters: any): Promise<Response> {
  // In production, save to database for scheduled monitoring
  const { keywords, territory, frequency } = filters;

  console.log(`[galia-eu-funding-monitor] Subscription created for GAL ${galId}:`, {
    keywords,
    territory,
    frequency: frequency || 'daily'
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        subscription_id: `sub_${Date.now()}`,
        gal_id: galId,
        keywords,
        territory,
        frequency: frequency || 'daily',
        created_at: new Date().toISOString(),
        next_scan: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
