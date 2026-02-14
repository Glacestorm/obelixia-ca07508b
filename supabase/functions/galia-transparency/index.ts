import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, validatePayloadSize } from "../_shared/owasp-security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransparencyRequest {
  action: 'get_public_data' | 'explain_decision' | 'get_audit_trail' | 'generate_public_report';
  expediente_id?: string;
  decision_id?: string;
  filters?: {
    year?: number;
    status?: string;
    gal_id?: string;
  };
}

const VALID_ACTIONS = ['get_public_data', 'explain_decision', 'get_audit_trail', 'generate_public_report'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit({
      identifier: `${clientIp}:galia-transparency`,
      maxRequests: 30,
      windowMs: 60 * 1000
    });
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body = await req.json();
    const payloadCheck = validatePayloadSize(body);
    if (!payloadCheck.valid) {
      return new Response(JSON.stringify({ error: payloadCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, expediente_id, decision_id, filters } = body as TransparencyRequest;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[galia-transparency] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'get_public_data':
        systemPrompt = `Eres un sistema de transparencia pública para subvenciones LEADER.
        
OBJETIVO:
- Generar datos públicos anonimizados de convocatorias y proyectos
- Cumplir con la Ley 19/2013 de transparencia
- Proteger datos personales (RGPD)

FORMATO DE RESPUESTA (JSON):
{
  "publicData": {
    "convocatorias": [...],
    "estadisticas": {
      "totalProyectos": number,
      "importeConcedido": number,
      "empleoGenerado": number,
      "distribucionSectorial": {...}
    },
    "indicadores": {
      "tiempoMedioResolucion": number,
      "tasaAprobacion": number,
      "inversionPrivadaMovilizada": number
    }
  },
  "lastUpdated": "ISO date",
  "disclaimer": "Texto legal"
}`;

        userPrompt = `Genera datos públicos de transparencia${filters ? ` con filtros: ${JSON.stringify(filters)}` : ''}.
        
Incluye:
- Estadísticas agregadas de convocatorias
- Indicadores de impacto territorial
- Distribución sectorial de ayudas
- Evolución temporal
- Todo anonimizado y agregado`;
        break;

      case 'explain_decision':
        systemPrompt = `Eres un sistema de explicabilidad de decisiones IA para subvenciones.
        
OBJETIVO:
- Explicar de forma clara y comprensible las decisiones tomadas
- Cumplir con el derecho a explicación (Art. 22 RGPD)
- Proporcionar transparencia algorítmica

PRINCIPIOS:
- Lenguaje accesible para ciudadanos
- Identificar factores determinantes
- Mostrar alternativas consideradas
- Indicar limitaciones del análisis

FORMATO DE RESPUESTA (JSON):
{
  "decision": {
    "tipo": "string",
    "resultado": "string",
    "fecha": "ISO date"
  },
  "explicacion": {
    "resumenEjecutivo": "string (2-3 frases)",
    "factoresDeterminantes": [
      {
        "factor": "string",
        "peso": number,
        "impacto": "positivo|negativo|neutro",
        "explicacion": "string"
      }
    ],
    "criteriosAplicados": [...],
    "alternativasConsideradas": [...],
    "limitaciones": [...]
  },
  "trazabilidad": {
    "modeloIA": "string",
    "versionAlgoritmo": "string",
    "datosUtilizados": [...],
    "fechaAnalisis": "ISO date"
  },
  "derechosUsuario": {
    "recurso": "string",
    "plazo": "string",
    "contacto": "string"
  }
}`;

        userPrompt = `Explica la decisión del expediente ${expediente_id || decision_id}.
        
Proporciona:
- Resumen ejecutivo comprensible
- Factores que influyeron en la decisión
- Peso relativo de cada criterio
- Alternativas que se consideraron
- Información sobre derechos de recurso`;
        break;

      case 'get_audit_trail':
        systemPrompt = `Eres un sistema de auditoría y trazabilidad para expedientes de subvención.
        
OBJETIVO:
- Proporcionar trazabilidad completa de acciones
- Cumplir con requisitos de auditoría FEDER
- Garantizar integridad del registro

FORMATO DE RESPUESTA (JSON):
{
  "expedienteId": "string",
  "trailCompleto": [
    {
      "id": "string",
      "timestamp": "ISO date",
      "accion": "string",
      "actor": {
        "tipo": "usuario|sistema|ia",
        "id": "string (anonimizado)",
        "rol": "string"
      },
      "detalles": {
        "descripcion": "string",
        "datosAntes": {...},
        "datosDespues": {...},
        "justificacion": "string"
      },
      "verificacion": {
        "hash": "string",
        "integridad": "verificado|pendiente"
      }
    }
  ],
  "resumen": {
    "totalAcciones": number,
    "accionesPorTipo": {...},
    "tiempoTotal": "string",
    "participantes": number
  },
  "certificacion": {
    "fechaGeneracion": "ISO date",
    "validezHasta": "ISO date",
    "codigoVerificacion": "string"
  }
}`;

        userPrompt = `Genera el trail de auditoría completo para el expediente ${expediente_id}.
        
Incluye:
- Todas las acciones realizadas
- Actores involucrados (anonimizados)
- Cambios de estado y datos
- Verificación de integridad
- Certificación para auditoría`;
        break;

      case 'generate_public_report':
        systemPrompt = `Eres un generador de informes públicos de transparencia.
        
OBJETIVO:
- Crear informes publicables en portal de transparencia
- Cumplir con obligaciones de publicidad activa
- Formato accesible y comprensible

FORMATO DE RESPUESTA (JSON):
{
  "informe": {
    "titulo": "string",
    "periodo": "string",
    "fechaPublicacion": "ISO date"
  },
  "contenido": {
    "resumenEjecutivo": "string",
    "datosAgregados": {
      "solicitudesRecibidas": number,
      "solicitudesAprobadas": number,
      "importeTotal": number,
      "empleoComprometido": number
    },
    "desgloseSectorial": [...],
    "desgloseGeografico": [...],
    "indicadoresImpacto": [...],
    "comparativaHistorica": [...]
  },
  "graficos": [
    {
      "tipo": "bar|pie|line",
      "titulo": "string",
      "datos": [...]
    }
  ],
  "metodologia": "string",
  "contacto": {
    "email": "string",
    "telefono": "string",
    "direccion": "string"
  }
}`;

        userPrompt = `Genera un informe público de transparencia${filters?.year ? ` para el año ${filters.year}` : ''}.
        
Incluye:
- Resumen ejecutivo
- Estadísticas de convocatorias
- Impacto territorial y sectorial
- Comparativa con años anteriores
- Metodología utilizada`;
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
        temperature: 0.3,
        max_tokens: 3000,
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          message: 'Créditos de IA insuficientes.'
        }), {
          status: 402,
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
      console.error('[galia-transparency] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-transparency] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-transparency] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
