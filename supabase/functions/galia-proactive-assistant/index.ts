/**
 * GALIA Proactive Assistant
 * Sistema de notificaciones proactivas: plazos, documentos faltantes, cambios normativos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProactiveRequest {
  action: 'check_deadlines' | 'check_missing_docs' | 'check_regulatory_changes' | 'get_alerts' | 'generate_digest';
  user_id?: string;
  expediente_id?: string;
  role?: 'ciudadano' | 'tecnico' | 'gestor';
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

    const { action, user_id, expediente_id, role = 'ciudadano' } = await req.json() as ProactiveRequest;

    console.log(`[galia-proactive-assistant] Action: ${action}, User: ${user_id}, Role: ${role}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'check_deadlines':
        systemPrompt = `Eres un sistema de alertas de plazos para expedientes LEADER.

TIPOS DE PLAZOS A MONITOREAR:
1. Plazos de presentación de solicitudes
2. Plazos de subsanación (10 días hábiles)
3. Plazos de justificación de gastos
4. Plazos de recurso (1 mes ordinario, 2 meses contencioso)
5. Hitos de ejecución del proyecto
6. Vencimientos de garantías bancarias
7. Fechas límite de auditoría

PRIORIDADES:
- CRÍTICO: Vence en < 3 días
- ALTO: Vence en 3-7 días
- MEDIO: Vence en 7-15 días
- BAJO: Vence en > 15 días

FORMATO DE RESPUESTA (JSON estricto):
{
  "deadlines": [
    {
      "id": "string",
      "expedienteId": "string",
      "tipo": "tipo de plazo",
      "descripcion": "descripción del plazo",
      "fechaVencimiento": "ISO date",
      "diasRestantes": number,
      "prioridad": "critico" | "alto" | "medio" | "bajo",
      "accionRequerida": "qué hacer",
      "consecuencias": "qué pasa si no se cumple"
    }
  ],
  "resumen": {
    "totalPlazos": number,
    "criticos": number,
    "proximos7Dias": number
  },
  "recomendaciones": ["recomendación 1", "recomendación 2"]
}`;

        userPrompt = `Analiza los plazos pendientes para ${role === 'ciudadano' ? 'el beneficiario' : 'el técnico'}.
${expediente_id ? `Expediente específico: ${expediente_id}` : 'Todos los expedientes activos'}
Fecha actual: ${new Date().toISOString()}`;
        break;

      case 'check_missing_docs':
        systemPrompt = `Eres un sistema de detección de documentación faltante en expedientes LEADER.

DOCUMENTOS TÍPICOS REQUERIDOS:
1. Solicitud firmada
2. DNI/NIF del representante
3. Escrituras/Estatutos
4. Memoria del proyecto
5. Presupuesto detallado
6. Plan de viabilidad
7. Tres ofertas comparativas (>18.000€)
8. Licencias y permisos
9. Certificados de estar al corriente (Hacienda, SS)
10. Declaración responsable
11. Facturas y justificantes de pago
12. Memoria justificativa

FORMATO DE RESPUESTA (JSON estricto):
{
  "documentosFaltantes": [
    {
      "expedienteId": "string",
      "documento": "nombre del documento",
      "categoria": "solicitud" | "identificacion" | "proyecto" | "justificacion",
      "obligatorio": boolean,
      "fechaLimite": "ISO date o null",
      "instrucciones": "cómo obtener/presentar",
      "plantillaDisponible": boolean
    }
  ],
  "expedientesIncompletos": [
    {
      "id": "string",
      "titulo": "string",
      "porcentajeCompletado": number,
      "documentosPendientes": number
    }
  ],
  "alertas": ["alerta importante"]
}`;

        userPrompt = `Detecta documentación faltante para ${expediente_id ? `expediente ${expediente_id}` : 'todos los expedientes activos'}.
Rol del usuario: ${role}
Priorizar documentos obligatorios y con fecha límite próxima.`;
        break;

      case 'check_regulatory_changes':
        systemPrompt = `Eres un sistema de monitoreo de cambios normativos que afectan a subvenciones LEADER/FEDER.

FUENTES NORMATIVAS:
1. BOE - Boletín Oficial del Estado
2. BOPA - Boletín del Principado de Asturias
3. DOUE - Diario Oficial de la Unión Europea
4. Circulares del organismo intermedio
5. Instrucciones de la autoridad de gestión

TIPOS DE CAMBIOS:
1. Nuevas convocatorias
2. Modificaciones de bases reguladoras
3. Cambios en criterios de elegibilidad
4. Actualizaciones de costes de referencia
5. Nuevos requisitos documentales
6. Cambios en plazos
7. Correcciones de errores

FORMATO DE RESPUESTA (JSON estricto):
{
  "cambiosNormativos": [
    {
      "id": "string",
      "tipo": "convocatoria" | "modificacion" | "circular" | "correccion",
      "titulo": "título del cambio",
      "fuente": "BOE" | "BOPA" | "DOUE" | "interno",
      "fechaPublicacion": "ISO date",
      "fechaEfectiva": "ISO date",
      "resumen": "resumen del cambio",
      "impacto": "alto" | "medio" | "bajo",
      "expedientesAfectados": number,
      "accionesRequeridas": ["acción 1", "acción 2"],
      "enlace": "URL o null"
    }
  ],
  "resumen": {
    "totalCambios": number,
    "altoImpacto": number,
    "ultimaActualizacion": "ISO date"
  }
}`;

        userPrompt = `Detectar cambios normativos recientes que afecten a expedientes LEADER.
Período de análisis: últimos 30 días
Fecha actual: ${new Date().toISOString()}
Priorizar cambios con impacto alto.`;
        break;

      case 'get_alerts':
        systemPrompt = `Eres un sistema de alertas consolidadas para GALIA.

TIPOS DE ALERTAS:
1. Plazos próximos a vencer
2. Documentación faltante crítica
3. Cambios normativos importantes
4. Anomalías detectadas en costes
5. Expedientes sin actividad prolongada
6. Pre-aprobaciones pendientes de confirmar

FORMATO DE RESPUESTA (JSON estricto):
{
  "alertas": [
    {
      "id": "string",
      "tipo": "plazo" | "documento" | "normativa" | "anomalia" | "inactividad" | "pre_aprobacion",
      "prioridad": "critica" | "alta" | "media" | "baja",
      "titulo": "título de la alerta",
      "mensaje": "descripción detallada",
      "expedienteId": "string o null",
      "fechaCreacion": "ISO date",
      "fechaExpiracion": "ISO date o null",
      "accion": {
        "tipo": "ver_expediente" | "subir_documento" | "revisar_cambio" | "confirmar",
        "label": "texto del botón",
        "url": "ruta interna"
      },
      "leida": boolean
    }
  ],
  "contadores": {
    "total": number,
    "noLeidas": number,
    "criticas": number,
    "altas": number
  },
  "ultimaActualizacion": "ISO date"
}`;

        userPrompt = `Obtener todas las alertas activas para ${role}.
Usuario: ${user_id || 'todos'}
${expediente_id ? `Filtrar por expediente: ${expediente_id}` : ''}
Ordenar por prioridad y fecha.`;
        break;

      case 'generate_digest':
        systemPrompt = `Eres un sistema de generación de resúmenes diarios para GALIA.

CONTENIDO DEL DIGEST:
1. Resumen de plazos próximos
2. Documentos pendientes de revisión
3. Novedades normativas
4. Estado de expedientes en trámite
5. Acciones recomendadas para hoy
6. Métricas de rendimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "digest": {
    "fecha": "ISO date",
    "destinatario": "nombre o rol",
    "resumenEjecutivo": "párrafo de resumen",
    "seccionPlazos": {
      "titulo": "Plazos Próximos",
      "items": [{"texto": "string", "urgente": boolean}],
      "total": number
    },
    "seccionDocumentos": {
      "titulo": "Documentos Pendientes",
      "items": [{"texto": "string", "expediente": "string"}],
      "total": number
    },
    "seccionNormativa": {
      "titulo": "Novedades Normativas",
      "items": [{"texto": "string", "impacto": "string"}],
      "total": number
    },
    "accionesRecomendadas": [
      {
        "prioridad": number,
        "accion": "descripción",
        "motivo": "por qué es importante"
      }
    ],
    "metricas": {
      "expedientesActivos": number,
      "pendientesValidacion": number,
      "proximosVencimientos": number
    }
  },
  "canalesEnvio": ["email", "push", "dashboard"]
}`;

        userPrompt = `Generar digest diario para ${role}.
Usuario: ${user_id || 'general'}
Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Incluir solo información relevante para el rol.`;
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
        temperature: 0.5,
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
      console.error('[galia-proactive-assistant] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-proactive-assistant] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-proactive-assistant] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
