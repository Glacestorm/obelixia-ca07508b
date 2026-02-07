
# Plan de Implementacion: Sistema de IA Hibrido Universal (Local + Externa)

## Vision General

Implementar un sistema completo de gestion de Inteligencia Artificial que permita trabajar simultaneamente con IA local (Ollama) e IA externa (multiples proveedores), con control granular de privacidad de datos, gestion de creditos y configuracion unificada para CRM y ERP.

---

## Arquitectura del Sistema

```text
+------------------------------------------------------------------+
|                    AI GATEWAY UNIVERSAL                           |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+        +-------------------+               |
|  |   IA LOCAL        |        |   IA EXTERNA      |               |
|  |   (Ollama)        |        |   (Multi-Provider)|               |
|  |                   |        |                   |               |
|  | - Llama 3.x       |        | - OpenAI GPT-5    |               |
|  | - Mistral         |        | - Anthropic Claude|               |
|  | - Phi-3           |        | - Google Gemini   |               |
|  | - CodeLlama       |        | - Mistral AI      |               |
|  | - DeepSeek        |        | - Cohere          |               |
|  +-------------------+        | - Groq            |               |
|           |                   | - Together AI     |               |
|           |                   | - DeepSeek Cloud  |               |
|           v                   | - Lovable AI      |               |
|  +-------------------+        +-------------------+               |
|  |  DATA PRIVACY     |                 |                          |
|  |  GATEWAY          |<----------------+                          |
|  |                   |                                            |
|  | - Clasificacion   |                                            |
|  | - Filtrado        |                                            |
|  | - Anonimizacion   |                                            |
|  +-------------------+                                            |
|           |                                                       |
|           v                                                       |
|  +-------------------+        +-------------------+               |
|  |  CREDITS MANAGER  |        |  USAGE ANALYTICS  |               |
|  |                   |        |                   |               |
|  | - Saldo actual    |        | - Consumo/hora    |               |
|  | - Alertas limite  |        | - Coste/modelo    |               |
|  | - Compra creditos |        | - Historial uso   |               |
|  +-------------------+        +-------------------+               |
+------------------------------------------------------------------+
```

---

## FASE 1: Infraestructura de Base de Datos

### Duracion estimada: 1 sesion

### 1.1 Nuevas Tablas

**ai_providers** - Registro de proveedores de IA disponibles:
- id, name, provider_type (local/external)
- api_endpoint, requires_api_key
- supported_models (JSONB)
- pricing_info (JSONB con coste por token)
- is_active, created_at

**ai_provider_credentials** - Credenciales por empresa/workspace:
- id, company_id (ERP), workspace_id (CRM)
- provider_id, api_key_encrypted
- organization_id (para OpenAI/Anthropic)
- is_default, is_active
- credits_balance, credits_alert_threshold
- last_usage_check, created_at

**ai_data_classification_rules** - Reglas de clasificacion de datos:
- id, company_id, workspace_id
- rule_name, data_category
- classification_level (public/internal/confidential/restricted)
- can_send_external (boolean)
- anonymization_required (boolean)
- field_patterns (JSONB - regex para detectar campos sensibles)
- entity_types (array - tablas/entidades afectadas)

**ai_usage_logs** - Registro de consumo:
- id, provider_id, credential_id
- request_timestamp, model_used
- prompt_tokens, completion_tokens, total_cost
- data_classification_applied
- source_module (crm/erp/admin)
- user_id, success, error_message

**ai_credits_transactions** - Historial de creditos:
- id, credential_id, transaction_type
- amount, balance_after
- payment_reference, invoice_url
- created_at, created_by

**ai_routing_policies** - Politicas de enrutamiento IA:
- id, company_id, workspace_id
- policy_name, priority
- conditions (JSONB - cuando aplicar)
- preferred_provider_id
- fallback_provider_id
- data_classification_override

### 1.2 Enums Necesarios

```sql
CREATE TYPE ai_provider_type AS ENUM ('local', 'external', 'hybrid');
CREATE TYPE ai_data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE ai_credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'adjustment');
```

---

## FASE 2: Sistema de Gestion de Proveedores IA

