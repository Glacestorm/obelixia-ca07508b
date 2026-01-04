import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  targetEntity: 'customers' | 'suppliers' | 'items' | 'taxes' | 'payment_terms' | 'warehouses' | 'bank_accounts';
  companyId: string;
}

interface MappedRecord {
  [key: string]: unknown;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  mappedData: MappedRecord[];
}

const ENTITY_SCHEMAS: Record<string, { required: string[]; optional: string[]; description: string }> = {
  customers: {
    required: ['customer_code', 'name'],
    optional: ['tax_id', 'email', 'phone', 'address', 'city', 'postal_code', 'country', 'contact_person', 'payment_terms', 'credit_limit', 'notes'],
    description: 'Clientes de la empresa'
  },
  suppliers: {
    required: ['supplier_code', 'name'],
    optional: ['tax_id', 'email', 'phone', 'address', 'city', 'postal_code', 'country', 'contact_person', 'payment_terms', 'bank_account', 'notes'],
    description: 'Proveedores de la empresa'
  },
  items: {
    required: ['item_code', 'name'],
    optional: ['description', 'category', 'unit_of_measure', 'purchase_price', 'sale_price', 'tax_rate', 'stock_min', 'stock_max', 'barcode', 'supplier_code', 'is_active'],
    description: 'Artículos/productos del catálogo'
  },
  taxes: {
    required: ['tax_code', 'name', 'rate'],
    optional: ['description', 'tax_type', 'is_active'],
    description: 'Tipos de impuestos'
  },
  payment_terms: {
    required: ['code', 'name', 'days'],
    optional: ['description', 'discount_percentage', 'is_active'],
    description: 'Condiciones de pago'
  },
  warehouses: {
    required: ['warehouse_code', 'name'],
    optional: ['address', 'city', 'postal_code', 'country', 'manager', 'is_active'],
    description: 'Almacenes'
  },
  bank_accounts: {
    required: ['account_number', 'bank_name'],
    optional: ['iban', 'swift', 'account_holder', 'currency', 'is_default', 'notes'],
    description: 'Cuentas bancarias'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { fileContent, fileName, fileType, targetEntity, companyId } = await req.json() as ImportRequest;

    if (!fileContent || !targetEntity || !companyId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Faltan parámetros requeridos: fileContent, targetEntity, companyId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const schema = ENTITY_SCHEMAS[targetEntity];
    if (!schema) {
      return new Response(JSON.stringify({
        success: false,
        error: `Entidad no soportada: ${targetEntity}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[maestros-ai-import] Processing ${fileName} (${fileType}) for ${targetEntity}`);

    const systemPrompt = `Eres un experto en procesamiento y transformación de datos para sistemas ERP.
Tu tarea es analizar el contenido de un archivo y extraer los datos para importarlos a la entidad "${targetEntity}" (${schema.description}).

ESQUEMA DE LA ENTIDAD:
- Campos requeridos: ${schema.required.join(', ')}
- Campos opcionales: ${schema.optional.join(', ')}

INSTRUCCIONES:
1. Analiza el contenido del archivo (puede ser CSV, Excel, JSON, texto plano, o cualquier formato estructurado)
2. Identifica las columnas/campos del archivo y mapéalos a los campos del esquema
3. Extrae todos los registros válidos
4. Para cada registro, genera un objeto JSON con los campos mapeados
5. Si un campo requerido está vacío, marca el registro como error
6. Normaliza los datos (mayúsculas en códigos, trim de espacios, formatos de fecha, etc.)

FORMATO DE RESPUESTA (JSON estricto):
{
  "mappedData": [
    { "customer_code": "C001", "name": "Cliente 1", "email": "...", ... },
    ...
  ],
  "columnMapping": {
    "columna_original": "campo_destino",
    ...
  },
  "errors": [
    { "row": 1, "field": "customer_code", "message": "Campo requerido vacío" },
    ...
  ],
  "summary": {
    "totalRows": 10,
    "validRows": 8,
    "invalidRows": 2
  }
}`;

    const userPrompt = `Archivo: ${fileName}
Tipo: ${fileType}
Entidad destino: ${targetEntity}

CONTENIDO DEL ARCHIVO:
${fileContent.substring(0, 50000)}

Analiza y extrae los datos para importar. Responde SOLO con el JSON estructurado.`;

    console.log(`[maestros-ai-import] Calling AI for data extraction...`);

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
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[maestros-ai-import] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Límite de solicitudes excedido. Intenta de nuevo en unos minutos.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Créditos de IA insuficientes.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log(`[maestros-ai-import] AI response received, parsing...`);

    let parsedResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[maestros-ai-import] JSON parse error:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error al procesar la respuesta de IA',
        rawContent: content.substring(0, 500)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result: ImportResult = {
      success: true,
      totalRows: parsedResult.summary?.totalRows || parsedResult.mappedData?.length || 0,
      importedRows: parsedResult.summary?.validRows || parsedResult.mappedData?.length || 0,
      failedRows: parsedResult.summary?.invalidRows || parsedResult.errors?.length || 0,
      errors: parsedResult.errors || [],
      mappedData: parsedResult.mappedData || []
    };

    console.log(`[maestros-ai-import] Success: ${result.importedRows}/${result.totalRows} rows processed`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[maestros-ai-import] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
