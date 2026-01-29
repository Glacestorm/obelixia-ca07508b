
# Plan: Pipeline Personalizable + Agente IA Inteligente

## Estado Actual (Buenas Noticias)

La infraestructura base ya existe:
- Tabla `pipeline_stages` con campos: nombre, orden, probabilidad (auto/manual), color, icono, terminal (won/lost)
- `PipelineStagesManager` con drag-and-drop para reordenar etapas
- Hook `usePipelineStages` con CRUD completo y sincronizacion realtime
- `PipelineBoard` que renderiza columnas dinamicas desde la base de datos

Lo que falta para completar tu vision:
1. Exponer mejor el gestor de etapas (actualmente oculto en un Sheet)
2. Agregar un agente IA especializado en Pipeline
3. Implementar funcionalidades avanzadas 2025-2026

---

## Fase 1: Mejoras UX del Gestor de Etapas (1-2 dias)

**Objetivo**: Hacer mas accesible y potente la configuracion de etapas

| Cambio | Descripcion |
|--------|-------------|
| Acceso directo | Boton prominente "Personalizar Pipeline" visible siempre |
| Preview en vivo | Al editar una etapa, ver como quedara en el Kanban |
| Duplicar etapa | Clonar una etapa existente para crear variaciones rapidas |
| Templates predefinidos | Pipelines pre-configurados (Ventas B2B, Inmobiliaria, SaaS, Servicios) |
| Colores personalizados | Selector de color libre (no solo los 12 predefinidos) |
| Descripcion de etapa | Campo para explicar el proposito de cada fase |

**Archivos a modificar**:
- `src/components/pipeline/PipelineBoard.tsx` - Mejorar visibilidad del boton configurar
- `src/components/pipeline/PipelineStagesManager.tsx` - Agregar nuevas funcionalidades
- `src/hooks/usePipelineStages.ts` - Agregar duplicateStage mutation

---

## Fase 2: Agente IA para Pipeline (3-4 dias)

**Recomendacion**: SI, absolutamente recomendado crear un agente IA especializado

### Por que es estrategicamente valioso:

```text
+------------------+     +-------------------+     +------------------+
|   Datos Pipeline |     |   Agente IA       |     |   Valor Usuario  |
|   - Oportunidades|---->|   Pipeline        |---->|   - Decisiones   |
|   - Historico    |     |   - Analiza       |     |   - Predicciones |
|   - Actividades  |     |   - Predice       |     |   - Automatizac. |
|   - Contactos    |     |   - Sugiere       |     |   - Coaching     |
+------------------+     +-------------------+     +------------------+
```

### Capacidades del Agente:

| Funcion | Descripcion |
|---------|-------------|
| **Prediccion de Cierre** | Probabilidad real basada en historico, no solo etapa |
| **Next Best Action** | "Llama a Juan hoy, lleva 5 dias sin contacto" |
| **Deteccion de Riesgos** | "3 oportunidades en riesgo de perderse esta semana" |
| **Analisis de Patrones** | "Tus deals se pierden 70% en Negociacion - revisa pricing" |
| **Forecast Inteligente** | Proyeccion de ingresos con intervalos de confianza |
| **Coaching Comercial** | Tips personalizados para cada oportunidad |
| **Auto-clasificacion** | Sugerir mover deals basado en actividad detectada |

**Archivos a crear**:
- `supabase/functions/pipeline-ai-agent/index.ts` - Edge function con IA
- `src/hooks/usePipelineAgent.ts` - Hook para el agente
- `src/components/pipeline/PipelineAgentPanel.tsx` - Panel de recomendaciones IA

---

## Fase 3: Funcionalidades Avanzadas (4-5 dias)

### 3.1 Probabilidad Inteligente Hibrida

```text
Modo Actual:        Modo Nuevo (Smart Probability):
+------------+      +--------------------------------+
| Etapa: 60% |      | Base Etapa:        60%        |
+------------+      | + Actividad reciente: +5%     |
                    | + Engagement email:   +3%     |
                    | - Tiempo sin contacto: -8%    |
                    | = Probabilidad Real:  60%     |
                    +--------------------------------+
```

### 3.2 Reglas de Automatizacion por Etapa

| Trigger | Accion |
|---------|--------|
| Deal entra en etapa | Crear tarea automatica |
| Deal lleva X dias en etapa | Notificacion al gestor |
| Deal pasa a "Ganada" | Email automatico al cliente |
| Deal pasa a "Perdida" | Encuesta de motivo + seguimiento |

### 3.3 Metricas Avanzadas por Etapa

- Tiempo promedio en cada etapa
- Tasa de conversion entre etapas
- Valor promedio por etapa
- "Embudo de perdida" (donde se caen los deals)

