/**
 * galia-geo-intelligence - Edge Function para Geointeligencia Territorial
 * Análisis de impacto, detección de despoblación y optimización de inversión
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoRequest {
  action: 'get_municipal_data' | 'analyze_impact' | 'detect_depopulation' | 'optimize_investment' | 'get_municipality_details';
  context?: {
    region?: string;
    convocatoriaId?: string;
    dateRange?: { start: string; end: string };
    focusMunicipalities?: string[];
    analysisType?: string;
  };
  params?: Record<string, unknown>;
}

// Datos de municipios de Asturias (simulados para demo)
const ASTURIAS_MUNICIPALITIES = [
  { id: 'oviedo', name: 'Oviedo', province: 'Asturias', population: 220020, lat: 43.3614, lng: -5.8493, trend: 'stable' },
  { id: 'gijon', name: 'Gijón', province: 'Asturias', population: 271843, lat: 43.5453, lng: -5.6619, trend: 'stable' },
  { id: 'aviles', name: 'Avilés', province: 'Asturias', population: 78182, lat: 43.5547, lng: -5.9248, trend: 'declining' },
  { id: 'siero', name: 'Siero', province: 'Asturias', population: 52347, lat: 43.3892, lng: -5.6611, trend: 'growing' },
  { id: 'langreo', name: 'Langreo', province: 'Asturias', population: 39424, lat: 43.3011, lng: -5.6928, trend: 'declining' },
  { id: 'mieres', name: 'Mieres', province: 'Asturias', population: 37580, lat: 43.2506, lng: -5.7667, trend: 'declining' },
  { id: 'castrillon', name: 'Castrillón', province: 'Asturias', population: 22485, lat: 43.5561, lng: -5.9669, trend: 'stable' },
  { id: 'san-martin-rey-aurelio', name: 'San Martín del Rey Aurelio', province: 'Asturias', population: 15238, lat: 43.2917, lng: -5.6250, trend: 'declining' },
  { id: 'aller', name: 'Aller', province: 'Asturias', population: 9821, lat: 43.1333, lng: -5.5667, trend: 'declining' },
  { id: 'tineo', name: 'Tineo', province: 'Asturias', population: 9156, lat: 43.3319, lng: -6.4192, trend: 'declining' },
  { id: 'cangas-narcea', name: 'Cangas del Narcea', province: 'Asturias', population: 12189, lat: 43.1778, lng: -6.5494, trend: 'declining' },
  { id: 'llanes', name: 'Llanes', province: 'Asturias', population: 13445, lat: 43.4219, lng: -4.7553, trend: 'stable' },
  { id: 'villaviciosa', name: 'Villaviciosa', province: 'Asturias', population: 14177, lat: 43.4833, lng: -5.4333, trend: 'declining' },
  { id: 'navia', name: 'Navia', province: 'Asturias', population: 8523, lat: 43.5486, lng: -6.7258, trend: 'declining' },
  { id: 'vegadeo', name: 'Vegadeo', province: 'Asturias', population: 3821, lat: 43.4653, lng: -7.0489, trend: 'declining' },
  { id: 'taramundi', name: 'Taramundi', province: 'Asturias', population: 632, lat: 43.3583, lng: -7.1042, trend: 'declining' },
  { id: 'ibias', name: 'Ibias', province: 'Asturias', population: 1245, lat: 43.0167, lng: -6.8500, trend: 'declining' },
  { id: 'degana', name: 'Degaña', province: 'Asturias', population: 892, lat: 42.9500, lng: -6.5500, trend: 'declining' },
  { id: 'ponga', name: 'Ponga', province: 'Asturias', population: 598, lat: 43.1833, lng: -5.1667, trend: 'declining' },
  { id: 'amieva', name: 'Amieva', province: 'Asturias', population: 678, lat: 43.2167, lng: -5.0833, trend: 'declining' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, context, params } = await req.json() as GeoRequest;
    const region = context?.region || 'asturias';

    console.log(`[galia-geo-intelligence] Action: ${action}, Region: ${region}`);

    let result: unknown;

    switch (action) {
      case 'get_municipal_data':
        result = await getMunicipalData(region, LOVABLE_API_KEY);
        break;

      case 'analyze_impact':
        result = await analyzeImpact(context || {}, LOVABLE_API_KEY);
        break;

      case 'detect_depopulation':
        result = await detectDepopulation(region, LOVABLE_API_KEY);
        break;

      case 'optimize_investment':
        result = await optimizeInvestment(params || {}, region, LOVABLE_API_KEY);
        break;

      case 'get_municipality_details':
        result = await getMunicipalityDetails(params?.municipalityId as string, LOVABLE_API_KEY);
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[galia-geo-intelligence] Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// === GET MUNICIPAL DATA ===
async function getMunicipalData(region: string, apiKey: string) {
  const systemPrompt = `Eres un analista territorial experto en desarrollo rural y fondos LEADER.
Genera datos realistas de municipios para análisis de geointeligencia.

CONTEXTO: Región ${region.toUpperCase()} - Análisis de situación municipal

FORMATO DE RESPUESTA (JSON estricto):
{
  "municipalities": [
    {
      "id": "string",
      "name": "string",
      "province": "string",
      "population": number,
      "populationTrend": "declining" | "stable" | "growing",
      "depopulationRisk": "critical" | "high" | "medium" | "low",
      "grantCount": number,
      "totalInvestment": number,
      "avgGrantAmount": number,
      "employmentGenerated": number,
      "coordinates": { "lat": number, "lng": number }
    }
  ],
  "summary": {
    "totalMunicipalities": number,
    "totalPopulation": number,
    "criticalZones": number,
    "totalInvestment": number
  }
}`;

  const municipalities = ASTURIAS_MUNICIPALITIES.map(m => ({
    id: m.id,
    name: m.name,
    province: m.province,
    population: m.population,
    populationTrend: m.trend,
    depopulationRisk: m.population < 1000 ? 'critical' : 
                      m.population < 5000 ? 'high' : 
                      m.population < 15000 ? 'medium' : 'low',
    grantCount: Math.floor(Math.random() * 20) + 1,
    totalInvestment: Math.floor(Math.random() * 2000000) + 100000,
    avgGrantAmount: Math.floor(Math.random() * 50000) + 10000,
    employmentGenerated: Math.floor(Math.random() * 50) + 5,
    coordinates: { lat: m.lat, lng: m.lng }
  }));

  const criticalZones = municipalities.filter(m => m.depopulationRisk === 'critical').length;

  return {
    municipalities,
    summary: {
      totalMunicipalities: municipalities.length,
      totalPopulation: municipalities.reduce((sum, m) => sum + m.population, 0),
      criticalZones,
      totalInvestment: municipalities.reduce((sum, m) => sum + m.totalInvestment, 0)
    }
  };
}

// === ANALYZE IMPACT ===
async function analyzeImpact(context: GeoRequest['context'], apiKey: string) {
  const systemPrompt = `Eres un experto en evaluación de impacto territorial de fondos europeos LEADER.
Analiza el impacto económico, social y ambiental de las inversiones en cada municipio.

CRITERIOS DE EVALUACIÓN:
- Impacto Económico: empleo directo/indirecto, multiplicador, ingresos fiscales
- Impacto Social: retención poblacional, acceso a servicios, calidad de vida
- Impacto Ambiental: sostenibilidad, reducción CO2, biodiversidad

FORMATO DE RESPUESTA (JSON estricto):
{
  "impacts": [
    {
      "municipalityId": "string",
      "municipalityName": "string",
      "impactScore": 0-100,
      "economicImpact": {
        "directJobs": number,
        "indirectJobs": number,
        "investmentMultiplier": number,
        "taxRevenue": number
      },
      "socialImpact": {
        "populationRetention": 0-100,
        "serviceAccessibility": 0-100,
        "qualityOfLife": 0-100
      },
      "environmentalImpact": {
        "sustainabilityScore": 0-100,
        "carbonReduction": number,
        "biodiversityProtection": 0-100
      },
      "recommendations": ["string"]
    }
  ]
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
        { role: 'user', content: `Analiza el impacto territorial para los siguientes municipios de Asturias: ${ASTURIAS_MUNICIPALITIES.slice(0, 10).map(m => m.name).join(', ')}. Contexto: ${JSON.stringify(context)}` }
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

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('[galia-geo-intelligence] JSON parse error:', parseError);
  }

  // Fallback con datos generados
  return {
    impacts: ASTURIAS_MUNICIPALITIES.slice(0, 10).map(m => ({
      municipalityId: m.id,
      municipalityName: m.name,
      impactScore: Math.floor(Math.random() * 40) + 60,
      economicImpact: {
        directJobs: Math.floor(Math.random() * 30) + 5,
        indirectJobs: Math.floor(Math.random() * 50) + 10,
        investmentMultiplier: 1.5 + Math.random() * 1.5,
        taxRevenue: Math.floor(Math.random() * 100000) + 20000
      },
      socialImpact: {
        populationRetention: Math.floor(Math.random() * 30) + 70,
        serviceAccessibility: Math.floor(Math.random() * 40) + 60,
        qualityOfLife: Math.floor(Math.random() * 30) + 70
      },
      environmentalImpact: {
        sustainabilityScore: Math.floor(Math.random() * 30) + 70,
        carbonReduction: Math.floor(Math.random() * 500) + 100,
        biodiversityProtection: Math.floor(Math.random() * 40) + 60
      },
      recommendations: [
        'Potenciar proyectos de turismo sostenible',
        'Incentivar empresas de economía circular',
        'Mejorar conectividad digital'
      ]
    }))
  };
}

// === DETECT DEPOPULATION ===
async function detectDepopulation(region: string, apiKey: string) {
  const systemPrompt = `Eres un experto en demografía rural y reto demográfico español.
Identifica y analiza zonas en riesgo de despoblación.

CRITERIOS DE RIESGO:
- Crítico: <1000 habitantes, densidad <8 hab/km², pérdida >20% en 10 años
- Alto: <5000 habitantes, densidad <15 hab/km², pérdida >10% en 10 años
- Medio: <15000 habitantes, tendencia decreciente sostenida

FORMATO DE RESPUESTA (JSON estricto):
{
  "zones": [
    {
      "id": "string",
      "name": "string",
      "municipalities": ["string"],
      "totalPopulation": number,
      "populationDensity": number,
      "riskLevel": "critical" | "high" | "medium",
      "priorityScore": 0-100,
      "suggestedInterventions": [
        {
          "type": "string",
          "description": "string",
          "estimatedImpact": 0-100,
          "budget": number
        }
      ],
      "grantOpportunities": [
        {
          "convocatoriaId": "string",
          "title": "string",
          "maxAmount": number,
          "relevanceScore": 0-100
        }
      ]
    }
  ]
}`;

  const criticalMunicipalities = ASTURIAS_MUNICIPALITIES.filter(m => m.population < 5000);
  
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
        { role: 'user', content: `Identifica zonas despobladas en Asturias. Municipios críticos: ${criticalMunicipalities.map(m => `${m.name} (${m.population} hab)`).join(', ')}` }
      ],
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('[galia-geo-intelligence] JSON parse error:', parseError);
  }

  // Fallback
  return {
    zones: [
      {
        id: 'zona-suroccidental',
        name: 'Zona Suroccidental Asturiana',
        municipalities: ['Ibias', 'Degaña', 'Cangas del Narcea'],
        totalPopulation: 14326,
        populationDensity: 6.2,
        riskLevel: 'critical',
        priorityScore: 95,
        suggestedInterventions: [
          { type: 'turismo_rural', description: 'Desarrollo de rutas de senderismo y turismo de naturaleza', estimatedImpact: 75, budget: 500000 },
          { type: 'conectividad', description: 'Mejora de banda ancha y cobertura móvil', estimatedImpact: 85, budget: 300000 },
          { type: 'teletrabajo', description: 'Hub de coworking rural', estimatedImpact: 60, budget: 150000 }
        ],
        grantOpportunities: [
          { convocatoriaId: 'conv-2024-001', title: 'Ayudas LEADER 2024 - Turismo Sostenible', maxAmount: 200000, relevanceScore: 92 }
        ]
      },
      {
        id: 'zona-oriental',
        name: 'Zona Oriental de Montaña',
        municipalities: ['Ponga', 'Amieva', 'Caso'],
        totalPopulation: 2456,
        populationDensity: 4.8,
        riskLevel: 'critical',
        priorityScore: 98,
        suggestedInterventions: [
          { type: 'agroalimentario', description: 'Apoyo a ganadería extensiva y productos locales', estimatedImpact: 80, budget: 400000 },
          { type: 'vivienda', description: 'Rehabilitación de viviendas para nuevos pobladores', estimatedImpact: 70, budget: 600000 }
        ],
        grantOpportunities: [
          { convocatoriaId: 'conv-2024-002', title: 'Ayudas LEADER 2024 - Sector Primario', maxAmount: 150000, relevanceScore: 88 }
        ]
      }
    ]
  };
}

// === OPTIMIZE INVESTMENT ===
async function optimizeInvestment(params: Record<string, unknown>, region: string, apiKey: string) {
  const budget = params.budget as number || 5000000;
  const priorities = params.priorities as Record<string, number> || {
    employment: 0.3,
    sustainability: 0.25,
    equity: 0.25,
    depopulation: 0.2
  };

  const systemPrompt = `Eres un experto en optimización de inversión pública y fondos europeos LEADER.
Diseña una estrategia óptima de distribución de presupuesto para maximizar el impacto territorial.

PRESUPUESTO TOTAL: ${budget.toLocaleString('es-ES')}€
PRIORIDADES:
- Empleo: ${(priorities.employment * 100).toFixed(0)}%
- Sostenibilidad: ${(priorities.sustainability * 100).toFixed(0)}%
- Equidad territorial: ${(priorities.equity * 100).toFixed(0)}%
- Lucha contra despoblación: ${(priorities.depopulation * 100).toFixed(0)}%

FORMATO DE RESPUESTA (JSON estricto):
{
  "optimization": {
    "scenarioId": "string",
    "scenarioName": "string",
    "totalBudget": number,
    "allocations": [
      {
        "municipalityId": "string",
        "municipalityName": "string",
        "amount": number,
        "projectTypes": ["string"],
        "expectedImpact": 0-100,
        "priorityReason": "string"
      }
    ],
    "expectedOutcomes": {
      "totalJobs": number,
      "populationRetained": number,
      "economicMultiplier": number,
      "sustainabilityScore": 0-100
    },
    "comparisonToBaseline": {
      "jobsImprovement": number,
      "efficiencyGain": number,
      "equityScore": 0-100
    }
  }
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
        { role: 'user', content: `Optimiza la distribución de ${budget.toLocaleString('es-ES')}€ entre los municipios de Asturias. Municipios prioritarios por despoblación: ${ASTURIAS_MUNICIPALITIES.filter(m => m.population < 5000).map(m => m.name).join(', ')}` }
      ],
      temperature: 0.6,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content in AI response');

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('[galia-geo-intelligence] JSON parse error:', parseError);
  }

  // Fallback
  return {
    optimization: {
      scenarioId: 'opt-2024-001',
      scenarioName: 'Escenario Óptimo - Prioridad Despoblación',
      totalBudget: budget,
      allocations: ASTURIAS_MUNICIPALITIES.slice(0, 8).map((m, i) => ({
        municipalityId: m.id,
        municipalityName: m.name,
        amount: Math.floor(budget / 8) * (m.population < 5000 ? 1.5 : 0.8),
        projectTypes: ['turismo_rural', 'agroalimentario', 'digitalizacion'],
        expectedImpact: 70 + Math.floor(Math.random() * 25),
        priorityReason: m.population < 5000 ? 'Zona en riesgo crítico de despoblación' : 'Potencial de desarrollo económico'
      })),
      expectedOutcomes: {
        totalJobs: 245,
        populationRetained: 1200,
        economicMultiplier: 2.3,
        sustainabilityScore: 78
      },
      comparisonToBaseline: {
        jobsImprovement: 35,
        efficiencyGain: 28,
        equityScore: 85
      }
    }
  };
}

// === GET MUNICIPALITY DETAILS ===
async function getMunicipalityDetails(municipalityId: string, apiKey: string) {
  const municipality = ASTURIAS_MUNICIPALITIES.find(m => m.id === municipalityId);
  
  if (!municipality) {
    throw new Error(`Municipio no encontrado: ${municipalityId}`);
  }

  return {
    municipality: {
      ...municipality,
      depopulationRisk: municipality.population < 1000 ? 'critical' : 
                        municipality.population < 5000 ? 'high' : 
                        municipality.population < 15000 ? 'medium' : 'low',
      grantCount: Math.floor(Math.random() * 15) + 3,
      totalInvestment: Math.floor(Math.random() * 1500000) + 200000,
      employmentGenerated: Math.floor(Math.random() * 40) + 10,
      coordinates: { lat: municipality.lat, lng: municipality.lng }
    },
    impact: {
      municipalityId: municipality.id,
      municipalityName: municipality.name,
      impactScore: Math.floor(Math.random() * 30) + 65,
      economicImpact: {
        directJobs: Math.floor(Math.random() * 25) + 5,
        indirectJobs: Math.floor(Math.random() * 40) + 10,
        investmentMultiplier: 1.8 + Math.random(),
        taxRevenue: Math.floor(Math.random() * 80000) + 15000
      },
      socialImpact: {
        populationRetention: Math.floor(Math.random() * 25) + 70,
        serviceAccessibility: Math.floor(Math.random() * 30) + 65,
        qualityOfLife: Math.floor(Math.random() * 25) + 70
      },
      environmentalImpact: {
        sustainabilityScore: Math.floor(Math.random() * 25) + 70,
        carbonReduction: Math.floor(Math.random() * 400) + 100,
        biodiversityProtection: Math.floor(Math.random() * 30) + 65
      }
    },
    grants: [
      { id: 'grant-1', title: 'Mejora de infraestructura turística', amount: 45000, status: 'approved', year: 2023 },
      { id: 'grant-2', title: 'Digitalización PYME local', amount: 25000, status: 'completed', year: 2022 },
      { id: 'grant-3', title: 'Producción agroalimentaria ecológica', amount: 60000, status: 'in_progress', year: 2024 }
    ]
  };
}
