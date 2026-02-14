import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, validatePayloadSize } from "../_shared/owasp-security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultimodalRequest {
  action: 'analyze_document' | 'transcribe_voice' | 'voice_assistant' | 'extract_structured_data';
  imageBase64?: string;
  audioBase64?: string;
  textPrompt?: string;
  documentType?: 'factura' | 'solicitud' | 'presupuesto' | 'licencia' | 'justificacion' | 'general';
  language?: 'es' | 'ca' | 'eu' | 'gl';
  expedienteId?: string;
}

const VALID_ACTIONS = ['analyze_document', 'transcribe_voice', 'voice_assistant', 'extract_structured_data'];
const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GALIA Multimodal AI - Análisis de Documentos y Voz
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit({
      identifier: `${clientIp}:galia-multimodal-ai`,
      maxRequests: 20,
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

    const { 
      action, 
      imageBase64, 
      audioBase64, 
      textPrompt, 
      documentType = 'general',
      language = 'es',
      expedienteId 
    } = body as MultimodalRequest;

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate base64 payload sizes
    if (imageBase64 && imageBase64.length > MAX_BASE64_SIZE) {
      return new Response(JSON.stringify({ error: 'Image too large (max 5MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (audioBase64 && audioBase64.length > MAX_BASE64_SIZE) {
      return new Response(JSON.stringify({ error: 'Audio too large (max 5MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = '';
    let userPrompt = '';
    let messages: { role: string; content: string | { type: string; image_url?: { url: string }; text?: string }[] }[] = [];

    switch (action) {
      case 'analyze_document':
        systemPrompt = `Eres un sistema OCR avanzado especializado en documentos administrativos españoles para subvenciones LEADER.

TIPOS DE DOCUMENTO QUE RECONOCES:
- Facturas: NIF proveedor, fecha, base imponible, IVA, total, descripción
- Solicitudes: Datos beneficiario, proyecto, importes, fechas
- Presupuestos: Partidas, importes, proveedores, comparativas
- Licencias: Tipo, organismo emisor, vigencia, condiciones
- Justificaciones: Pagos, transferencias, justificantes bancarios

DOCUMENTO ACTUAL: ${documentType}
IDIOMA: ${language === 'es' ? 'Español' : language === 'ca' ? 'Catalán' : language === 'eu' ? 'Euskera' : 'Gallego'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "documentType": "string",
  "confidence": 0-100,
  "extractedData": {
    "fields": [
      {"name": "string", "value": "any", "confidence": 0-100, "location": "string"}
    ],
    "tables": [...],
    "signatures": [...],
    "stamps": [...]
  },
  "validation": {
    "isComplete": boolean,
    "missingFields": [],
    "warnings": [],
    "eligibleForLEADER": boolean
  },
  "summary": "string (resumen en ${language})"
}`;

        if (imageBase64) {
          messages = [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: textPrompt || `Analiza este documento de tipo ${documentType} y extrae todos los datos relevantes para una subvención LEADER.` },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ];
        } else {
          userPrompt = textPrompt || 'Genera un ejemplo de análisis de documento para demostración.';
          messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ];
        }
        break;

      case 'transcribe_voice':
        systemPrompt = `Eres un sistema de transcripción de voz especializado en terminología de subvenciones LEADER.

VOCABULARIO ESPECÍFICO:
- Términos LEADER: GAL, FEDER, PDR, convocatoria, expediente, beneficiario
- Administración: resolución, alegaciones, subsanación, desistimiento
- Contabilidad: justificación, elegibilidad, moderación de costes

IDIOMA DETECTADO: ${language}

FORMATO DE RESPUESTA (JSON estricto):
{
  "transcription": "string",
  "confidence": 0-100,
  "language": "string",
  "duration_seconds": number,
  "words": [
    {"word": "string", "start": number, "end": number, "confidence": 0-100}
  ],
  "entities": [
    {"type": "string", "value": "string", "position": number}
  ],
  "intent": "string (consulta | comando | dictado)"
}`;

        userPrompt = textPrompt || 'El usuario ha grabado un audio para consultar sobre su expediente LEADER.';
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
        break;

      case 'voice_assistant':
        systemPrompt = `Eres el Asistente de Voz GALIA, especializado en ayudar a ciudadanos y técnicos con subvenciones LEADER.

CONTEXTO:
- Expediente activo: ${expedienteId || 'No especificado'}
- Idioma preferido: ${language}

CAPACIDADES:
1. Responder consultas sobre estado de expedientes
2. Explicar requisitos de convocatorias
3. Guiar en la cumplimentación de documentos
4. Informar sobre plazos y fechas importantes

PERSONALIDAD:
- Profesional pero cercano
- Usa lenguaje claro, evita jerga excesiva
- Respuestas concisas para voz (máximo 3 frases)

FORMATO DE RESPUESTA (JSON estricto):
{
  "response": "string (respuesta para sintetizar a voz)",
  "suggestions": ["string (hasta 3 acciones sugeridas)"],
  "requiresHuman": boolean,
  "escalationReason": "string | null",
  "relatedDocuments": ["string (documentos relevantes)"],
  "nextSteps": ["string"]
}`;

        userPrompt = textPrompt || '¿Cuál es el estado de mi expediente?';
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
        break;

      case 'extract_structured_data':
        systemPrompt = `Eres un extractor de datos estructurados para formularios LEADER.

TIPOS DE DATOS A EXTRAER:
- Identificadores: NIF/CIF, número expediente, código proyecto
- Importes: presupuesto, subvención solicitada, justificaciones
- Fechas: solicitud, resolución, plazos
- Entidades: beneficiario, proveedor, GAL

FORMATO DE RESPUESTA (JSON estricto):
{
  "entities": [
    {
      "type": "NIF | CIF | IBAN | IMPORTE | FECHA | EXPEDIENTE | PROYECTO",
      "value": "any",
      "normalized": "any",
      "confidence": 0-100,
      "source": "string (texto original)"
    }
  ],
  "relationships": [
    {
      "from": "string",
      "to": "string",
      "type": "string"
    }
  ],
  "formData": {
    "beneficiario": {...},
    "proyecto": {...},
    "financiacion": {...}
  }
}`;

        userPrompt = textPrompt || 'Extrae datos estructurados del documento proporcionado.';
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-multimodal-ai] Processing action: ${action}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageBase64 ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages,
        temperature: 0.4,
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
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-multimodal-ai] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      multimodal: !!imageBase64 || !!audioBase64,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-multimodal-ai] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
