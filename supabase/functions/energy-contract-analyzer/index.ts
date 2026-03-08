import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Extract text from a PDF stored in Supabase Storage.
 * Downloads the PDF and sends it to the AI model as context.
 * Falls back gracefully if PDF cannot be read.
 */
async function extractPdfContext(contractUrl: string, authHeader: string): Promise<string> {
  try {
    // Download the PDF file
    const response = await fetch(contractUrl, {
      headers: { 'Authorization': authHeader },
    });
    
    if (!response.ok) {
      console.warn('[energy-contract-analyzer] Could not download PDF:', response.status);
      return '';
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfSize = pdfBytes.byteLength;
    
    // If PDF is too large (>5MB), skip extraction
    if (pdfSize > 5 * 1024 * 1024) {
      console.warn('[energy-contract-analyzer] PDF too large for extraction:', pdfSize);
      return '[PDF demasiado grande para extracción automática. El analista debe pegar el texto manualmente.]';
    }

    // Convert PDF bytes to base64 for sending to AI model with vision capability
    const uint8Array = new Uint8Array(pdfBytes);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Pdf = btoa(binary);
    
    return base64Pdf;
  } catch (err) {
    console.error('[energy-contract-analyzer] PDF extraction error:', err);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const authHeader = req.headers.get('authorization') || '';
    const { contractText, contractUrl } = await req.json();
    
    if (!contractText && !contractUrl) {
      throw new Error('Se requiere contractText o contractUrl');
    }

    const systemPrompt = `Eres un analista legal especializado en contratos de suministro eléctrico en España.

ANALIZA el contrato proporcionado y extrae la siguiente información.

IMPORTANTE:
- Esta es una herramienta de APOYO al analista, no una decisión automática final.
- Sé conservador en tus conclusiones.
- Indica claramente cuando no puedas determinar algo con certeza.

RESPONDE EN JSON ESTRICTO:
{
  "resumen": "Resumen ejecutivo del contrato en 3-5 líneas",
  "comercializadora": "Nombre de la comercializadora",
  "tarifa": "Tarifa contratada",
  "permanencia": {
    "detectada": true/false,
    "duracion_meses": number o null,
    "fecha_fin": "fecha o null",
    "penalizacion": "descripción de penalización o null"
  },
  "renovacion_automatica": {
    "detectada": true/false,
    "condiciones": "descripción de condiciones o null",
    "plazo_preaviso_dias": number o null
  },
  "firma_expresa_requerida": {
    "necesaria": true/false,
    "motivo": "explicación"
  },
  "observaciones_riesgo": [
    "Lista de observaciones de riesgo detectadas"
  ],
  "clausulas_relevantes": [
    { "titulo": "título de cláusula", "resumen": "resumen breve", "riesgo": "bajo/medio/alto" }
  ],
  "datos_economicos": {
    "precio_energia_detectado": "si se detecta",
    "precio_potencia_detectado": "si se detecta",
    "otros_costes": "si se detectan"
  },
  "confianza_analisis": 0-100,
  "nota_analista": "Nota adicional para el analista humano"
}`;

    // Build the messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Try to extract PDF content if URL provided
    let pdfBase64 = '';
    if (contractUrl) {
      pdfBase64 = await extractPdfContext(contractUrl, authHeader);
    }

    if (pdfBase64 && pdfBase64.length > 100) {
      // Use multimodal: send PDF as file attachment with the structured data
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analiza este contrato de suministro eléctrico. Los datos estructurados son:\n\n${contractText || '(sin datos estructurados adicionales)'}\n\nEl PDF del contrato está adjunto. Extrae toda la información relevante del documento.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
        ],
      });
    } else {
      // Text-only analysis
      const userPrompt = `Analiza este contrato de suministro eléctrico:\n\n${contractText || '[No se pudo extraer contenido del PDF. Analiza solo los datos estructurados proporcionados.]'}`;
      messages.push({ role: 'user', content: userPrompt });
    }

    console.log('[energy-contract-analyzer] Processing contract analysis, hasPdf:', !!pdfBase64);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
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

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log('[energy-contract-analyzer] Success');

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-contract-analyzer] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
