
# Plan: Sistema Avanzado de Gestión de Proveedores IA con Auto-diagnóstico e Integración Legal

## Resumen Ejecutivo

Este plan implementa un sistema completo de configuración granular de proveedores IA, auto-diagnóstico de IA local (Ollama), selección inteligente de modelo óptimo basada en coste/seguridad, y una integración profunda con el Agente Jurídico para garantizar el cumplimiento normativo (GDPR/LOPDGDD) en todas las operaciones de IA.

---

## Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    PANEL DE PROVEEDORES IA                          │
│            (Click en proveedor = Configuración completa)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐        ┌─────────────────────────────────┐    │
│  │   IA LOCAL      │        │   IA EXTERNA                    │    │
│  │   (Ollama)      │        │   (Multi-Provider)              │    │
│  │                 │        │                                 │    │
│  │ • URL/IP Config │        │ • OpenAI, Anthropic, Google     │    │
│  │ • Auto-diagnóstico       │ • Mistral, Cohere, DeepSeek    │    │
│  │ • Detección modelos      │ • Lovable AI (preconfigurado)  │    │
│  │ • Test conexión │        │ • API Keys seguras              │    │
│  │ • Benchmarking  │        │                                 │    │
│  └────────┬────────┘        └────────────┬────────────────────┘    │
│           │                              │                          │
│           ▼                              ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │          ROUTER INTELIGENTE (AI Smart Router)               │   │
│  │                                                             │   │
│  │  1. Clasifica datos (Privacy Gateway)                       │   │
│  │  2. Consulta Agente Jurídico si datos sensibles             │   │
│  │  3. Evalúa coste/latencia/capacidad                         │   │
│  │  4. Selecciona modelo óptimo                                │   │
│  │  5. Aplica anonimización si necesario                       │   │
│  │  6. Registra en audit logs (GDPR)                           │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        INTEGRACIÓN AGENTE JURÍDICO                          │   │
│  │                                                             │   │
│  │  • Validación pre-operación                                 │   │
│  │  • Bloqueo automático datos RESTRICTED                      │   │
│  │  • Registro GDPR/LOPDGDD                                    │   │
│  │  • Alertas de incumplimiento                                │   │
│  │  • Consentimiento datos cross-border                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Panel de Configuración Avanzada de Proveedores

### Duración estimada: 1 sesión

### 1.1 Nuevo Componente: AIProviderConfigDialog

Modal de configuración que se abre al hacer clic en cualquier proveedor:

**Para Proveedores Locales (Ollama):**
- Campo URL/IP del servidor (ej: `http://192.168.1.100:11434`)
- Botón "Diagnosticar" para detectar:
  - Conexión activa
  - Modelos instalados (llama3.2, mistral, codellama, etc.)
  - RAM disponible / GPU detectada
  - Velocidad de inferencia (benchmark)
- Lista de modelos detectados con capacidades
- Configuración de timeout y reintentos
- Prioridad vs proveedores externos

**Para Proveedores Externos:**
- Campo API Key (encriptado)
- Organization ID (opcional para OpenAI/Anthropic)
- Selector de modelos disponibles
- Límites de uso (tokens/día, coste máximo)
- Test de conexión con resultado

### 1.2 Campos de Configuración por Proveedor

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `endpoint_url` | TEXT | URL/IP del servidor |
| `api_key` | ENCRYPTED | Clave API (si aplica) |
| `organization_id` | TEXT | ID organización (OpenAI) |
| `max_tokens_per_request` | INT | Límite por solicitud |
| `max_cost_per_day` | DECIMAL | Coste máximo diario |
| `timeout_seconds` | INT | Timeout de conexión |
| `retry_attempts` | INT | Reintentos en fallo |
| `priority` | INT | Prioridad de selección |
| `enabled_models` | JSONB | Modelos activos |
| `benchmark_scores` | JSONB | Resultados benchmark |

---

## FASE 2: Sistema de Auto-diagnóstico de IA Local

### Duración estimada: 1 sesión

### 2.1 Edge Function: ai-local-diagnostics

Acciones implementadas:

```text
discover_endpoint:
  - Intenta conectar a URL proporcionada
  - Detecta versión de Ollama
  - Lista modelos instalados

benchmark_model:
  - Ejecuta prompt de prueba estándar
  - Mide tiempo de primera respuesta (TTFT)
  - Mide tokens/segundo
  - Evalúa calidad de respuesta

health_check:
  - Verifica disponibilidad
  - Comprueba memoria disponible
  - Detecta GPU/CUDA
  - Estado de cola de solicitudes

auto_install_model:
  - Descarga modelo recomendado
  - Configura parámetros óptimos
  - Reporta progreso
```

