import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  action: 'smart_import' | 'analyze_file' | 'supervisor_coordinate';
  targetModule?: string;
  fileName?: string;
  fileType?: string;
  fileContent?: string;
  options?: {
    autoMap?: boolean;
    validateOnly?: boolean;
    skipDuplicates?: boolean;
  };
  objective?: string;
  agents?: Array<{
    id: string;
    type: string;
    status: string;
    capabilities: string[];
  }>;
}

const MODULE_SCHEMAS: Record<string, { table: string; requiredFields: string[]; optionalFields: string[] }> = {
  customers: {
    table: 'erp_customers',
    requiredFields: ['name', 'tax_id'],
    optionalFields: ['email', 'phone', 'address', 'city', 'postal_code', 'country', 'credit_limit', 'payment_term_id', 'notes']
  },
  suppliers: {
    table: 'erp_suppliers',
    requiredFields: ['name', 'tax_id'],
    optionalFields: ['email', 'phone', 'address', 'city', 'postal_code', 'country', 'iban', 'swift', 'payment_term_id', 'notes']
  },
  items: {
    table: 'erp_items',
    requiredFields: ['code', 'name'],
    optionalFields: ['description', 'category', 'unit', 'purchase_price', 'sale_price', 'tax_id', 'barcode', 'stock_min', 'stock_max', 'warehouse_id']
  },
  taxes: {
    table: 'erp_taxes',
    requiredFields: ['name', 'rate'],
    optionalFields: ['description', 'type', 'account_id', 'is_default']
  },
  payment_terms: {
    table: 'erp_payment_terms',
    requiredFields: ['name', 'days'],
    optionalFields: ['description', 'discount_percent', 'discount_days']
  },
  warehouses: {
    table: 'erp_warehouses',
    requiredFields: ['code', 'name'],
    optionalFields: ['address', 'city', 'postal_code', 'country', 'manager', 'phone', 'is_default']
  },
  locations: {
    table: 'erp_warehouse_locations',
    requiredFields: ['code', 'warehouse_id'],
    optionalFields: ['name', 'zone', 'aisle', 'rack', 'level', 'position', 'max_weight', 'max_volume']
  },
  banks: {
    table: 'erp_bank_accounts',
    requiredFields: ['name', 'iban'],
    optionalFields: ['bank_name', 'swift', 'account_number', 'currency', 'is_default']
  },
  sepa: {
    table: 'erp_sepa_mandates',
    requiredFields: ['mandate_id', 'customer_id', 'iban'],
    optionalFields: ['signature_date', 'expiry_date', 'status', 'mandate_type']
  },
  series: {
    table: 'erp_document_series',
    requiredFields: ['code', 'name', 'document_type'],
    optionalFields: ['prefix', 'suffix', 'next_number', 'format', 'is_default']
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

    const request = await req.json() as ImportRequest;
    const { action, targetModule, fileName, fileType, fileContent, options, objective, agents } = request;

    console.log(`[maestros-ai-import] Action: ${action}, Module: ${targetModule || 'N/A'}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'analyze_file':
        result = await analyzeFile(LOVABLE_API_KEY, fileName || '', fileType || '', fileContent || '');
        break;

      case 'smart_import':
        result = await performSmartImport(
          LOVABLE_API_KEY, 
          targetModule || 'customers',
          fileName || '',
          fileContent || '',
          options || {}
        );
        break;

      case 'supervisor_coordinate':
        result = await supervisorCoordinate(LOVABLE_API_KEY, objective || '', agents || []);
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
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

async function analyzeFile(
  apiKey: string,
  fileName: string,
  fileType: string,
  fileContent: string
): Promise<Record<string, unknown>> {
  const systemPrompt = `Eres un analizador de archivos experto para importación a ERP.

MÓDULOS DISPONIBLES:
- customers: Clientes (campos: name, tax_id, email, phone, address, city, postal_code, country, credit_limit)
- suppliers: Proveedores (campos: name, tax_id, email, phone, address, iban, swift)
- items: Artículos (campos: code, name, description, category, unit, purchase_price, sale_price, barcode)
- taxes: Impuestos (campos: name, rate, description, type)
- payment_terms: Condiciones de pago (campos: name, days, description, discount_percent)
- warehouses: Almacenes (campos: code, name, address, city)
- locations: Ubicaciones (campos: code, warehouse_id, name, zone, aisle, rack)
- banks: Bancos (campos: name, iban, bank_name, swift, account_number)
- sepa: Mandatos SEPA (campos: mandate_id, customer_id, iban, signature_date)
- series: Series documentales (campos: code, name, document_type, prefix, next_number)

FORMATO DE RESPUESTA JSON:
{
  "detectedFormat": "csv|xlsx|json|xml|txt",
  "suggestedModule": "customers|suppliers|items|...",
  "columns": ["columna1", "columna2", ...],
  "sampleData": [{"col1": "val1", ...}],
  "confidence": 0.0-1.0,
  "fieldMapping": {"columna_origen": "campo_erp"},
  "warnings": [],
  "suggestions": []
}`;

  const userPrompt = `Analiza este archivo para determinar el módulo destino y mapeo de campos:

Nombre: ${fileName}
Tipo: ${fileType}
Contenido (primeras líneas):
${fileContent}

Detecta el formato, sugiere el módulo más apropiado, extrae las columnas y genera un mapeo inteligente.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      throw new Error('Rate limit excedido. Intenta más tarde.');
    }
    if (status === 402) {
      throw new Error('Créditos de IA insuficientes.');
    }
    throw new Error(`API error: ${status}`);
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || '';
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(content);
  } catch {
    return { 
      detectedFormat: 'unknown',
      suggestedModule: 'customers',
      columns: [],
      sampleData: [],
      confidence: 0.5,
      raw_response: content 
    };
  }
}

