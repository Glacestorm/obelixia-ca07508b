/**
 * GALIA - Document OCR IA
 * Edge Function para extracción y clasificación de documentos LEADER
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OCRRequest {
  action: 'analyze' | 'classify' | 'extract_entities';
  documentText?: string;
  documentType?: string;
  fileName?: string;
}

interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  position?: { start: number; end: number };
}

interface ClassificationResult {
  category: string;
  subcategory: string;
  confidence: number;
  requires_review: boolean;
  compliance_notes: string[];
}

// Document type patterns for classification
const DOCUMENT_PATTERNS = {
  solicitud: ['solicitud', 'instancia', 'formulario', 'anexo i'],
  presupuesto: ['presupuesto', 'oferta', 'factura proforma', 'cotización'],
  licencia: ['licencia', 'permiso', 'autorización', 'declaración responsable'],
  justificacion: ['justificación', 'cuenta justificativa', 'memoria económica'],
  factura: ['factura', 'recibo', 'ticket', 'albarán'],
  contrato: ['contrato', 'convenio', 'acuerdo', 'escritura'],
  certificado: ['certificado', 'certificación', 'informe técnico'],
  dni_nif: ['dni', 'nif', 'cif', 'nie', 'documento identidad'],
  otros: []
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, documentText, documentType, fileName } = await req.json() as OCRRequest;

    console.log(`[galia-document-ocr] Processing action: ${action}`);

    const systemPrompt = `Eres un experto en análisis documental para expedientes de subvenciones LEADER/FEADER.

TU MISIÓN:
Analizar documentos y extraer información estructurada relevante para la gestión de ayudas públicas.

ENTIDADES A EXTRAER:
- NIF/CIF/NIE: Números de identificación fiscal (formato: 12345678A, A12345678, X1234567A)
- IBAN: Cuentas bancarias (formato: ES00 0000 0000 00 0000000000)
- Importes: Cantidades monetarias (€, EUR)
- Fechas: En cualquier formato español
- Nombres: Razones sociales y nombres de personas físicas
- Direcciones: Domicilios y ubicaciones
- Referencias: Números de expediente, facturas, presupuestos

CLASIFICACIÓN DE DOCUMENTOS:
- solicitud: Formularios de solicitud de ayuda
- presupuesto: Presupuestos, ofertas, facturas proforma
- licencia: Permisos, autorizaciones, licencias
- justificacion: Documentos de justificación económica
- factura: Facturas, recibos, tickets
- contrato: Contratos, convenios
- certificado: Certificados, informes técnicos
- dni_nif: Documentos de identidad
- otros: Otros documentos

VALIDACIONES AUTOMÁTICAS:
- Verificar formato NIF/CIF (letra de control)
- Comprobar coherencia de fechas
- Detectar importes sospechosamente altos/bajos
- Identificar documentos incompletos

FORMATO DE RESPUESTA (JSON estricto):
{
  "classification": {
    "category": "tipo_documento",
    "subcategory": "subtipo",
    "confidence": 0.0-1.0,
    "requires_review": true|false,
    "compliance_notes": ["nota 1", "nota 2"]
  },
  "entities": [
    {
      "type": "NIF|IBAN|IMPORTE|FECHA|NOMBRE|DIRECCION|REFERENCIA",
      "value": "valor extraído",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Resumen del documento en 2-3 líneas",
  "warnings": ["advertencia 1", "advertencia 2"],
  "suggestions": ["sugerencia 1", "sugerencia 2"]
}`;

    let userPrompt = '';

    switch (action) {
      case 'analyze':
        userPrompt = `Analiza el siguiente documento y extrae toda la información relevante.
${fileName ? `Nombre del archivo: ${fileName}` : ''}
${documentType ? `Tipo indicado: ${documentType}` : ''}

CONTENIDO DEL DOCUMENTO:
${documentText || 'Sin contenido disponible'}

Devuelve ÚNICAMENTE un JSON válido con el análisis completo.`;
        break;

      case 'classify':
        userPrompt = `Clasifica el siguiente documento según las categorías LEADER/FEADER.
${fileName ? `Nombre del archivo: ${fileName}` : ''}

CONTENIDO:
${documentText || 'Sin contenido'}

Devuelve ÚNICAMENTE un JSON con la clasificación.`;
        break;

      case 'extract_entities':
        userPrompt = `Extrae todas las entidades relevantes del siguiente documento:

${documentText || 'Sin contenido'}

Devuelve ÚNICAMENTE un JSON con las entidades extraídas.`;
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Action ${action} not supported`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Call AI
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
        temperature: 0.2, // Lower temperature for more accurate extraction
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          success: false
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let resultado;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[galia-document-ocr] JSON parse error:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error parsing AI response',
        rawContent: content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tiempoRespuesta = Date.now() - startTime;
    console.log(`[galia-document-ocr] Success - Time: ${tiempoRespuesta}ms`);

    return new Response(JSON.stringify({
      success: true,
      ...resultado,
      metadata: {
        tiempoRespuesta,
        tokensUsed: aiData.usage?.total_tokens || 0,
        model: 'gemini-2.5-flash'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-document-ocr] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
