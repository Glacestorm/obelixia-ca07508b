/**
 * erp-hr-regulatory-watch - Edge function para vigilancia normativa
 * Busca actualizaciones de convenios, CNO, y normativas laborales
 * Usa IA para detectar y clasificar cambios regulatorios
 * 
 * HARDENED S6.5B: validateTenantAccess(), company_id mandatory, AI-only (no DB ops)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

interface WatchRequest {
  action: 'check_updates' | 'analyze_document' | 'get_cno_changes' | 'search_boe';
  company_id: string;
  jurisdictions?: string[];
  categories?: string[];
  document_url?: string;
  query?: string;
}

const JURISDICTION_SOURCES: Record<string, { name: string; official: string; url: string }> = {
  ES: { name: 'España', official: 'BOE', url: 'https://www.boe.es' },
  AD: { name: 'Andorra', official: 'BOPA', url: 'https://www.bopa.ad' },
  EU: { name: 'Unión Europea', official: 'DOUE', url: 'https://eur-lex.europa.eu' },
};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // --- Parse body FIRST to extract company_id ---
    const { action, company_id, jurisdictions, categories, document_url, query } = await req.json() as WatchRequest;

    if (!company_id || typeof company_id !== 'string') {
      return json({ success: false, error: 'company_id is required' }, 400);
    }

    console.log(`[erp-hr-regulatory-watch] Action: ${action}, Company: ${company_id}`);

    // --- AUTH + TENANT GATE ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return json(authResult.body, authResult.status);
    }
    // AI-only function: userClient/adminClient returned but unused (no DB ops)

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'check_updates':
        systemPrompt = `Eres un experto en vigilancia normativa laboral multi-jurisdiccional.

IMPORTANTE - REGLA DE ORO:
Las normativas NO deben aplicarse hasta que estén OFICIALMENTE PUBLICADAS en el boletín oficial correspondiente:
- España: BOE (Boletín Oficial del Estado)
- Andorra: BOPA (Butlletí Oficial del Principat d'Andorra)
- Cataluña: DOGC (Diari Oficial de la Generalitat de Catalunya)
- UE: DOUE (Diario Oficial de la Unión Europea)

TU ROL:
1. Detectar noticias, borradores, propuestas y rumores sobre cambios normativos
2. Clasificar cada hallazgo con su estado de aprobación REAL
3. Identificar qué afecta a contratos, nóminas o procedimientos
4. NO marcar como "aprobado" nada que no tenga publicación oficial

JURISDICCIONES A VIGILAR: ${jurisdictions?.join(', ') || 'ES'}
CATEGORÍAS DE INTERÉS: ${categories?.join(', ') || 'convenio_colectivo, cno, salario_minimo, seguridad_social'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "items": [
    {
      "title": "Título descriptivo",
      "description": "Resumen del cambio propuesto/detectado",
      "source_type": "press|draft|proposal|rumor|union_communication|ministry_announcement",
      "source_name": "Nombre de la fuente",
      "category": "convenio_colectivo|cno|salario_minimo|seguridad_social|irpf|jornada|vacaciones|contratacion|despido|formacion|prl|igualdad|otro",
      "jurisdiction": "ES|AD|EU|PT|FR|UK|AE|US",
      "approval_status": "pending",
      "impact_level": "low|medium|high|critical",
      "requires_contract_update": boolean,
      "requires_payroll_recalc": boolean,
      "requires_immediate_action": boolean,
      "key_changes": {
        "summary": "Resumen de cambios clave",
        "affected_areas": ["área1", "área2"]
      },
      "affected_cnae_codes": ["código1", "código2"] o null
    }
  ],
  "summary": {
    "total_detected": número,
    "by_jurisdiction": {"ES": número, "AD": número},
    "by_category": {"convenio_colectivo": número},
    "high_priority_count": número
  }
}`;

        userPrompt = `Realiza un chequeo de vigilancia normativa para las jurisdicciones ${jurisdictions?.join(', ') || 'España'}.

Busca:
1. Noticias recientes sobre cambios en convenios colectivos
2. Propuestas de modificación del CNO (Código Nacional de Ocupaciones)
3. Anuncios sobre SMI o bases de cotización
4. Comunicados sindicales relevantes
5. Borradores de normativa laboral

Recuerda: Todo lo que NO esté publicado oficialmente debe marcarse como "pending" en approval_status.
Solo las publicaciones en BOE/BOPA/DOGC/DOUE con fecha y número pueden considerarse "approved".`;
        break;

      case 'analyze_document':
        systemPrompt = `Eres un analista jurídico especializado en normativa laboral.

Analiza el documento proporcionado y extrae:
1. Tipo de norma (ley, real decreto, orden, convenio, etc.)
2. Ámbito de aplicación (sectorial, territorial, empresarial)
3. Fecha de publicación y entrada en vigor
4. Cambios principales respecto a normativa anterior
5. Impacto en contratos y nóminas

FORMATO DE RESPUESTA (JSON):
{
  "document_type": "string",
  "scope": "string",
  "publication_date": "YYYY-MM-DD",
  "effective_date": "YYYY-MM-DD",
  "official_reference": "string (ej: BOE-A-2026-1234)",
  "key_changes": [
    {
      "area": "salarios|jornada|vacaciones|despido|contratación|etc",
      "description": "string",
      "previous_value": "string o null",
      "new_value": "string"
    }
  ],
  "affected_cnae_codes": ["string"],
  "contract_update_required": boolean,
  "payroll_recalc_required": boolean,
  "implementation_notes": "string"
}`;

        userPrompt = `Analiza este documento normativo: ${document_url || query}`;
        break;

      case 'get_cno_changes':
        systemPrompt = `Eres un experto en el Código Nacional de Ocupaciones (CNO) español.

El CNO es la clasificación oficial de ocupaciones utilizada en:
- Comunicaciones a la Seguridad Social (Sistema RED)
- Contrat@ del SEPE
- Estadísticas laborales

INFORMACIÓN SOBRE CNO:
- Última versión: CNO-11 (basada en CIUO-08)
- Se actualiza periódicamente por RD
- Los cambios afectan a contratos existentes y nuevos

FORMATO DE RESPUESTA (JSON):
{
  "current_version": {
    "code": "CNO-11",
    "publication_date": "YYYY-MM-DD",
    "boe_reference": "string"
  },
  "pending_changes": [
    {
      "type": "new|modified|deleted|renamed",
      "old_code": "string o null",
      "new_code": "string o null",
      "old_name": "string o null",
      "new_name": "string o null",
      "effective_date": "YYYY-MM-DD o null",
      "status": "pending|approved|in_force",
      "notes": "string"
    }
  ],
  "affected_sectors": ["string"],
  "migration_required": boolean,
  "migration_deadline": "YYYY-MM-DD o null"
}`;

        userPrompt = 'Lista los cambios recientes y pendientes en el CNO (Código Nacional de Ocupaciones) español.';
        break;

      case 'search_boe':
        systemPrompt = `Eres un experto en búsqueda en el BOE (Boletín Oficial del Estado).

Busca normativa laboral relevante según la consulta del usuario.
Solo incluye publicaciones OFICIALES con fecha y referencia BOE.

FORMATO DE RESPUESTA (JSON):
{
  "results": [
    {
      "title": "string",
      "reference": "BOE-A-YYYY-XXXXX",
      "publication_date": "YYYY-MM-DD",
      "effective_date": "YYYY-MM-DD",
      "url": "https://www.boe.es/...",
      "summary": "string",
      "category": "convenio_colectivo|salario_minimo|seguridad_social|etc",
      "affected_cnae_codes": ["string"] o null
    }
  ],
  "total_results": número
}`;

        userPrompt = `Busca en el BOE: ${query}`;
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json({ success: false, error: 'Rate limit exceeded' }, 429);
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

    console.log(`[erp-hr-regulatory-watch] Success: ${action}`);

    return json({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString(),
      jurisdictions_checked: jurisdictions
    });

  } catch (error) {
    console.error('[erp-hr-regulatory-watch] Error:', error);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
});
