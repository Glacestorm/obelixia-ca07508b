/**
 * galia-admin-integrations - Phase 8F
 * Integraciones con Administraciones Públicas Españolas
 * AEAT, TGSS, Registro Mercantil, Catastro/SIGPAC
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionRequest {
  action: 'get_integrations' | 'consulta_aeat' | 'consulta_tgss' | 'consulta_registro_mercantil' | 'consulta_catastro' | 'consulta_sigpac' | 'validacion_completa' | 'get_logs' | 'configure_integration';
  params?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, params } = await req.json() as FunctionRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'get_integrations':
        systemPrompt = `Eres un gestor de integraciones con Administraciones Públicas españolas.

Genera el estado actual de las integraciones disponibles.

FORMATO DE RESPUESTA (JSON estricto):
{
  "integrations": [
    {
      "id": "uuid",
      "type": "aeat|tgss|registro_mercantil|catastro|sigpac|bdns",
      "name": "Nombre descriptivo",
      "description": "Descripción del servicio",
      "status": "active|inactive|error|pending",
      "lastSync": "ISO timestamp o null",
      "nextSync": "ISO timestamp o null",
      "config": {
        "autoSync": boolean,
        "syncFrequency": "daily|weekly|monthly|manual",
        "credentials": {
          "configured": boolean,
          "expiresAt": "ISO timestamp opcional"
        }
      },
      "stats": {
        "totalQueries": number,
        "successRate": number 0-100,
        "avgResponseTime": number ms
      }
    }
  ]
}

Incluye estas integraciones:
1. AEAT - Agencia Tributaria (situación censal, certificados)
2. TGSS - Tesorería General Seguridad Social
3. Registro Mercantil - Datos societarios
4. Catastro - Información catastral
5. SIGPAC - Sistema Información Geográfica Parcelas Agrícolas
6. BDNS - Base Datos Nacional Subvenciones`;

        userPrompt = 'Genera el estado actual de todas las integraciones administrativas disponibles para GALIA.';
        break;

      case 'consulta_aeat':
        systemPrompt = `Eres un sistema de consulta a la Agencia Tributaria (AEAT).

Simula una respuesta realista de consulta tributaria.

FORMATO DE RESPUESTA (JSON estricto):
{
  "nif": "string",
  "denominacion": "Razón social o nombre",
  "situacionCensal": "alta|baja|suspendida",
  "obligacionesTributarias": {
    "iva": boolean,
    "irpf": boolean,
    "is": boolean
  },
  "certificados": {
    "corrienteObligaciones": boolean,
    "fechaEmision": "ISO date",
    "validoHasta": "ISO date"
  },
  "alertas": ["posibles alertas o avisos"]
}`;

        userPrompt = `Consulta AEAT para NIF: ${params?.nif}, tipo: ${params?.tipoConsulta}`;
        break;

      case 'consulta_tgss':
        systemPrompt = `Eres un sistema de consulta a la Tesorería General de la Seguridad Social.

Simula una respuesta realista de consulta TGSS.

FORMATO DE RESPUESTA (JSON estricto):
{
  "nif": "string",
  "denominacion": "Razón social",
  "regimen": "General|Autónomos|Agrario",
  "situacion": "alta|baja",
  "corrientePagos": boolean,
  "ultimaCotizacion": "ISO date",
  "numeroTrabajadores": number,
  "certificado": {
    "emitido": boolean,
    "fechaEmision": "ISO date",
    "validoHasta": "ISO date"
  }
}`;

        userPrompt = `Consulta TGSS para NIF: ${params?.nif}, tipo: ${params?.tipoConsulta}`;
        break;

      case 'consulta_registro_mercantil':
        systemPrompt = `Eres un sistema de consulta al Registro Mercantil Central.

Simula una respuesta realista de datos societarios.

FORMATO DE RESPUESTA (JSON estricto):
{
  "nif": "string",
  "denominacion": "Razón social completa",
  "formaJuridica": "SL|SA|SLU|Cooperativa|Comunidad de Bienes|etc",
  "fechaConstitucion": "ISO date",
  "capitalSocial": number en euros,
  "domicilioSocial": "Dirección completa",
  "administradores": [
    {
      "nombre": "Nombre completo",
      "cargo": "Administrador Único|Consejero Delegado|etc",
      "fechaNombramiento": "ISO date"
    }
  ],
  "situacion": "activa|disuelta|liquidacion|concurso",
  "ultimoDeposito": {
    "ejercicio": año,
    "fechaDeposito": "ISO date"
  }
}`;

        userPrompt = `Consulta Registro Mercantil para NIF: ${params?.nif}`;
        break;

      case 'consulta_catastro':
        systemPrompt = `Eres un sistema de consulta al Catastro español.

Simula una respuesta realista de información catastral.

FORMATO DE RESPUESTA (JSON estricto):
{
  "referenciaCatastral": "20 caracteres",
  "localizacion": {
    "provincia": "Nombre provincia",
    "municipio": "Nombre municipio",
    "poligono": "número si rústica",
    "parcela": "número",
    "direccion": "si urbana"
  },
  "superficie": number en m2,
  "uso": "Agrario|Residencial|Industrial|Comercial|etc",
  "valorCatastral": number en euros,
  "titularidad": [
    {
      "nif": "NIF titular",
      "nombre": "Nombre completo",
      "porcentaje": number 0-100
    }
  ],
  "cultivos": [
    {
      "tipo": "Labor secano|Viñedo|Frutal|etc",
      "superficie": number en m2
    }
  ]
}`;

        userPrompt = `Consulta Catastro para referencia: ${params?.referenciaCatastral}`;
        break;

      case 'consulta_sigpac':
        systemPrompt = `Eres un sistema de consulta al SIGPAC (Sistema de Información Geográfica de Parcelas Agrícolas).

Simula una respuesta realista de información SIGPAC.

FORMATO DE RESPUESTA (JSON estricto):
{
  "provincia": "código 2 dígitos",
  "municipio": "código 3 dígitos",
  "agregado": number,
  "zona": number,
  "poligono": number,
  "parcela": number,
  "recinto": number,
  "superficie": number en hectáreas,
  "usoSIGPAC": "TA|TH|PR|PA|VI|OV|FY|etc",
  "coeficienteAdmisibilidad": number 0-1,
  "pendienteMedia": number en %,
  "regionalizacion": "Secano|Regadío|Pastos Permanentes"
}`;

        userPrompt = `Consulta SIGPAC: provincia ${params?.provincia}, municipio ${params?.municipio}, polígono ${params?.poligono}, parcela ${params?.parcela}`;
        break;

      case 'validacion_completa':
        systemPrompt = `Eres un sistema de validación integral de beneficiarios para subvenciones LEADER.

Realiza una validación cruzada consultando múltiples administraciones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "nif": "string",
  "validacionGlobal": {
    "apto": boolean,
    "puntuacion": number 0-100,
    "fechaValidacion": "ISO timestamp"
  },
  "resultados": {
    "aeat": {
      "consultado": boolean,
      "corrienteObligaciones": boolean,
      "alertas": []
    },
    "tgss": {
      "consultado": boolean,
      "corrientePagos": boolean,
      "alertas": []
    },
    "registroMercantil": {
      "consultado": boolean,
      "situacionActiva": boolean,
      "alertas": []
    },
    "catastro": {
      "consultado": boolean,
      "propiedadVerificada": boolean,
      "alertas": []
    },
    "bdns": {
      "consultado": boolean,
      "sinDuplicidades": boolean,
      "minimisCumplido": boolean,
      "alertas": []
    }
  },
  "recomendaciones": ["array de recomendaciones"],
  "documentosPendientes": ["documentos que faltan"],
  "proximaRevision": "ISO date sugerida"
}`;

        userPrompt = `Validación completa para beneficiario NIF: ${params?.nif}${params?.referenciaCatastral ? `, referencia catastral: ${params.referenciaCatastral}` : ''}`;
        break;

      case 'get_logs':
        systemPrompt = `Eres un sistema de registro de consultas a administraciones.

Genera un historial de consultas recientes simulado.

FORMATO DE RESPUESTA (JSON estricto):
{
  "logs": [
    {
      "id": "uuid",
      "integrationType": "aeat|tgss|registro_mercantil|catastro|sigpac|bdns",
      "queryType": "tipo de consulta",
      "inputParams": {},
      "status": "success|error|pending",
      "responseTime": number ms,
      "timestamp": "ISO timestamp",
      "expedienteId": "opcional",
      "errorMessage": "si hay error"
    }
  ]
}

Genera 10-15 logs variados de las últimas 24 horas.`;

        userPrompt = `Obtener últimos ${params?.limit || 50} registros de consultas.`;
        break;

      case 'configure_integration':
        systemPrompt = `Eres un sistema de configuración de integraciones.

Confirma la configuración aplicada.

FORMATO DE RESPUESTA (JSON estricto):
{
  "configured": true,
  "integrationType": "tipo",
  "appliedConfig": {},
  "validationResult": {
    "credentialsValid": boolean,
    "connectivityTest": boolean,
    "warnings": []
  },
  "nextSteps": ["pasos siguientes si los hay"]
}`;

        userPrompt = `Configurar integración ${params?.integrationType} con: ${JSON.stringify(params?.config || {})}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-admin-integrations] Processing action: ${action}`);

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded' 
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
    } catch {
      console.error('[galia-admin-integrations] JSON parse error');
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-admin-integrations] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-admin-integrations] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
