import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratorRequest {
  action: 'list_templates' | 'generate' | 'approve' | 'export_pdf' | 'history';
  documentType?: string;
  context?: Record<string, unknown>;
  documentId?: string;
  galId?: string;
  limit?: number;
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

    const { action, documentType, context, documentId, galId, limit } = await req.json() as GeneratorRequest;
    console.log(`[galia-document-generator] Action: ${action}, Type: ${documentType}`);

    // Plantillas estáticas
    if (action === 'list_templates') {
      return new Response(JSON.stringify({
        success: true,
        templates: [
          { id: 'memoria_anual', type: 'memoria_anual', name: 'Memoria Anual GAL', requiredFields: ['año', 'galId'] },
          { id: 'informe_feder', type: 'informe_feder', name: 'Informe Seguimiento FEDER', requiredFields: ['trimestre', 'año'] },
          { id: 'resolucion_concesion', type: 'resolucion_concesion', name: 'Resolución de Concesión', requiredFields: ['expedienteId', 'importeConcedido'] },
          { id: 'resolucion_denegacion', type: 'resolucion_denegacion', name: 'Resolución de Denegación', requiredFields: ['expedienteId', 'motivosDenegacion'] },
          { id: 'notificacion_requerimiento', type: 'notificacion_requerimiento', name: 'Requerimiento de Subsanación', requiredFields: ['expedienteId', 'documentosRequeridos'] },
          { id: 'certificado_ayuda', type: 'certificado_ayuda', name: 'Certificado de Ayuda', requiredFields: ['expedienteId'] },
          { id: 'acta_comision', type: 'acta_comision', name: 'Acta de Comisión de Valoración', requiredFields: ['fechaReunion', 'expedientes'] }
        ]
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'approve' || action === 'export_pdf') {
      return new Response(JSON.stringify({
        success: true,
        documentId,
        status: action === 'approve' ? 'approved' : 'exported',
        pdfUrl: action === 'export_pdf' ? `https://storage.example.com/docs/${documentId}.pdf` : undefined
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'history') {
      return new Response(JSON.stringify({
        success: true,
        documents: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generación de documento con IA
    const typePrompts: Record<string, string> = {
      memoria_anual: `Genera una Memoria Anual para un Grupo de Acción Local (GAL) LEADER.
Debe incluir:
- Resumen ejecutivo
- Actividades realizadas
- Proyectos aprobados y ejecutados
- Indicadores de impacto (empleo, inversión, territorios)
- Ejecución presupuestaria
- Objetivos cumplidos vs planificados
- Conclusiones y retos futuros`,

      informe_feder: `Genera un Informe de Seguimiento FEDER trimestral.
Debe incluir:
- Datos de identificación del programa
- Avance financiero (comprometido/certificado/pagado)
- Indicadores de productividad
- Indicadores de resultado
- Proyectos emblemáticos
- Problemas detectados y soluciones
- Previsiones próximo trimestre`,

      resolucion_concesion: `Genera una Resolución de Concesión de ayuda LEADER.
Debe incluir:
- Encabezado institucional
- Antecedentes (solicitud, expediente, convocatoria)
- Consideraciones jurídicas (Ley 38/2003, Ley 39/2015)
- Valoración técnica positiva
- Fundamentación de derecho
- Parte dispositiva: RESUELVO conceder...
- Importe concedido y desglose
- Condiciones y obligaciones
- Plazos de ejecución y justificación
- Recursos (alzada, contencioso-administrativo)
- Pie de firma`,

      resolucion_denegacion: `Genera una Resolución de Denegación motivada.
Debe incluir:
- Encabezado institucional
- Antecedentes del expediente
- Motivos de denegación (claros y específicos)
- Fundamentación de derecho
- Parte dispositiva: RESUELVO denegar...
- Recursos disponibles y plazos
- Pie de firma`,

      notificacion_requerimiento: `Genera un Requerimiento de Subsanación (Ley 39/2015, art. 68).
Debe incluir:
- Identificación del expediente
- Defectos o documentos que faltan (lista específica)
- Plazo para subsanar (10 días hábiles)
- Advertencia de desistimiento si no subsana
- Base legal
- Pie de firma`
    };

    const systemPrompt = `Eres un experto en documentación administrativa española para ayudas públicas LEADER/FEDER.
Generas documentos oficiales con formato jurídico correcto, cumpliendo:
- Ley 39/2015 de Procedimiento Administrativo
- Ley 38/2003 General de Subvenciones
- Reglamentos FEDER y FEADER de la UE

FORMATO DE RESPUESTA (JSON estricto):
{
  "document": {
    "id": "uuid",
    "type": "${documentType}",
    "title": "string",
    "content": "contenido markdown con formato oficial",
    "htmlContent": "versión HTML del documento",
    "metadata": {
      "fecha": "ISO date",
      "expedienteId": "string si aplica",
      "beneficiario": "string si aplica"
    },
    "legalReferences": ["array de referencias legales"],
    "status": "draft"
  }
}`;

    const userPrompt = typePrompts[documentType || ''] 
      ? `${typePrompts[documentType || '']}\n\nContexto: ${JSON.stringify(context)}`
      : `Genera documento de tipo "${documentType}" con contexto: ${JSON.stringify(context)}`;

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
        temperature: 0.4,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = { document: { content, parseError: true } };
    }

    // Añadir ID y timestamp si no existen
    if (result?.document) {
      result.document.id = result.document.id || crypto.randomUUID();
      result.document.generatedAt = new Date().toISOString();
    }

    console.log(`[galia-document-generator] Generated ${documentType}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-document-generator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