**Archivos a crear/modificar**:
- `src/components/pipeline/SmartProbabilityIndicator.tsx`
- `src/components/pipeline/StageAutomationRules.tsx`
- `src/components/pipeline/PipelineAnalytics.tsx`

---

## Fase 4: Tendencias Disruptivas 2025-2026+

### 4.1 Voz y Conversacional (Implementar)

| Feature | Descripcion |
|---------|-------------|
| Voice Commands | "Mueve Acme Corp a Negociacion" |
| Dictado de notas | Agregar contexto por voz |
| Resumen hablado | "Dame el estado del pipeline de hoy" |

### 4.2 Pipeline Colaborativo en Tiempo Real

| Feature | Descripcion |
|---------|-------------|
| Cursores compartidos | Ver quien esta viendo cada deal |
| Comentarios en vivo | Chat contextual por oportunidad |
| Notificaciones push | Alertas de cambios en deals asignados |
| "War room" mode | Vista compartida para reuniones de forecast |

### 4.3 Integracion Multicanal Automatica

| Fuente | Accion |
|--------|--------|
| Email recibido | Auto-actualizar "ultima actividad" |
| Llamada telefonica | Registrar automaticamente |
| WhatsApp | Detectar interes y sugerir etapa |
| LinkedIn | Importar engagement social |

### 4.4 Gemelos Digitales de Clientes

Crear un "perfil predictivo" por cada oportunidad:
- Patron de compra similar a clientes historicos
- Sensibilidad al precio estimada
- Mejor momento para cerrar
- Objeciones probables

### 4.5 Gamificacion del Pipeline

| Elemento | Descripcion |
|----------|-------------|
| Leaderboard | Ranking de vendedores por conversion |
| Badges | "Cerrador rapido", "Rey del follow-up" |
| Challenges | "Cierra 3 deals esta semana" con recompensas |
| Streaks | Dias consecutivos moviendo pipeline |

---

## Arquitectura Tecnica Propuesta

```text
+------------------------+
|     Frontend React     |
|  +------------------+  |
|  | PipelineBoard    |  |
|  | (Kanban DnD)     |  |
|  +--------+---------+  |
|           |            |
|  +--------v---------+  |
|  | PipelineAgent    |  |
|  | Panel (IA)       |  |
|  +--------+---------+  |
+-----------|------------+
            |
+-----------|------------+
|     Supabase Backend   |
|  +------------------+  |
|  | pipeline_stages  |  |<-- Etapas personalizables
|  +------------------+  |
|  +------------------+  |
|  | opportunities    |  |<-- Deals
|  +------------------+  |
|  +------------------+  |
|  | pipeline-ai-agent|  |<-- Edge Function IA
|  +------------------+  |
+------------------------+
```

---

## Resumen de Entregables por Fase

| Fase | Tiempo | Entregables Clave |
|------|--------|-------------------|
| **1** | 1-2 dias | UX mejorada para gestor de etapas |
| **2** | 3-4 dias | Agente IA con predicciones y NBA |
| **3** | 4-5 dias | Probabilidad inteligente + automatizaciones |
| **4** | Continuo | Features disruptivos (voz, collab, gamification) |

---

## Seccion Tecnica

### Migracion SQL (Fase 3)

```sql
-- Agregar campo descripcion a etapas
ALTER TABLE pipeline_stages 
ADD COLUMN description TEXT,
ADD COLUMN automation_rules JSONB DEFAULT '[]';

-- Tabla para reglas de automatizacion
CREATE TABLE pipeline_stage_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'on_enter', 'on_exit', 'days_in_stage'
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL, -- 'create_task', 'send_email', 'notify', 'webhook'
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Function pipeline-ai-agent

```typescript
// Acciones soportadas:
- analyze_pipeline: Analisis completo del estado actual
- predict_close: Probabilidad de cierre por deal
- suggest_actions: Next Best Actions personalizadas
- forecast: Proyeccion de ingresos
- detect_risks: Oportunidades en peligro
- coach: Tips de venta por oportunidad
```

### Nuevos Hooks

```typescript
// usePipelineAgent.ts
- analyzeOpportunity(dealId) -> insights
- getPredictions(dealIds) -> probabilidades
- getNextBestActions() -> acciones recomendadas
- getForecast(period) -> proyeccion

// usePipelineAnalytics.ts  
- getConversionRates() -> tasas por etapa
- getAverageTimeInStage() -> tiempos
- getBottlenecks() -> cuellos de botella
```

---

## Proximos Pasos

Aprobar este plan para comenzar con **Fase 1** (mejoras UX del gestor) seguido inmediatamente de **Fase 2** (Agente IA), que es donde esta el mayor valor diferencial.
