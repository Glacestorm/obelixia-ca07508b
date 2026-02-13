/**
 * GALIA - Document Classification Edge Function
 * Automatic recognition and classification of submitted proofs
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DocClassRequest {
  action: 'classify' | 'extract' | 'validate_checklist' | 'batch_classify';
  documentText?: string;
  documentType?: string;
  documents?: Array<{ id: string; text: string; filename: string }>;
  requiredDocuments?: string[];
  submittedDocuments?: Array<{ tipo: string; nombre: string; fecha?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, documentText, documents, requiredDocuments, submittedDocuments } = await req.json() as DocClassRequest;
    console.log(`[galia-doc-classification] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'classify':
        systemPrompt = `Eres un clasificador experto de documentos para expedientes de subvenciones LEADER.

CATEGORÍAS DE DOCUMENTOS:
- IDENTIFICACION: DNI, NIE, Pasaporte, NIF empresa
- CONSTITUCION: Escrituras, Estatutos, CIF, Acta fundacional
- LICENCIAS: Licencia de actividad, Permiso de obra, Autorización ambiental
- FACTURAS: Factura proveedor, Factura proforma, Presupuesto
- OFERTAS: Oferta comparativa, Presupuesto alternativo
- MEMORIAS: Memoria técnica, Memoria económica, Plan de negocio
- CONTABLES: Balance, Cuenta de PyG, Libro mayor, Certificado bancario
- LABORALES: Contrato trabajo, TC2, Vida laboral
- FISCALES: Declaración IVA, Impuesto sociedades, Certificado AEAT
- PROPIEDAD: Escritura propiedad, Contrato arrendamiento, Nota simple
- SEGUROS: Póliza seguro, Certificado cobertura
- JUSTIFICATIVOS: Justificante pago, Transferencia bancaria, Cheque
- OTROS: Documentos no clasificables

FORMATO DE RESPUESTA (JSON estricto):
{
  "clasificacion": {
    "categoria": "string",
    "subcategoria": "string",
    "confianza": 0-100,
    "descripcion": "string"
  },
  "datosExtraidos": {
    "emisor": "string",
    "receptor": "string",
    "fecha": "string",
    "numero": "string",
    "importe": number | null,
    "nif": "string",
    "otros": {}
  },
  "validacion": {
    "esValido": true | false,
    "problemas": ["string"],
    "caducado": true | false,
    "legible": true | false
  },
  "sugerencias": ["string"]
}`;
        userPrompt = `Clasifica y extrae datos de este documento: ${documentText}`;
        break;

      case 'validate_checklist':
        systemPrompt = `Eres un verificador de completitud documental para expedientes LEADER.

Compara los documentos requeridos con los presentados y genera un checklist detallado.

FORMATO DE RESPUESTA (JSON estricto):
{
  "completitud": 0-100,
  "checklist": [
    {
      "documento": "string",
      "requerido": true | false,
      "presentado": true | false,
      "estado": "ok" | "falta" | "caducado" | "incompleto" | "revision",
      "observacion": "string",
      "prioridad": "critica" | "alta" | "media" | "baja"
    }
  ],
  "documentosFaltantes": ["string"],
  "documentosExcedentes": ["string"],
  "recomendaciones": ["string"],
  "puedeContinuar": true | false
}`;
        userPrompt = `Documentos requeridos: ${JSON.stringify(requiredDocuments)}
Documentos presentados: ${JSON.stringify(submittedDocuments)}

Genera el checklist de verificación.`;
        break;

      case 'batch_classify':
        systemPrompt = `Eres un clasificador de documentos para expedientes LEADER. Clasifica TODOS los documentos del lote.

FORMATO DE RESPUESTA (JSON estricto):
{
  "resultados": [
    {
      "id": "string",
      "filename": "string",
      "categoria": "string",
      "subcategoria": "string",
      "confianza": 0-100,
      "datosRelevantes": { "emisor": "string", "fecha": "string", "importe": number | null }
    }
  ],
  "resumen": {
    "total": number,
    "clasificados": number,
    "confianzaMedia": number,
    "categorias": { "categoria": number }
  }
}`;
        userPrompt = `Clasifica estos documentos: ${JSON.stringify(documents)}`;
        break;

      default:
        throw new Error(`Action not supported: ${action}`);
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
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-doc-classification] Success: ${action}`);
    return new Response(JSON.stringify({ success: true, action, data: result, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-doc-classification] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