### Duracion estimada: 1 sesion

### 2.1 Hook useAIProviders

Funcionalidades:
- fetchProviders() - Lista todos los proveedores configurados
- testProviderConnection(providerId) - Verifica conectividad
- getProviderModels(providerId) - Obtiene modelos disponibles
- setDefaultProvider(providerId, scope) - Establece proveedor por defecto
- getProviderPricing(providerId) - Informacion de costes

### 2.2 Proveedores Externos Soportados

| Proveedor | Modelos Principales | Caracteristicas |
|-----------|---------------------|-----------------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5 | Vision, Function Calling, JSON Mode |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku | 200K contexto, Vision |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash | Multimodal, Largo contexto |
| **Mistral AI** | Mistral Large, Mixtral, Mistral 7B | Open weights, EU hosting |
| **Cohere** | Command R+, Command R, Embed | RAG optimizado, Rerank |
| **Groq** | Llama 3.1, Mixtral | Ultra-rapido (inference) |
| **Together AI** | 100+ modelos open source | Fine-tuning, economico |
| **DeepSeek** | DeepSeek V2.5, Coder | Codigo, razonamiento |
| **Lovable AI** | Gemini, GPT-5 (via gateway) | Pre-integrado, sin config |

### 2.3 Edge Function: ai-provider-manager

Acciones:
- list_providers: Lista proveedores disponibles
- validate_credentials: Valida API key con proveedor
- fetch_models: Obtiene modelos del proveedor
- check_credits: Verifica saldo de creditos (OpenAI, Anthropic, etc.)
- get_usage_stats: Estadisticas de uso por proveedor

---

## FASE 3: Sistema de Clasificacion y Privacidad de Datos

### Duracion estimada: 1-2 sesiones

### 3.1 Clasificaciones de Datos

| Nivel | Descripcion | Puede salir al exterior? |
|-------|-------------|--------------------------|
| **Public** | Informacion publica | Si |
| **Internal** | Uso interno general | Si (con precaucion) |
| **Confidential** | Datos sensibles de negocio | Solo con anonimizacion |
| **Restricted** | Datos criticos/regulados | NUNCA |

### 3.2 Campos Automaticamente Clasificados como RESTRICTED

- Numeros de identificacion fiscal (NIF, CIF, NIE)
- Numeros de cuenta bancaria (IBAN)
- Tarjetas de credito
- Contrasenas y tokens
- Datos medicos/salud
- Salarios y datos financieros personales
- Direcciones completas de clientes

### 3.3 Hook useDataPrivacyGateway

Funcionalidades:
- classifyData(data, context) - Clasifica datos automaticamente
- sanitizeForExternal(data, rules) - Limpia datos antes de enviar
- canSendExternal(data, classificationLevel) - Verifica si puede salir
- anonymizeFields(data, fieldsToAnonymize) - Anonimiza campos especificos
- getClassificationRules(companyId) - Obtiene reglas de empresa
- createClassificationRule(rule) - Crea nueva regla

### 3.4 Panel de Configuracion de Privacidad

Componente AIDataPrivacyPanel:
- Lista de reglas activas
- Creacion/edicion de reglas
- Patrones regex para detectar datos sensibles
- Preview de anonimizacion
- Logs de datos bloqueados/anonimizados

---

## FASE 4: Sistema de Creditos y Facturacion

### Duracion estimada: 1 sesion

### 4.1 Hook useAICredits

Funcionalidades:
- getBalance(credentialId) - Saldo actual
- checkLowBalance() - Alertas de saldo bajo
- recordUsage(tokens, cost, providerId) - Registra consumo
- getUsageHistory(dateRange) - Historial de uso
- estimateCost(prompt, model) - Estima coste antes de enviar

### 4.2 Alertas de Creditos

Sistema de notificaciones:
- Alerta amarilla: 20% de creditos restantes
- Alerta roja: 5% de creditos restantes
- Alerta critica: Creditos agotados

Acciones disponibles:
- Cambiar a IA local automaticamente
- Pausar solicitudes no criticas
- Notificar administradores
- Enlace a compra de creditos

