const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PrintRequest {
  action: 'generate_pdf' | 'generate_resolution' | 'generate_requerimiento' | 'generate_memoria' | 'generate_acta' | 'export_data';
  expedienteId?: string;
  documentType?: string;
  sections?: string[];
  format?: 'pdf' | 'excel' | 'word' | 'csv';
  templateId?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, expedienteId, documentType, sections, format, templateId, data } = await req.json() as PrintRequest;
    console.log(`[galia-document-print] Action: ${action}, Type: ${documentType}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_pdf':
        systemPrompt = `Eres un generador de documentos PDF para expedientes de subvenciones LEADER/FEDER.

CONTEXTO:
- Normativa: Ley 38/2003 General de Subvenciones, Ley 39/2015 LPACAP
- Programa: LEADER (FEADER) / FEDER desarrollo rural
- Organismo: Grupo de Acción Local

GENERA el contenido estructurado del documento PDF con:
- Cabecera oficial con membrete del GAL
- Número de expediente y fecha
- Datos del beneficiario
- Secciones seleccionadas
- Pie con firma electrónica y validación

FORMATO RESPUESTA (JSON estricto):
{
  "documento": {
    "tipo": "expediente_completo",
    "titulo": "string",
    "fechaGeneracion": "ISO date",
    "cabecera": {
      "organismo": "string",
      "programa": "LEADER/FEDER",
      "convocatoria": "string"
    },
    "expediente": {
      "numero": "string",
      "beneficiario": "string",
      "nif": "string",
      "proyecto": "string"
    },
    "secciones": [
      {
        "id": "string",
        "titulo": "string",
        "contenido": "markdown content",
        "incluirEnImpresion": true
      }
    ],
    "pie": {
      "codigoVerificacion": "string",
      "urlVerificacion": "string",
      "fechaFirma": "ISO date"
    }
  }
}`;
        userPrompt = `Genera documento PDF para expediente ${expedienteId || 'demo'}.
Secciones a incluir: ${sections?.join(', ') || 'todas'}.
Datos adicionales: ${JSON.stringify(data || {})}`;
        break;

      case 'generate_resolution':
        systemPrompt = `Eres un redactor de resoluciones administrativas para subvenciones LEADER.

ESTRUCTURA DE RESOLUCIÓN (Ley 39/2015):
1. ENCABEZAMIENTO: Autoridad que resuelve, expediente, beneficiario
2. ANTECEDENTES: Solicitud, convocatoria, instrucción, informes
3. CONSIDERACIONES JURÍDICAS: Base legal, cumplimiento requisitos
4. PARTE DISPOSITIVA: Conceder/denegar, importe, condiciones, plazos
5. RECURSOS: Alzada/reposición, plazos, órgano competente

FORMATO RESPUESTA (JSON estricto):
{
  "resolucion": {
    "tipo": "concesion|denegacion|archivo|desistimiento",
    "numero": "RES-YYYY-NNNN",
    "fecha": "ISO date",
    "encabezamiento": "string",
    "antecedentes": ["string"],
    "fundamentosJuridicos": ["string"],
    "parteDispositiva": {
      "decision": "string",
      "importeConcedido": number,
      "condiciones": ["string"],
      "plazoJustificacion": "string"
    },
    "recursos": {
      "tipo": "alzada|reposicion",
      "plazo": "1 mes",
      "organoCompetente": "string"
    },
    "firmaElectronica": {
      "cargo": "string",
      "nombre": "string",
      "csv": "string"
    }
  }
}`;
        userPrompt = `Genera resolución de ${documentType || 'concesión'} para expediente ${expedienteId}.
Datos del expediente: ${JSON.stringify(data || {})}`;
        break;

      case 'generate_requerimiento':
        systemPrompt = `Eres un redactor de requerimientos de subsanación según Ley 39/2015.

ELEMENTOS DEL REQUERIMIENTO:
1. Identificación del expediente y solicitante
2. Defectos o documentación pendiente detectada
3. Plazo de subsanación (10 días hábiles)
4. Advertencia de archivo si no subsana
5. Información sobre recursos

FORMATO RESPUESTA (JSON estricto):
{
  "requerimiento": {
    "numero": "REQ-YYYY-NNNN",
    "fecha": "ISO date",
    "expediente": "string",
    "beneficiario": {
      "nombre": "string",
      "nif": "string",
      "direccion": "string"
    },
    "defectosDetectados": [
      {
        "codigo": "string",
        "descripcion": "string",
        "documentoRequerido": "string",
        "obligatorio": true
      }
    ],
    "plazoSubsanacion": "10 días hábiles",
    "fechaLimite": "ISO date",
    "advertencias": ["string"],
    "instrucciones": "string",
    "firmaElectronica": {
      "cargo": "string",
      "csv": "string"
    }
  }
}`;
        userPrompt = `Genera requerimiento de subsanación para expediente ${expedienteId}.
Defectos detectados: ${JSON.stringify(data?.defectos || ['Documentación incompleta'])}`;
        break;

      case 'generate_memoria':
        systemPrompt = `Eres un redactor de memorias FEDER/LEADER para justificación ante la UE.

ESTRUCTURA DE MEMORIA ANUAL:
1. RESUMEN EJECUTIVO
2. DESCRIPCIÓN DEL GAL Y TERRITORIO
3. ESTRATEGIA DE DESARROLLO LOCAL
4. ACTUACIONES REALIZADAS
5. PROYECTOS APOYADOS (detalle)
6. EJECUCIÓN PRESUPUESTARIA
7. INDICADORES DE RESULTADO
8. PROBLEMAS Y SOLUCIONES
9. PERSPECTIVAS FUTURAS
10. ANEXOS

FORMATO RESPUESTA (JSON estricto):
{
  "memoria": {
    "tipo": "anual|justificacion|seguimiento",
    "periodo": "string",
    "fechaElaboracion": "ISO date",
    "secciones": [
      {
        "numero": "string",
        "titulo": "string",
        "contenido": "markdown",
        "tablas": [],
        "graficos": []
      }
    ],
    "indicadores": {
      "proyectosApoyados": number,
      "inversionTotal": number,
      "empleosCreados": number,
      "beneficiariosAtendidos": number
    },
    "anexos": ["string"]
  }
}`;
        userPrompt = `Genera memoria ${documentType || 'anual'} para el período.
Datos: ${JSON.stringify(data || {})}`;
        break;

      case 'generate_acta':
        systemPrompt = `Eres un redactor de actas de verificación para subvenciones LEADER.

ESTRUCTURA DEL ACTA DE VERIFICACIÓN:
1. DATOS DE LA VISITA: Fecha, hora, lugar, asistentes
2. OBJETO DE LA VERIFICACIÓN
3. DOCUMENTACIÓN REVISADA
4. COMPROBACIONES REALIZADAS
5. OBSERVACIONES Y HALLAZGOS
6. CONCLUSIONES
7. FIRMAS

FORMATO RESPUESTA (JSON estricto):
{
  "acta": {
    "tipo": "verificacion_in_situ|verificacion_administrativa|control_final",
    "numero": "ACT-YYYY-NNNN",
    "expediente": "string",
    "datosVisita": {
      "fecha": "ISO date",
      "hora": "string",
      "lugar": "string",
      "asistentes": [
        {"nombre": "string", "cargo": "string", "organismo": "string"}
      ]
    },
    "objeto": "string",
    "documentacionRevisada": ["string"],
    "comprobaciones": [
      {
        "aspecto": "string",
        "resultado": "conforme|no_conforme|no_aplica",
        "observaciones": "string"
      }
    ],
    "conclusiones": "string",
    "recomendaciones": ["string"],
    "firmas": [
      {"nombre": "string", "cargo": "string", "firma": "pendiente"}
    ]
  }
}`;
        userPrompt = `Genera acta de ${documentType || 'verificación'} para expediente ${expedienteId}.
Datos de la verificación: ${JSON.stringify(data || {})}`;
        break;

      case 'export_data':
        systemPrompt = `Eres un exportador de datos de expedientes a formatos estructurados.

FORMATOS SOPORTADOS:
- Excel: Columnas con datos tabulares
- CSV: Separado por punto y coma
- Word: Documento formateado
- JSON: Estructura de datos

FORMATO RESPUESTA (JSON estricto):
{
  "export": {
    "formato": "excel|csv|word|json",
    "nombreArchivo": "string",
    "fechaExportacion": "ISO date",
    "columnas": ["string"],
    "filas": [[]],
    "metadata": {
      "totalRegistros": number,
      "filtrosAplicados": {},
      "generadoPor": "GALIA"
    }
  }
}`;
        userPrompt = `Exporta datos en formato ${format || 'excel'}.
Datos a exportar: ${JSON.stringify(data || {})}`;
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
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-document-print] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      format: format || 'pdf',
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-document-print] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
