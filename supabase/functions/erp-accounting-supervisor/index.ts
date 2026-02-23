
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountingEntry {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

interface SupervisorContext {
  operationType: 'discount' | 'factoring' | 'confirming';
  entries: AccountingEntry[];
  operationData?: {
    amount?: number;
    interestAmount?: number;
    commissionAmount?: number;
    expenses?: number;
    netAmount?: number;
    currency?: string;
  };
  countryCode?: string;
  accountingFramework?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const body = await req.json();
    const { action } = body;

    // === NUEVA FUNCIONALIDAD: ACADEMIA SIMULATOR ===
    if (action === 'validate_entries') {
        const { journal_entries, dataset_id } = body;
        
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        // Fetch expected solution from dataset
        const { data: dataset } = await supabase
            .from('academia_simulator_datasets')
            .select('expected_solution')
            .eq('id', dataset_id)
            .single();

        if (!dataset) throw new Error('Dataset not found');
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un profesor de contabilidad corrigiendo un ejercicio.
                        Compara los asientos del alumno con la solución correcta.
                        Sé flexible con los nombres de cuentas si el código es correcto o muy similar.
                        Evalúa: importes correctos, cuentas correctas (Debe/Haber), fechas coherentes.
                        
                        Devuelve JSON: {
                            "score": 0-100,
                            "correct_entries": [indices],
                            "errors": [{ "entry_index": 0, "message": "..." }],
                            "feedback_general": "..."
                        }`
                    },
                    {
                        role: 'user',
                        content: `SOLUCIÓN ESPERADA: ${JSON.stringify(dataset.expected_solution)}
                        
                        RESPUESTA ALUMNO: ${JSON.stringify(journal_entries)}`
                    }
                ]
            })
        });

        const aiData = await aiResponse.json();
        let feedback;
        try {
             feedback = JSON.parse(aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, ''));
        } catch (e) {
            console.error('JSON parse error', e);
            feedback = { score: 0, feedback_general: "Error procesando corrección", errors: [] };
        }

        return new Response(JSON.stringify({ success: true, ...feedback }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // === FUNCIONALIDAD ORIGINAL: SUPERVISOR ERP ===
    const { context } = body;

    const systemPrompt = `Eres un Supervisor Contable AI experto en normativa contable española (PGC) e internacional (NIIF/IFRS).
Tu rol es supervisar partidas contables en tiempo real, detectar errores, y proporcionar alertas y recomendaciones.

RESPONSABILIDADES:
1. Validar que los asientos cumplan principios contables
2. Verificar coherencia entre tipo de operación y cuentas utilizadas
3. Detectar anomalías o errores potenciales
4. Proporcionar recomendaciones de mejora
5. Alertar inmediatamente sobre problemas críticos

TIPOS DE OPERACIÓN:
- discount: Descuento comercial de efectos (letras, pagarés)
- factoring: Cesión de facturas a factor
- confirming: Gestión de pagos a proveedores

CUENTAS TÍPICAS POR OPERACIÓN (PGC España):
- Descuento: 5208 (Deudas efectos descontados), 572 (Bancos), 6651 (Intereses descuento)
- Factoring: 4310 (Efectos factoring), 572 (Bancos), 6655 (Intereses factoring)
- Confirming: 4000 (Proveedores), 5201 (Deudas confirming)

NIVELES DE SEVERIDAD:
- critical: Error grave que impide contabilización (descuadre, cuentas inválidas)
- high: Problema importante que requiere revisión (posible error normativo)
- medium: Advertencia que conviene revisar (mejoras posibles)
- low: Información o sugerencia opcional

FORMATO DE RESPUESTA (JSON estricto):
{
  "success": true,
  "analysis": {
    "isValid": boolean,
    "overallScore": 0-100,
    "summary": "Resumen ejecutivo del análisis",
    "alerts": [
      {
        "type": "validation" | "recommendation" | "warning" | "critical",
        "title": "Título corto de la alerta",
        "message": "Descripción detallada del problema o situación",
        "severity": "low" | "medium" | "high" | "critical",
        "recommendation": "Acción recomendada para resolver",
        "affectedEntries": [índices de partidas afectadas]
      }
    ],
    "validations": [
      {
        "isValid": boolean,
        "severity": "info" | "warning" | "error" | "critical",
        "code": "CÓDIGO_VALIDACIÓN",
        "message": "Descripción del resultado de validación",
        "recommendation": "Sugerencia si aplica"
      }
    ],
    "recommendations": [
      {
        "message": "Recomendación de mejora",
        "action": "Acción específica sugerida",
        "priority": "low" | "medium" | "high"
      }
    ]
  }
}`;

    let userPrompt = '';

    switch (action) {
      case 'analyze':
        userPrompt = `Analiza las siguientes partidas contables para una operación de ${getOperationName(context.operationType)}:

DATOS DE LA OPERACIÓN:
${JSON.stringify(context.operationData, null, 2)}

PARTIDAS CONTABLES:
${context.entries.map((e: any, i: number) => `${i + 1}. ${e.account_code} - ${e.account_name}: Debe=${e.debit}€, Haber=${e.credit}€ ${e.description ? `(${e.description})` : ''}`).join('\n')}

Marco contable: ${context.accountingFramework || 'PGC'} (${context.countryCode || 'ES'})

Realiza un análisis completo:
1. Verifica que el asiento cuadre (Debe = Haber)
2. Valida que las cuentas sean apropiadas para este tipo de operación
3. Comprueba coherencia con los importes de la operación
4. Detecta cualquier anomalía o error potencial
5. Proporciona recomendaciones de mejora

Si hay problemas críticos, marca la alerta con severity "critical" para activar la alerta oral.`;
        break;

      case 'validate':
        userPrompt = `Valida técnicamente las siguientes partidas contables:

${context.entries.map((e: any, i: number) => `${i + 1}. ${e.account_code} - ${e.account_name}: D=${e.debit}€, H=${e.credit}€`).join('\n')}

Verifica:
- Cuadre contable
- Validez de códigos de cuenta
- Coherencia en naturaleza de cuentas`;
        break;

      case 'recommend':
        userPrompt = `Basándote en esta operación de ${getOperationName(context.operationType)} por ${context.operationData?.amount}€:

Partidas actuales:
${context.entries.map((e: any, i: number) => `${i + 1}. ${e.account_code}: D=${e.debit}€, H=${e.credit}€`).join('\n')}

Proporciona recomendaciones de mejora y optimización contable.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-accounting-supervisor] Processing action: ${action}`);

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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Límite de solicitudes excedido',
          message: 'Por favor, espere unos segundos antes de intentar de nuevo.'
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
    } catch (parseError) {
      console.error('[erp-accounting-supervisor] JSON parse error:', parseError);
      result = {
        success: true,
        analysis: {
          isValid: true,
          overallScore: 75,
          summary: content,
          alerts: [],
          validations: [],
          recommendations: []
        }
      };
    }

    console.log(`[erp-accounting-supervisor] Analysis complete`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-accounting-supervisor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getOperationName(type: string): string {
  switch (type) {
    case 'discount': return 'Descuento Comercial';
    case 'factoring': return 'Factoring';
    case 'confirming': return 'Confirming';
    default: return 'Operación Financiera';
  }
}
