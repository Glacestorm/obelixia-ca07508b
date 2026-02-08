import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeRequest {
  action: 'search' | 'get_relations' | 'get_node_details' | 'analyze_document' | 'get_graph_data';
  query?: string;
  nodeId?: string;
  documentContent?: string;
  category?: 'normativa' | 'procedimiento' | 'concepto' | 'entidad' | 'requisito';
  depth?: number;
}

/**
 * GALIA Knowledge Graph - Grafo de Conocimiento LEADER
 * 
 * Sistema de inteligencia semántica para normativa LEADER/FEDER:
 * - Búsqueda semántica de conceptos y artículos
 * - Navegación de relaciones entre normativas
 * - Análisis de documentos para extracción de entidades
 * - Grafo de conocimiento visual
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, query, nodeId, documentContent, category, depth = 2 } = await req.json() as KnowledgeRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'search':
        systemPrompt = `Eres un sistema de búsqueda semántica especializado en normativa LEADER, FEDER y subvenciones públicas españolas.

NORMATIVAS CLAVE EN TU BASE DE CONOCIMIENTO:
- Ley 38/2003 General de Subvenciones
- RD 887/2006 Reglamento de Subvenciones  
- Ley 39/2015 Procedimiento Administrativo Común
- Ley 40/2015 Régimen Jurídico del Sector Público
- Reglamento (UE) 2021/2115 PAC
- Reglamento (UE) 2021/1060 Disposiciones Comunes
- Normativa LEADER Asturias 2023-2027
- Bases Reguladoras LEADER GAL
- Real Decreto 1048/2022 Plan Estratégico PAC

CAPACIDADES:
- Búsqueda semántica por conceptos
- Identificación de artículos relevantes
- Relaciones entre normativas
- Precedentes y jurisprudencia

FORMATO DE RESPUESTA (JSON estricto):
{
  "results": [
    {
      "id": "string (UUID)",
      "type": "normativa | procedimiento | concepto | entidad | requisito",
      "title": "string",
      "excerpt": "string (max 200 chars)",
      "source": {
        "document": "string",
        "article": "string",
        "url": "string"
      },
      "relevanceScore": 0-100,
      "relatedNodes": ["id1", "id2"],
      "tags": ["tag1", "tag2"],
      "lastUpdated": "ISO8601"
    }
  ],
  "totalResults": number,
  "suggestedQueries": ["query1", "query2"],
  "knowledgeContext": "string (resumen del contexto normativo)"
}`;

        userPrompt = `Busca información sobre: "${query}". 
Categoría de búsqueda: ${category || 'todas'}.
Proporciona los resultados más relevantes ordenados por pertinencia.`;
        break;

      case 'get_relations':
        systemPrompt = `Eres un analizador de relaciones normativas para el marco LEADER/FEDER español.

TIPOS DE RELACIONES:
- "modifica": Una norma modifica otra
- "desarrolla": Reglamento desarrolla ley
- "deroga": Derogación total o parcial
- "complementa": Normativas complementarias
- "requiere": Dependencia de cumplimiento
- "referencia": Referencia cruzada
- "implementa": Transposición UE
- "excepciona": Excepciones a la regla general

FORMATO DE RESPUESTA (JSON estricto):
{
  "sourceNode": {
    "id": "string",
    "title": "string",
    "type": "string"
  },
  "relations": [
    {
      "id": "string",
      "targetNode": {
        "id": "string",
        "title": "string",
        "type": "string"
      },
      "relationType": "modifica | desarrolla | deroga | complementa | requiere | referencia | implementa | excepciona",
      "description": "string",
      "strength": 1-5,
      "bidirectional": boolean,
      "effectiveDate": "ISO8601 | null"
    }
  ],
  "graphDepth": number,
  "totalRelations": number
}`;

        userPrompt = `Obtén las relaciones del nodo "${nodeId}" con profundidad ${depth}.
Incluye todas las normativas relacionadas y el tipo de relación.`;
        break;

      case 'get_node_details':
        systemPrompt = `Eres un sistema de documentación normativa LEADER especializado.

INFORMACIÓN A PROPORCIONAR:
- Resumen ejecutivo del concepto/normativa
- Artículos clave y su interpretación
- Obligaciones derivadas para beneficiarios
- Requisitos de verificación para técnicos
- Plazos y fechas importantes
- Sanciones por incumplimiento
- Casos prácticos de aplicación

FORMATO DE RESPUESTA (JSON estricto):
{
  "node": {
    "id": "string",
    "type": "normativa | procedimiento | concepto | entidad | requisito",
    "title": "string",
    "fullDescription": "string (markdown)",
    "keyArticles": [
      {
        "number": "string",
        "title": "string",
        "summary": "string",
        "obligations": ["obl1", "obl2"]
      }
    ],
    "practicalImplications": {
      "forBeneficiaries": ["imp1", "imp2"],
      "forTechnicians": ["imp1", "imp2"],
      "forGAL": ["imp1", "imp2"]
    },
    "deadlines": [
      {
        "description": "string",
        "date": "string | null",
        "recurring": boolean
      }
    ],
    "penalties": ["penalty1", "penalty2"],
    "relatedConcepts": ["concept1", "concept2"],
    "lastModified": "ISO8601",
    "sourceUrl": "string"
  }
}`;

        userPrompt = `Proporciona información detallada del nodo "${nodeId}".
Incluye interpretación práctica para técnicos de GAL.`;
        break;

      case 'analyze_document':
        systemPrompt = `Eres un analizador de documentos para extracción de entidades LEADER/FEDER.

ENTIDADES A EXTRAER:
- Normativas referenciadas (leyes, RD, reglamentos UE)
- Conceptos clave (subvención, justificación, elegibilidad)
- Entidades (GAL, beneficiarios, organismos)
- Requisitos y obligaciones
- Plazos y fechas
- Importes y porcentajes
- Procedimientos administrativos

FORMATO DE RESPUESTA (JSON estricto):
{
  "documentAnalysis": {
    "type": "convocatoria | bases | justificacion | resolucion | otro",
    "mainTopic": "string",
    "summary": "string"
  },
  "extractedEntities": [
    {
      "id": "string (UUID)",
      "type": "normativa | concepto | entidad | requisito | plazo | importe",
      "text": "string (texto original)",
      "normalizedText": "string",
      "context": "string",
      "confidence": 0-100,
      "position": {
        "start": number,
        "end": number
      }
    }
  ],
  "suggestedLinks": [
    {
      "entityId": "string",
      "linkedKnowledgeNode": "string",
      "relationshipType": "string"
    }
  ],
  "riskIndicators": [
    {
      "type": "plazo_corto | requisito_incompleto | normativa_desactualizada | importe_elevado",
      "description": "string",
      "severity": "low | medium | high"
    }
  ],
  "completenessScore": 0-100
}`;

        userPrompt = `Analiza el siguiente documento y extrae todas las entidades relevantes:

${documentContent?.substring(0, 5000) || 'Documento vacío'}`;
        break;

      case 'get_graph_data':
        systemPrompt = `Eres un generador de datos para visualización de grafo de conocimiento LEADER.

ESTRUCTURA DEL GRAFO:
- Nodos: Representan normativas, conceptos, entidades
- Aristas: Representan relaciones entre nodos
- Clusters: Agrupaciones temáticas

FORMATO DE RESPUESTA (JSON estricto):
{
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "type": "normativa | concepto | entidad | requisito | procedimiento",
      "group": "string (cluster temático)",
      "size": number (1-10, según importancia),
      "color": "string (hex color)",
      "metadata": {
        "source": "string",
        "date": "string",
        "status": "vigente | derogada | pendiente"
      }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string (node id)",
      "target": "string (node id)",
      "label": "string",
      "type": "modifica | desarrolla | complementa | requiere | referencia",
      "weight": number (1-5),
      "dashed": boolean
    }
  ],
  "clusters": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "nodeCount": number
    }
  ],
  "statistics": {
    "totalNodes": number,
    "totalEdges": number,
    "avgConnections": number,
    "mostConnected": "string (node id)"
  }
}`;

        userPrompt = `Genera los datos del grafo de conocimiento para la categoría "${category || 'general'}" con los nodos y relaciones principales de la normativa LEADER.
Incluye las normativas más importantes y sus interconexiones.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-knowledge-graph] Processing action: ${action}`);

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
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-knowledge-graph] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-knowledge-graph] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