### 2.2 Hook: useLocalAIDiagnostics

Funcionalidades:
- `discoverEndpoint(url)` - Descubre servidor Ollama
- `listAvailableModels()` - Lista modelos instalados
- `benchmarkModel(modelId)` - Ejecuta benchmark
- `getSystemCapabilities()` - GPU/RAM disponible
- `installRecommendedModels()` - Instala modelos sugeridos
- `monitorHealth()` - Monitoreo en tiempo real

### 2.3 Modelos Recomendados por Caso de Uso

| Caso de Uso | Modelo Recomendado | RAM Mínima |
|-------------|-------------------|------------|
| Chat general | llama3.2:8b | 8GB |
| Análisis largo | llama3.2:70b | 48GB |
| Código | codellama:13b | 16GB |
| Español | mistral:7b | 8GB |
| Razonamiento | deepseek-r1:14b | 16GB |
| Multimodal | llava:13b | 16GB |

---

## FASE 3: Router Inteligente con Selección Óptima

### Duración estimada: 1-2 sesiones

### 3.1 Algoritmo de Selección de Modelo

```text
ENTRADA: Solicitud con datos y contexto

PASO 1: Clasificar datos (Privacy Gateway)
  → nivel: public | internal | confidential | restricted

PASO 2: Si nivel >= confidential:
  → Consultar Agente Jurídico
  → Obtener validación legal
  → Si BLOQUEADO → Retornar error con razón legal

PASO 3: Evaluar proveedores disponibles
  Para cada proveedor activo:
    - score_seguridad = calcular_seguridad(proveedor, nivel_datos)
    - score_coste = calcular_coste_estimado(proveedor, tokens)
    - score_latencia = obtener_latencia_promedio(proveedor)
    - score_capacidad = evaluar_capacidad_modelo(proveedor, tarea)
    - score_total = (seguridad * 0.4) + (coste * 0.3) + 
                    (latencia * 0.15) + (capacidad * 0.15)

PASO 4: Ordenar por score_total (desc)
  → Seleccionar mejor proveedor
  → Si falla, usar fallback

PASO 5: Si proveedor externo y datos sensibles:
  → Anonimizar campos según reglas
  → Registrar en audit log

PASO 6: Ejecutar solicitud
  → Registrar métricas (tokens, coste, latencia)
  → Notificar si créditos bajos
```

### 3.2 Ponderación de Factores

| Factor | Peso | Descripción |
|--------|------|-------------|
| **Seguridad** | 40% | Prioridad máxima, datos locales si sensibles |
| **Coste** | 30% | Optimizar gasto, preferir local si disponible |
| **Latencia** | 15% | Tiempo de respuesta aceptable |
| **Capacidad** | 15% | Calidad del modelo para la tarea |

### 3.3 Actualización Edge Function: ai-hybrid-router

Nuevas acciones:
- `optimal_route` - Calcula ruta óptima con scoring
- `validate_with_legal` - Consulta Agente Jurídico
- `estimate_cost` - Estima coste antes de ejecutar
- `get_provider_stats` - Estadísticas por proveedor

---

## FASE 4: Integración Profunda con Agente Jurídico

### Duración estimada: 1-2 sesiones

### 4.1 Nuevo Hook: useAILegalCompliance

Integra el sistema híbrido con el agente jurídico existente:

```typescript
interface AILegalValidation {
  isAllowed: boolean;
  requiresConsent: boolean;
  consentType: 'explicit' | 'implicit' | 'none';
  legalBasis: string[];
  applicableRegulations: string[];
  warnings: string[];
  blockingIssues: string[];
  dataRetentionPeriod: string;
  crossBorderAllowed: boolean;
  crossBorderConditions: string[];
}

// Funciones principales
validateAIOperation(operation, data, context): AILegalValidation
requestDataConsent(userId, dataTypes): ConsentRecord
logGDPREvent(event): AuditEntry
getDataSubjectRights(userId): DataRights
executeRightToErasure(userId): ErasureResult
```

### 4.2 Flujo de Validación Legal