### 4.3 Panel de Gestion de Creditos

Componente AICreditsDashboard:
- Saldo actual por proveedor
- Grafico de consumo ultimos 30 dias
- Coste por modelo/tipo de solicitud
- Comparativa coste local vs externo
- Botones de compra/recarga
- Historial de transacciones

### 4.4 Integracion con Proveedores para Compra

Enlaces directos a:
- OpenAI: platform.openai.com/account/billing
- Anthropic: console.anthropic.com/settings/billing
- Google Cloud: console.cloud.google.com/billing
- Otros: URLs de billing correspondientes

---

## FASE 5: Router Inteligente de IA Hibrida

### Duracion estimada: 1-2 sesiones

### 5.1 Edge Function: ai-hybrid-router

Logica de enrutamiento inteligente:

```text
1. Recibe solicitud con contexto
2. Clasifica datos (sensitivos/no sensitivos)
3. Verifica politicas de routing
4. Si datos RESTRICTED -> Solo IA Local
5. Si datos CONFIDENTIAL -> IA Local o Externa con anonimizacion
6. Si datos PUBLIC/INTERNAL -> Segun preferencia usuario
7. Verifica creditos disponibles
8. Ejecuta fallback si necesario
9. Registra uso y metricas
```

### 5.2 Modos de Operacion

| Modo | Descripcion | Uso de Datos |
|------|-------------|--------------|
| **Solo Local** | Unicamente Ollama | Todo local |
| **Solo Externo** | Solo proveedores cloud | Requiere clasificacion |
| **Hibrido Automatico** | Sistema decide segun datos | Optimo |
| **Hibrido Manual** | Usuario elige cada vez | Control total |

### 5.3 Hook useHybridAI

Funcionalidades:
- sendMessage(prompt, options) - Envia con routing automatico
- setRoutingMode(mode) - Cambia modo de operacion
- forceProvider(providerId) - Fuerza proveedor especifico
- getRoutingDecision(prompt, context) - Preview de decision de routing
- switchProvider() - Cambia en mitad de conversacion

---

## FASE 6: Componentes de UI Unificados

### Duracion estimada: 1-2 sesiones

### 6.1 AIUnifiedDashboard

Panel central de gestion IA con tabs:
- **Proveedores**: Lista y configuracion
- **Privacidad**: Reglas de clasificacion
- **Creditos**: Saldos y consumo
- **Routing**: Politicas de enrutamiento
- **Logs**: Historial de solicitudes
- **Configuracion**: Preferencias globales

### 6.2 AIProviderSelector

Componente reutilizable para seleccionar proveedor:
- Dropdown con proveedores disponibles
- Indicador de estado (conectado/offline)
- Badge de creditos restantes
- Indicador de clasificacion de datos actual

### 6.3 AIPrivacyIndicator

Badge visual que muestra:
- Nivel de clasificacion actual
- Si datos salen al exterior
- Proveedor activo (local/externo)
- Alertas de privacidad

### 6.4 AICreditsBadge

Widget compacto mostrando:
- Creditos restantes
- Color segun nivel (verde/amarillo/rojo)
- Click para ver detalle/recargar

---

## FASE 7: Integracion en CRM

### Duracion estimada: 1 sesion

### 7.1 Modificaciones a CRMModularDashboard

Nueva tab "IA Settings" con:
- AIUnifiedDashboard integrado
- Configuracion especifica CRM
- Reglas de privacidad para datos de clientes/leads/deals

### 7.2 Actualizacion de Componentes CRM Existentes

Modificar para usar sistema hibrido:
- CRMVoiceAssistant
- PredictivePipelinePanel
- CRMAgentControlPanel
- useCRMAdvancedAnalytics

### 7.3 Reglas de Privacidad Predefinidas CRM

- Emails de clientes: CONFIDENTIAL
- Telefonos: CONFIDENTIAL
- Valores de deals: INTERNAL
- Notas privadas: RESTRICTED
- Nombres de empresa: PUBLIC

---

## FASE 8: Integracion en ERP

### Duracion estimada: 1 sesion

### 8.1 Modificaciones a ERPModularDashboard

