import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  action: 'analyze' | 'import';
  fileContent: string;
  fileName: string;
  entityType?: 'customers' | 'suppliers' | 'items' | 'taxes' | 'payment_terms' | 'warehouses' | 'all';
  companyId: string;
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

    const { action, fileContent, fileName, entityType, companyId } = await req.json() as ImportRequest;
    console.log(`[maestros-ai-import] Processing action: ${action}, file: ${fileName}, entity: ${entityType}`);

    // Detectar tipo de archivo
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const isStructured = ['csv', 'json', 'xlsx', 'xls', 'xml'].includes(fileExtension);

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'analyze') {
      systemPrompt = `Eres un experto en análisis de datos empresariales para importación a un ERP.
Tu tarea es analizar el contenido del archivo y detectar qué tipo de datos contiene.

TIPOS DE ENTIDADES QUE PUEDES DETECTAR:
- customers: Clientes (campos: code, legal_name, trade_name, tax_id, email, phone, website, notes)
- suppliers: Proveedores (campos: code, legal_name, tax_id, email, phone, notes)
- items: Artículos/Productos (campos: sku, name, description, item_type, unit, barcode, cost, sale_price)
- taxes: Impuestos (campos: name, tax_code, rate, type)
- payment_terms: Condiciones de pago (campos: name, days, day_of_month)
- warehouses: Almacenes (campos: code, name)

FORMATO DE RESPUESTA (JSON estricto):
{
  "detected_entities": [
    {
      "entity_type": "customers" | "suppliers" | "items" | "taxes" | "payment_terms" | "warehouses",
      "confidence": 0-100,
      "records_count": number,
      "sample_data": [...primeros 3 registros parseados],
      "field_mapping": {
        "source_field": "target_field"
      },
      "warnings": ["posibles problemas detectados"],
      "ready_to_import": boolean
    }
  ],
  "file_format": "csv" | "json" | "excel" | "text" | "pdf" | "unknown",
  "encoding_issues": boolean,
  "total_records": number,
  "summary": "resumen del análisis"
}`;

      userPrompt = `Analiza este archivo "${fileName}" (tipo: ${fileExtension}) y detecta qué datos contiene para importar al ERP:

${fileContent.substring(0, 15000)}

${fileContent.length > 15000 ? '...[contenido truncado]' : ''}`;

    } else if (action === 'import') {
      systemPrompt = `Eres un procesador de datos para importación a un ERP enterprise.
Tu tarea es transformar los datos del archivo al formato requerido por cada entidad.

SCHEMAS DE ENTIDADES:

CUSTOMERS:
{ "code": "string (requerido)", "legal_name": "string (requerido)", "trade_name": "string", "tax_id": "string", "email": "string", "phone": "string", "website": "string", "notes": "string", "is_active": true }

SUPPLIERS:
{ "code": "string (requerido)", "legal_name": "string (requerido)", "tax_id": "string", "email": "string", "phone": "string", "notes": "string", "is_active": true }

ITEMS:
{ "sku": "string (requerido)", "name": "string (requerido)", "description": "string", "item_type": "product" | "service", "unit": "string (default: UND)", "barcode": "string", "standard_cost": number, "sale_price": number, "is_stocked": true, "is_active": true }

TAXES:
{ "name": "string (requerido)", "tax_code": "string", "rate": number (requerido, 0-100), "type": "vat" | "retention" | "other", "is_active": true }

PAYMENT_TERMS:
{ "name": "string (requerido)", "days": number (requerido), "day_of_month": number, "is_active": true }

WAREHOUSES:
{ "code": "string (requerido)", "name": "string (requerido)", "is_active": true }

INSTRUCCIONES:
1. Parsea todos los registros del archivo
2. Mapea cada campo al schema correspondiente
3. Genera códigos automáticos si faltan (ej: CLI001, PRO001, SKU001)
4. Valida datos requeridos
5. Normaliza formatos (emails, teléfonos, números)

FORMATO DE RESPUESTA (JSON estricto):
{
  "entity_type": "${entityType}",
  "records": [...array de objetos listos para insertar],
  "total_processed": number,
  "valid_count": number,
  "invalid_count": number,
  "errors": [
    { "row": number, "field": "string", "error": "string", "original_value": "any" }
  ],
  "warnings": ["avisos no críticos"],
  "auto_generated_codes": number
}`;

      userPrompt = `Procesa este archivo "${fileName}" para importar entidades de tipo "${entityType}":

${fileContent.substring(0, 20000)}

${fileContent.length > 20000 ? '...[contenido truncado por longitud]' : ''}

Genera los registros listos para insertar en la base de datos.`;
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
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'rate_limit', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'payment_required', 
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
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[maestros-ai-import] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[maestros-ai-import] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[maestros-ai-import] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