```text
┌─────────────────────────────────────────┐
│        Solicitud IA entrante            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Clasificar datos (Privacy Gateway)    │
│   → public/internal/confidential/restricted
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │ ¿Datos confidenciales   │
    │ o restringidos?         │
    └────────────┬────────────┘
         SÍ │          │ NO
            ▼          ▼
┌───────────────────┐  ┌───────────────────┐
│ Consultar Agente  │  │ Proceder con      │
│ Jurídico          │  │ selección normal  │
└─────────┬─────────┘  └───────────────────┘
          │
          ▼
┌───────────────────────────────────────────┐
│ Validación Legal (legal-ai-advisor)       │
│                                           │
│ Checks:                                   │
│ • Base legal para procesamiento           │
│ • Consentimiento requerido                │
│ • Transferencia cross-border              │
│ • Regulaciones aplicables (GDPR/LOPDGDD)  │
│ • Periodo de retención                    │
└─────────┬─────────────────────────────────┘
          │
    ┌─────┴─────┐
    │ ¿Aprobado?│
    └─────┬─────┘
      SÍ │     │ NO
         ▼     ▼
┌──────────┐  ┌──────────────────────────┐
│ Continuar │  │ BLOQUEAR operación       │
│ con IA    │  │ → Registrar incidente    │
│ local     │  │ → Notificar administrador│
└──────────┘  └──────────────────────────┘
```

### 4.3 Reglas de Cumplimiento Predefinidas

| Regulación | Aplicación | Acción |
|------------|------------|--------|
| **GDPR Art. 6** | Datos personales UE | Requerir base legal |
| **GDPR Art. 9** | Datos sensibles | Bloqueo por defecto |
| **GDPR Art. 44-49** | Transferencia fuera UE | Consentimiento explícito |
| **LOPDGDD Art. 7** | Datos menores España | Bloqueo sin consentimiento parental |
| **LOPDGDD Art. 89** | Datos de empleados | Solo IA local |
| **Ley Andorra 29/2021** | Datos Andorra | Restricción cross-border |

---

## FASE 5: Componentes UI Avanzados

### Duración estimada: 1-2 sesiones

### 5.1 AIProviderConfigDialog

Diálogo modal completo con tabs:

**Tab 1: Conexión**
- URL/IP del servidor
- Test de conexión con resultados
- Estado en tiempo real

**Tab 2: Modelos**
- Lista de modelos disponibles
- Capacidades de cada modelo
- Selección de modelos activos
- Benchmark individual

**Tab 3: Seguridad**
- Nivel de confianza del proveedor
- Tipos de datos permitidos
- Integración con reglas de privacidad

**Tab 4: Límites**
- Tokens máximos por solicitud
- Coste máximo diario
- Alertas de consumo

**Tab 5: Diagnóstico (solo local)**
- Estado del servidor
- Memoria disponible
- GPU detectada
- Historial de rendimiento

### 5.2 AISmartRouterPanel

Panel de visualización del router:

- Gráfico de decisiones de routing en tiempo real
- Distribución local vs externo
- Ahorros por uso de IA local
- Incidentes de seguridad bloqueados
- Métricas de latencia por proveedor

### 5.3 AILegalComplianceIndicator

Badge de cumplimiento legal:

- Estado de validación legal
- Regulaciones aplicables
- Alertas de incumplimiento
- Historial de validaciones

---

## FASE 6: Migración de Base de Datos

### Duración estimada: 1 sesión

### 6.1 Nuevas Columnas en ai_hybrid_providers

```sql
ALTER TABLE public.ai_hybrid_providers ADD COLUMN IF NOT EXISTS
  endpoint_url TEXT,
  connection_timeout_ms INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 3,
  benchmark_results JSONB DEFAULT '{}',
  last_benchmark_at TIMESTAMPTZ,
  detected_capabilities JSONB DEFAULT '[]',
  trust_level TEXT DEFAULT 'standard' 
    CHECK (trust_level IN ('untrusted', 'standard', 'trusted', 'verified')),
  allowed_data_levels TEXT[] DEFAULT ARRAY['public', 'internal'],
  max_tokens_per_request INTEGER DEFAULT 4096,
  max_daily_cost NUMERIC(10,4) DEFAULT 100,
  current_daily_cost NUMERIC(10,4) DEFAULT 0,
  daily_cost_reset_at TIMESTAMPTZ;
```

### 6.2 Nueva Tabla: ai_legal_validations