async function performSmartImport(
  apiKey: string,
  targetModule: string,
  fileName: string,
  fileContent: string,
  options: Record<string, boolean>
): Promise<Record<string, unknown>> {
  const schema = MODULE_SCHEMAS[targetModule];
  if (!schema) {
    throw new Error(`Módulo no soportado: ${targetModule}`);
  }

  const systemPrompt = `Eres un importador inteligente de datos para ERP.

MÓDULO DESTINO: ${targetModule.toUpperCase()}
TABLA: ${schema.table}
CAMPOS REQUERIDOS: ${schema.requiredFields.join(', ')}
CAMPOS OPCIONALES: ${schema.optionalFields.join(', ')}

OPCIONES:
- autoMap: ${options.autoMap ?? true}
- validateOnly: ${options.validateOnly ?? false}
- skipDuplicates: ${options.skipDuplicates ?? true}

PROCESO:
1. Detectar formato del archivo (CSV, Excel, JSON, XML, etc.)
2. Extraer todos los registros
3. Mapear cada columna al campo ERP correspondiente
4. Validar datos (tipos, formatos, valores requeridos)
5. Detectar y marcar duplicados potenciales
6. Transformar valores (fechas, números, normalizaciones)
7. Generar registros listos para insertar

VALIDACIONES ESPECIALES:
- tax_id: Validar formato NIF/CIF español o VAT europeo
- iban: Validar formato IBAN
- email: Validar formato email
- phone: Normalizar formato teléfono
- dates: Convertir a formato ISO (YYYY-MM-DD)
- numbers: Convertir decimales (coma/punto)

FORMATO DE RESPUESTA JSON:
{
  "totalRecords": 0,
  "processedRecords": 0,
  "failedRecords": 0,
  "errors": ["descripción de error..."],
  "warnings": ["advertencia..."],
  "result": {
    "success": true,
    "imported": 0,
    "updated": 0,
    "skipped": 0,
    "errors": [{"row": 1, "field": "name", "message": "Campo vacío", "data": {}}],
    "warnings": [{"row": 2, "message": "Duplicado potencial"}],
    "mappedData": [{"name": "...", "tax_id": "...", ...}]
  }
}`;

  const userPrompt = `Importa los siguientes datos al módulo ${targetModule}:

Archivo: ${fileName}
Contenido:
${fileContent}

Procesa todos los registros, valida los datos y genera el resultado de importación.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 8000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      throw new Error('Rate limit excedido. Intenta más tarde.');
    }
    if (status === 402) {
      throw new Error('Créditos de IA insuficientes.');
    }
    throw new Error(`API error: ${status}`);
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || '';
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(content);
  } catch {
    return { 
      success: false,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 1,
      errors: ['Error al procesar respuesta de IA'],
      raw_response: content 
    };
  }
}

async function supervisorCoordinate(
  apiKey: string,
  objective: string,
  agents: Array<{ id: string; type: string; status: string; capabilities: string[] }>
): Promise<Record<string, unknown>> {
  const systemPrompt = `Eres el Supervisor General de Agentes de Maestros ERP.

Tu rol es coordinar y optimizar el trabajo de todos los agentes especializados:
${agents.map(a => `- ${a.type}: ${a.capabilities.join(', ')}`).join('\n')}

CAPACIDADES:
1. Distribuir tareas según especialización
2. Detectar conflictos y dependencias
3. Optimizar secuencias de trabajo
4. Generar insights y recomendaciones
5. Priorizar importaciones según impacto

FORMATO DE RESPUESTA JSON:
{
  "insights": [
    {
      "id": "uuid",
      "type": "recommendation|warning|optimization|conflict",
      "message": "descripción",
      "affectedModules": ["customers", "items"],
      "priority": "low|medium|high|critical",
      "timestamp": "ISO date"
    }
  ],
  "recommendations": ["texto recomendación..."],
  "optimizations": ["optimización sugerida..."],
  "agentAssignments": {
    "agent_id": ["tarea1", "tarea2"]
  }
}`;

  const userPrompt = `Objetivo de coordinación: ${objective}

Estado actual de agentes:
${JSON.stringify(agents, null, 2)}

Analiza la situación y genera insights y recomendaciones.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || '';
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(content);
  } catch {
    return { 
      insights: [],
      recommendations: [],
      raw_response: content 
    };
  }
}
