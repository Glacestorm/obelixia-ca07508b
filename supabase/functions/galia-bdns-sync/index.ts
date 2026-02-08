/**
 * GALIA BDNS Sync
 * Sincronización con Base de Datos Nacional de Subvenciones
 * https://www.infosubvenciones.es/bdnstrans/GE/es/index
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BDNSRequest {
  action: 'search_convocatorias' | 'get_convocatoria' | 'sync_expediente' | 'validate_beneficiario' | 'export_bdns';
  params?: {
    texto?: string;
    organo?: string;
    sector?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    convocatoriaId?: string;
    expedienteId?: string;
    nif?: string;
  };
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

    const { action, params = {} } = await req.json() as BDNSRequest;

    console.log(`[galia-bdns-sync] Action: ${action}`, params);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'search_convocatorias':
        systemPrompt = `Eres un sistema de búsqueda en la Base de Datos Nacional de Subvenciones (BDNS).

INFORMACIÓN SOBRE BDNS:
- Registro público de convocatorias y concesiones de subvenciones
- Obligatorio para todas las Administraciones Públicas españolas
- Incluye ayudas estatales, autonómicas y locales
- Código BDNS: identificador único de cada convocatoria

CAMPOS DE BÚSQUEDA:
1. Texto libre (título, descripción)
2. Órgano convocante
3. Sector de actividad
4. Tipo de beneficiario
5. Fechas de publicación
6. Comunidad Autónoma
7. Tipo de ayuda (subvención, préstamo, garantía)

FORMATO DE RESPUESTA (JSON estricto):
{
  "resultados": [
    {
      "codigoBDNS": "string (6 dígitos)",
      "titulo": "título de la convocatoria",
      "organoConvocante": "nombre del órgano",
      "comunidadAutonoma": "Asturias" | "Nacional" | etc,
      "sector": "sector de actividad",
      "tipoAyuda": "subvencion" | "prestamo" | "garantia" | "mixta",
      "presupuestoTotal": number,
      "fechaPublicacion": "ISO date",
      "fechaInicioSolicitudes": "ISO date",
      "fechaFinSolicitudes": "ISO date",
      "estado": "abierta" | "cerrada" | "resuelta",
      "enlaceBOE": "URL o null",
      "enlaceBDNS": "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/{codigo}",
      "tiposBeneficiarios": ["empresa", "autonomo", "entidad_local", "asociacion"],
      "resumenRequisitos": "breve descripción"
    }
  ],
  "totalResultados": number,
  "pagina": number,
  "resultadosPorPagina": number,
  "filtrosAplicados": {
    "texto": "string o null",
    "organo": "string o null",
    "sector": "string o null",
    "fechas": "rango o null"
  }
}`;

        userPrompt = `Buscar convocatorias en BDNS con los siguientes criterios:
${params.texto ? `- Texto: "${params.texto}"` : ''}
${params.organo ? `- Órgano: ${params.organo}` : ''}
${params.sector ? `- Sector: ${params.sector}` : ''}
${params.fechaDesde ? `- Desde: ${params.fechaDesde}` : ''}
${params.fechaHasta ? `- Hasta: ${params.fechaHasta}` : ''}
Priorizar convocatorias LEADER/FEDER abiertas en Asturias.
Fecha actual: ${new Date().toISOString()}`;
        break;

      case 'get_convocatoria':
        systemPrompt = `Eres un sistema de consulta detallada de convocatorias BDNS.

INFORMACIÓN DETALLADA DE CONVOCATORIA:
1. Datos identificativos (código, título, órgano)
2. Bases reguladoras
3. Cuantía y presupuesto
4. Requisitos de beneficiarios
5. Criterios de valoración
6. Documentación requerida
7. Plazos y fases
8. Obligaciones de los beneficiarios
9. Justificación y pago
10. Recursos y reclamaciones

FORMATO DE RESPUESTA (JSON estricto):
{
  "convocatoria": {
    "codigoBDNS": "string",
    "titulo": "string",
    "organoConvocante": "string",
    "basesReguladoras": {
      "titulo": "string",
      "boe": "referencia BOE",
      "fecha": "ISO date"
    },
    "objetivoFinalidad": "descripción",
    "tiposBeneficiarios": [
      {
        "tipo": "empresa" | "autonomo" | "ente_publico" | "asociacion",
        "requisitosEspecificos": ["requisito 1", "requisito 2"]
      }
    ],
    "cuantia": {
      "presupuestoTotal": number,
      "importeMaximoIndividual": number,
      "porcentajeMaximoFinanciacion": number,
      "tipoAyuda": "subvencion" | "prestamo" | "mixta"
    },
    "plazos": {
      "inicioSolicitudes": "ISO date",
      "finSolicitudes": "ISO date",
      "resolucion": "plazo máximo",
      "justificacion": "plazo desde concesión"
    },
    "criteriosValoracion": [
      {
        "criterio": "nombre",
        "puntuacionMaxima": number,
        "descripcion": "string"
      }
    ],
    "documentacionRequerida": [
      {
        "documento": "nombre",
        "obligatorio": boolean,
        "formato": "string"
      }
    ],
    "obligacionesBeneficiario": ["obligación 1", "obligación 2"],
    "incompatibilidades": ["incompatibilidad 1"],
    "recurso": {
      "tipo": "alzada" | "reposicion" | "contencioso",
      "plazo": "string",
      "organo": "string"
    }
  },
  "enlaces": {
    "bdns": "URL",
    "boe": "URL o null",
    "bopa": "URL o null",
    "formularioSolicitud": "URL o null"
  }
}`;

        userPrompt = `Obtener información detallada de la convocatoria BDNS: ${params.convocatoriaId}
Incluir todos los criterios de elegibilidad y documentación requerida.`;
        break;

      case 'sync_expediente':
        systemPrompt = `Eres un sistema de sincronización de expedientes con BDNS.

DATOS A SINCRONIZAR CON BDNS:
1. Código BDNS de la concesión
2. Identificación del beneficiario (NIF/CIF)
3. Importe concedido
4. Fecha de concesión
5. Estado de la subvención
6. Datos de pago y justificación

NORMATIVA:
- Art. 20 Ley 38/2003 General de Subvenciones
- RD 887/2006 Reglamento de la Ley de Subvenciones
- Obligación de publicidad en BDNS en 3 días desde concesión

FORMATO DE RESPUESTA (JSON estricto):
{
  "sincronizacion": {
    "expedienteId": "string",
    "codigoBDNSConvocatoria": "string",
    "codigoBDNSConcesion": "string generado",
    "estado": "pendiente" | "sincronizado" | "error",
    "datosSincronizados": {
      "nifBeneficiario": "string",
      "nombreBeneficiario": "string",
      "importeConcedido": number,
      "fechaConcesion": "ISO date",
      "finalidad": "string",
      "regional": boolean
    },
    "validaciones": [
      {
        "campo": "string",
        "valido": boolean,
        "mensaje": "string"
      }
    ],
    "fechaSincronizacion": "ISO date",
    "proximaSincronizacion": "ISO date"
  },
  "avisos": ["aviso 1", "aviso 2"],
  "errores": []
}`;

        userPrompt = `Sincronizar expediente ${params.expedienteId} con BDNS.
Generar código de concesión BDNS y preparar datos para comunicación.
Fecha límite comunicación: 3 días hábiles desde concesión.`;
        break;

      case 'validate_beneficiario':
        systemPrompt = `Eres un sistema de validación de beneficiarios en BDNS.

VALIDACIONES A REALIZAR:
1. NIF/CIF válido y activo
2. No figura en Base de Datos de Subvenciones como inhabilitado
3. Obligaciones tributarias al corriente
4. Obligaciones con Seguridad Social al corriente
5. No reintegros pendientes de otras subvenciones
6. Límites de minimis no superados (200.000€/3 años)

FUENTES DE VERIFICACIÓN:
- BDNS: Base de Datos Nacional de Subvenciones
- AEAT: Agencia Estatal de Administración Tributaria
- TGSS: Tesorería General de la Seguridad Social
- Registro de Sanciones

FORMATO DE RESPUESTA (JSON estricto):
{
  "validacion": {
    "nif": "string",
    "nombreBeneficiario": "string",
    "fechaValidacion": "ISO date",
    "resultado": "valido" | "invalido" | "con_reservas",
    "checks": [
      {
        "tipo": "nif_activo" | "no_inhabilitado" | "hacienda" | "ss" | "reintegros" | "minimis",
        "estado": "ok" | "ko" | "pendiente" | "no_disponible",
        "detalle": "string",
        "fechaConsulta": "ISO date"
      }
    ],
    "minimis": {
      "importeRecibido3Anos": number,
      "limiteDisponible": number,
      "subvencionesAnteriores": [
        {
          "codigoBDNS": "string",
          "importe": number,
          "fecha": "ISO date",
          "organo": "string"
        }
      ]
    },
    "alertas": ["alerta 1"],
    "documentosRequeridos": ["certificado 1"]
  },
  "recomendacion": "aprobar" | "rechazar" | "solicitar_documentacion",
  "motivoRecomendacion": "string"
}`;

        userPrompt = `Validar beneficiario con NIF: ${params.nif}
Verificar todos los requisitos para recibir subvenciones públicas.
Comprobar especialmente límites de minimis.`;
        break;

      case 'export_bdns':
        systemPrompt = `Eres un sistema de exportación de datos para BDNS.

FORMATOS DE EXPORTACIÓN:
1. XML según esquema BDNS
2. CSV para importación masiva
3. PDF de certificación

DATOS A EXPORTAR:
- Convocatoria origen
- Datos del beneficiario
- Proyecto subvencionado
- Importes (solicitado, concedido, pagado, justificado)
- Fechas clave
- Estado actual

FORMATO DE RESPUESTA (JSON estricto):
{
  "exportacion": {
    "formato": "xml" | "csv" | "pdf",
    "fechaGeneracion": "ISO date",
    "registros": number,
    "contenido": {
      "convocatoria": {
        "codigoBDNS": "string",
        "titulo": "string"
      },
      "concesiones": [
        {
          "codigoConcesion": "string",
          "beneficiario": {
            "nif": "string",
            "nombre": "string",
            "tipo": "string"
          },
          "importeConcedido": number,
          "fechaConcesion": "ISO date",
          "finalidad": "string",
          "obligacionPublicidad": boolean
        }
      ]
    },
    "validacionEsquema": {
      "valido": boolean,
      "errores": []
    },
    "urlDescarga": "string temporal"
  },
  "instrucciones": "pasos para subir a BDNS"
}`;

        userPrompt = `Exportar datos del expediente ${params.expedienteId} para comunicación BDNS.
Formato: XML según esquema oficial BDNS.
Incluir todos los campos obligatorios.`;
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
      console.error('[galia-bdns-sync] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-bdns-sync] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-bdns-sync] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