```sql
CREATE TABLE public.ai_legal_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL,
  data_classification TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL,
  legal_basis TEXT[],
  applicable_regulations TEXT[],
  warnings TEXT[],
  blocking_issues TEXT[],
  requires_consent BOOLEAN DEFAULT false,
  consent_type TEXT,
  cross_border_transfer BOOLEAN DEFAULT false,
  destination_countries TEXT[],
  data_retention_days INTEGER,
  validated_by TEXT DEFAULT 'legal-ai-advisor',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 Nueva Tabla: ai_provider_benchmarks

```sql
CREATE TABLE public.ai_provider_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.ai_hybrid_providers(id),
  model_id TEXT NOT NULL,
  benchmark_type TEXT NOT NULL,
  tokens_per_second NUMERIC(10,2),
  time_to_first_token_ms INTEGER,
  total_time_ms INTEGER,
  quality_score NUMERIC(5,2),
  memory_used_mb INTEGER,
  gpu_used BOOLEAN DEFAULT false,
  test_prompt_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## FASE 7: Edge Functions Actualizadas

### Duración estimada: 1-2 sesiones

### 7.1 Nueva Edge Function: ai-local-diagnostics

```text
Acciones:
- discover: Conectar y detectar servidor Ollama
- list_models: Listar modelos instalados
- benchmark: Ejecutar benchmark de modelo
- health_check: Verificar estado del servidor
- get_capabilities: Obtener capacidades del sistema
- pull_model: Descargar modelo (con progreso)
```

### 7.2 Nueva Edge Function: ai-legal-validator

```text
Acciones:
- validate_operation: Validar operación con Agente Jurídico
- check_consent: Verificar consentimientos
- log_gdpr_event: Registrar evento GDPR
- get_applicable_regulations: Obtener regulaciones aplicables
- request_consent: Solicitar consentimiento
```

### 7.3 Actualización: ai-hybrid-router

Nuevas capacidades:
- Scoring multi-factor para selección
- Consulta automática a legal-ai-advisor
- Bloqueo preventivo de datos sensibles
- Registro detallado para auditoría

---

## FASE 8: Testing y Optimización

### Duración estimada: 1 sesión

### 8.1 Tests End-to-End

- Configuración de proveedor local desde UI
- Auto-diagnóstico detecta modelos correctamente
- Router selecciona proveedor óptimo
- Datos RESTRICTED nunca salen al exterior
- Integración con Agente Jurídico funciona
- Audit logs registran todas las operaciones

### 8.2 Métricas de Rendimiento

- Latencia de routing < 50ms
- Precisión de clasificación > 99%
- Tasa de bloqueo correcto: 100% para RESTRICTED
- Disponibilidad del sistema > 99.9%

---

## Archivos a Crear/Modificar

### Base de Datos
| Archivo | Acción |
|---------|--------|
| `migrations/ai_advanced_providers.sql` | Crear |

### Edge Functions
| Archivo | Acción |
|---------|--------|
| `supabase/functions/ai-local-diagnostics/index.ts` | Crear |
| `supabase/functions/ai-legal-validator/index.ts` | Crear |
| `supabase/functions/ai-hybrid-router/index.ts` | Modificar |

### Hooks
| Archivo | Acción |
|---------|--------|
| `src/hooks/admin/ai-hybrid/useLocalAIDiagnostics.ts` | Crear |
| `src/hooks/admin/ai-hybrid/useAILegalCompliance.ts` | Crear |
| `src/hooks/admin/ai-hybrid/useAISmartRouter.ts` | Crear |
| `src/hooks/admin/ai-hybrid/useAIProviders.ts` | Modificar |
| `src/hooks/admin/ai-hybrid/index.ts` | Modificar |

### Componentes
| Archivo | Acción |
|---------|--------|
| `src/components/admin/ai-hybrid/AIProviderConfigDialog.tsx` | Crear |
| `src/components/admin/ai-hybrid/AILocalDiagnosticsPanel.tsx` | Crear |
| `src/components/admin/ai-hybrid/AISmartRouterPanel.tsx` | Crear |
| `src/components/admin/ai-hybrid/AILegalComplianceIndicator.tsx` | Crear |
| `src/components/admin/ai-hybrid/AIProvidersPanel.tsx` | Modificar |
| `src/components/admin/ai-hybrid/index.ts` | Modificar |

---

## Beneficios del Sistema

1. **Seguridad Máxima**: Datos sensibles nunca salen de la infraestructura local
2. **Cumplimiento Legal**: Integración con Agente Jurídico garantiza GDPR/LOPDGDD
3. **Optimización de Costes**: Selección inteligente prioriza IA local cuando disponible
4. **Transparencia**: Audit logs completos para inspección regulatoria
5. **Flexibilidad**: Soporte para múltiples proveedores simultáneos
6. **Resiliencia**: Fallback automático entre proveedores
7. **Escalabilidad**: Añadir nuevos proveedores sin cambios de código
