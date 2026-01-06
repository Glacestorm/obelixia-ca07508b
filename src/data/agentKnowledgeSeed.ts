/**
 * Script para inicializar la base de conocimientos de agentes
 * Ejecutar manualmente o en seed
 */

import { supabase } from '@/integrations/supabase/client';

export const AGENT_KNOWLEDGE_SEED = [
  // === SUPERVISOR GENERAL ===
  {
    agent_id: 'supervisor-general',
    agent_type: 'supervisor',
    title: '¿Qué es el Supervisor General?',
    content: `El Supervisor General es el agente de más alto nivel en la arquitectura de agentes ERP. Su función principal es coordinar todos los dominios de agentes, resolver conflictos entre ellos, y optimizar el rendimiento global del sistema.

**Funciones principales:**
- Distribución inteligente de tareas entre dominios
- Monitoreo en tiempo real de todos los agentes
- Análisis predictivo del comportamiento del sistema
- Resolución automática de conflictos entre agentes
- Optimización continua de workflows
- Aprendizaje entre módulos para mejorar eficiencia`,
    category: 'capabilities',
    description: 'Introducción al Supervisor General y sus funciones',
    keywords: ['supervisor', 'coordinación', 'conflictos', 'optimización'],
    tags: ['supervisor', 'core', 'introducción'],
    is_active: true,
    is_verified: true,
    confidence_score: 1.0,
    order_index: 1
  },
  {
    agent_id: 'supervisor-general',
    agent_type: 'supervisor',
    title: 'Ejemplo: Orquestación de cierre fiscal',
    content: `**Escenario:** Es fin de trimestre y necesitas cerrar el período fiscal.

**Cómo el Supervisor ayuda:**
1. Detecta automáticamente que es período de cierre
2. Coordina con el agente Contable para revisar balances
3. Sincroniza con Compliance para verificar normativas
4. Alerta al dominio Financiero sobre discrepancias
5. Genera un informe consolidado

**Resultado:** Proceso de cierre 40% más rápido con menos errores.`,
    category: 'examples',
    description: 'Ejemplo práctico de orquestación en cierre fiscal',
    keywords: ['cierre', 'fiscal', 'trimestre', 'contabilidad'],
    tags: ['ejemplo', 'fiscal', 'contabilidad'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.95,
    order_index: 2
  },
  {
    agent_id: 'supervisor-general',
    agent_type: 'supervisor',
    title: 'Mejores prácticas: Modo Autónomo',
    content: `**¿Cuándo activar el modo autónomo?**
- Cuando tienes alta confianza en la configuración
- Durante operaciones repetitivas bien definidas
- En horarios de baja actividad para optimización

**¿Cuándo usar modo manual?**
- Durante configuración inicial
- Cuando hay cambios importantes en el negocio
- Para auditar decisiones del sistema

**Recomendación:** Comienza en modo manual, observa las sugerencias del Supervisor, y gradualmente activa el modo autónomo para tareas específicas.`,
    category: 'best_practices',
    description: 'Guía para elegir entre modo autónomo y manual',
    keywords: ['autónomo', 'manual', 'configuración', 'modo'],
    tags: ['mejores-prácticas', 'configuración', 'autonomía'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.9,
    order_index: 3
  },
  {
    agent_id: 'supervisor-general',
    agent_type: 'supervisor',
    title: '¿Por qué el Supervisor no responde?',
    content: `**Posibles causas:**
1. **Todos los agentes pausados:** El Supervisor necesita al menos un dominio activo
2. **Sin datos de contexto:** Asegúrate de que hay datos en el sistema
3. **Conflictos sin resolver:** Revisa la pestaña de Insights
4. **Límite de rate:** Espera unos segundos si hay muchas solicitudes

**Solución rápida:**
1. Ve a la pestaña "Dominios"
2. Activa al menos un dominio
3. Haz clic en "Orquestar Todo"`,
    category: 'troubleshooting',
    description: 'Solución a problemas comunes del Supervisor',
    keywords: ['error', 'no-responde', 'pausado', 'problema'],
    tags: ['troubleshooting', 'errores', 'solución'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.85,
    order_index: 4
  },
  {
    agent_id: 'supervisor-general',
    agent_type: 'supervisor',
    title: '¿Cómo interpreto los Insights?',
    content: `**Tipos de Insights:**
- 🎯 **Optimización:** Sugerencias para mejorar rendimiento
- ⚠️ **Advertencia:** Algo requiere atención pronto
- 📊 **Predicción:** Tendencias futuras detectadas
- 💡 **Recomendación:** Acciones sugeridas

**Prioridades:**
- **Crítica (roja):** Acción inmediata requerida
- **Alta (naranja):** Resolver en las próximas horas
- **Media (amarilla):** Revisar cuando sea posible
- **Baja (gris):** Informativo

**Consejo:** Configura alertas para insights críticos y altos.`,
    category: 'faq',
    description: 'Guía para entender los insights del Supervisor',
    keywords: ['insights', 'alertas', 'prioridad', 'advertencia'],
    tags: ['faq', 'insights', 'alertas'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.9,
    order_index: 5
  },

  // === AGENTE CONTABLE (accounting) ===
  {
    agent_id: 'accounting',
    agent_type: 'accounting',
    title: '¿Qué hace el Agente Contable?',
    content: `El Agente Contable es un módulo especializado del dominio Financiero que automatiza y optimiza las operaciones contables diarias.

**Capacidades principales:**
- Clasificación automática de transacciones
- Detección de anomalías contables
- Conciliación inteligente
- Sugerencias de asientos contables
- Análisis de tendencias financieras
- Verificación de cumplimiento con PGC

**Integración:**
Se conecta con el agente de Tesorería, Facturación y Cobros para una visión financiera completa.`,
    category: 'capabilities',
    description: 'Introducción al Agente Contable',
    keywords: ['contable', 'transacciones', 'asientos', 'PGC'],
    tags: ['contabilidad', 'finanzas', 'core'],
    is_active: true,
    is_verified: true,
    confidence_score: 1.0,
    order_index: 1
  },
  {
    agent_id: 'accounting',
    agent_type: 'accounting',
    title: 'Ejemplo: Clasificación automática de gastos',
    content: `**Escenario:** Recibes un extracto bancario con 200 movimientos.

**El agente automáticamente:**
1. Identifica el tipo de cada transacción
2. Propone la cuenta contable apropiada
3. Detecta patrones (ej: pagos recurrentes)
4. Marca transacciones inusuales para revisión
5. Genera los asientos propuestos

**Antes:** 4 horas de trabajo manual
**Después:** 30 minutos de revisión

**Tip:** Entrena al agente marcando correcciones - aprende de tus decisiones.`,
    category: 'examples',
    description: 'Ejemplo de clasificación automática de transacciones',
    keywords: ['clasificación', 'gastos', 'extracto', 'bancario'],
    tags: ['ejemplo', 'automatización', 'banco'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.95,
    order_index: 2
  },

  // === AGENTE CRM/VENTAS (sales) ===
  {
    agent_id: 'sales',
    agent_type: 'sales',
    title: '¿Qué hace el Agente de Ventas?',
    content: `El Agente de Ventas analiza y optimiza el pipeline comercial, proporcionando insights accionables para el equipo de ventas.

**Capacidades:**
- Lead scoring predictivo
- Análisis de probabilidad de cierre
- Recomendaciones de próximos pasos
- Detección de oportunidades de upsell
- Alertas de deals estancados
- Análisis de patrones de éxito

**Métricas clave que monitorea:**
- Tasa de conversión por etapa
- Tiempo promedio en cada fase
- Valor del pipeline por periodo
- Predicción de ingresos`,
    category: 'capabilities',
    description: 'Introducción al Agente de Ventas CRM',
    keywords: ['ventas', 'pipeline', 'leads', 'CRM'],
    tags: ['ventas', 'CRM', 'core'],
    is_active: true,
    is_verified: true,
    confidence_score: 1.0,
    order_index: 1
  },
  {
    agent_id: 'sales',
    agent_type: 'sales',
    title: 'Ejemplo: Predicción de cierre de deal',
    content: `**Escenario:** Tienes un deal de €50,000 en negociación.

**El agente analiza:**
- Historial de interacciones
- Tiempo en la etapa actual
- Patrones de deals similares cerrados
- Señales de engagement

**Resultado:**
"Probabilidad de cierre: 72%
Recomendación: El cliente no ha respondido en 5 días. 
Acción sugerida: Llamar hoy entre 10-11am (su mejor hora de respuesta histórica)."

**Impacto:** +15% en tasa de cierre siguiendo recomendaciones.`,
    category: 'examples',
    description: 'Ejemplo de predicción de cierre con IA',
    keywords: ['predicción', 'cierre', 'deal', 'probabilidad'],
    tags: ['ejemplo', 'predicción', 'ventas'],
    is_active: true,
    is_verified: true,
    confidence_score: 0.92,
    order_index: 2
  },

  // === AGENTE COMPLIANCE ===
  {
    agent_id: 'gdpr',
    agent_type: 'gdpr',
    title: '¿Qué hace el Agente GDPR?',
    content: `El Agente GDPR monitorea y asegura el cumplimiento del Reglamento General de Protección de Datos en todas las operaciones.

**Funciones principales:**
- Auditoría automática de datos personales
- Detección de brechas de privacidad
- Gestión de consentimientos
- Control de retención de datos
- Alertas de incumplimiento
- Generación de informes RGPD

**Integración:**
Escanea todas las tablas con datos personales y valida políticas de acceso.`,
    category: 'capabilities',
    description: 'Introducción al Agente GDPR',
    keywords: ['GDPR', 'RGPD', 'privacidad', 'datos-personales'],
    tags: ['compliance', 'GDPR', 'seguridad'],
    is_active: true,
    is_verified: true,
    confidence_score: 1.0,
    order_index: 1
  }
];

export async function seedAgentKnowledge() {
  try {
    console.log('[AgentKnowledge] Seeding knowledge base...');

    // Primero verificar si ya hay datos
    const { count } = await supabase
      .from('agent_knowledge_base')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log(`[AgentKnowledge] Database already has ${count} entries. Skipping seed.`);
      return { success: true, message: 'Database already seeded' };
    }

    // Insertar todos los registros
    const { data, error } = await supabase
      .from('agent_knowledge_base')
      .insert(AGENT_KNOWLEDGE_SEED as any);

    if (error) throw error;

    console.log(`[AgentKnowledge] Successfully seeded ${AGENT_KNOWLEDGE_SEED.length} entries`);
    return { success: true, count: AGENT_KNOWLEDGE_SEED.length };

  } catch (error) {
    console.error('[AgentKnowledge] Seed error:', error);
    return { success: false, error };
  }
}

export default seedAgentKnowledge;