Nueva tab "IA Settings" con configuracion ERP-especifica

### 8.2 Actualizacion de Modulos ERP

Modificar edge functions existentes:
- erp-ai-journal-entries
- erp-financial-forecasting
- erp-hr-ai-agent
- erp-accounting-chatbot
- Todos los agentes autonomos

### 8.3 Reglas de Privacidad Predefinidas ERP

- Datos fiscales: RESTRICTED
- Salarios empleados: RESTRICTED
- Cuentas bancarias: RESTRICTED
- Movimientos contables: CONFIDENTIAL
- Nombres proveedores: INTERNAL
- Catalogos productos: PUBLIC

---

## FASE 9: Sistema de Monitoreo y Analytics

### Duracion estimada: 1 sesion

### 9.1 Edge Function: ai-analytics

Metricas recopiladas:
- Solicitudes por proveedor/hora/dia
- Tokens consumidos
- Costes acumulados
- Latencia promedio
- Tasa de exito/error
- Datos bloqueados por privacidad

### 9.2 Panel de Analytics IA

Visualizaciones:
- Grafico de uso temporal
- Distribucion local vs externo
- Top modelos usados
- Ahorro por uso de IA local
- Incidentes de privacidad

---

## FASE 10: Testing y Optimizacion

### Duracion estimada: 1 sesion

### 10.1 Tests End-to-End

Verificar:
- Conexion a cada proveedor externo
- Fallback automatico funciona
- Clasificacion de datos correcta
- Alertas de creditos se disparan
- Datos RESTRICTED nunca salen

### 10.2 Documentacion

Crear guias para:
- Configuracion inicial
- Anadir nuevo proveedor
- Crear reglas de privacidad
- Gestion de creditos
- Troubleshooting

---

## Resumen de Archivos a Crear

### Base de Datos
- Migration: ai_providers_system.sql

### Hooks
- src/hooks/admin/ai-hybrid/useAIProviders.ts
- src/hooks/admin/ai-hybrid/useDataPrivacyGateway.ts
- src/hooks/admin/ai-hybrid/useAICredits.ts
- src/hooks/admin/ai-hybrid/useHybridAI.ts
- src/hooks/admin/ai-hybrid/useAIAnalytics.ts
- src/hooks/admin/ai-hybrid/index.ts

### Componentes
- src/components/admin/ai-hybrid/AIUnifiedDashboard.tsx
- src/components/admin/ai-hybrid/AIProvidersPanel.tsx
- src/components/admin/ai-hybrid/AIDataPrivacyPanel.tsx
- src/components/admin/ai-hybrid/AICreditsDashboard.tsx
- src/components/admin/ai-hybrid/AIRoutingPoliciesPanel.tsx
- src/components/admin/ai-hybrid/AIUsageAnalyticsPanel.tsx
- src/components/admin/ai-hybrid/AIProviderSelector.tsx
- src/components/admin/ai-hybrid/AIPrivacyIndicator.tsx
- src/components/admin/ai-hybrid/AICreditsBadge.tsx
- src/components/admin/ai-hybrid/index.ts

### Edge Functions
- supabase/functions/ai-provider-manager/index.ts
- supabase/functions/ai-hybrid-router/index.ts
- supabase/functions/ai-data-classifier/index.ts
- supabase/functions/ai-credits-manager/index.ts
- supabase/functions/ai-analytics/index.ts

### Paginas
- src/pages/admin/AIHybridPage.tsx

---

## Mejoras Adicionales Sugeridas

1. **Cache Inteligente**: Almacenar respuestas frecuentes para reducir costes
2. **Batch Processing**: Agrupar solicitudes para optimizar uso de tokens
3. **A/B Testing de Modelos**: Comparar calidad de respuestas entre proveedores
4. **Fine-tuning Local**: Soporte para modelos personalizados en Ollama
5. **Alertas Proactivas**: Notificar antes de superar presupuesto mensual
6. **Modo Offline**: Funcionalidad basica cuando no hay conectividad
7. **Auditoria Compliance**: Logs detallados para GDPR/regulaciones
8. **Multi-idioma**: Routing por idioma (modelos especializados)
