

# S4.0 — Auth Hardening: legal-ai-advisor

## Análisis del estado actual

**Flujo actual**: La función crea un `service_role` client directamente (línea 164-165), sin validar JWT ni verificar membership. Cualquier request con el anon key puede invocarla.

**Uso de company context**: La mayoría de invocaciones pasan `context.companyId` (dashboard stats, compliance, risk, documents, bulletins, etc.). La acción `consult_legal` también lo recibe. Solo las llamadas inter-agente (`requesting_agent`) pueden no tenerlo.

**Operaciones DB**: 
- Lecturas: `legal_jurisdictions`, `legal_knowledge_base`, `legal_compliance_checks`, `legal_documents`, `agent_help_conversations` — tablas de catálogo/consulta sin RLS tenant
- Escrituras: `legal_advisor_faq` (INSERT/UPDATE con `company_id`), `legal_agent_queries` (INSERT), `legal_validation_logs` (INSERT) — logs y FAQ

**Riesgo actual**: ALTO — sin auth, cualquier usuario anónimo puede invocar la IA y escribir en tablas de logs/FAQ.

## Patrón elegido: Auth-only + company context opcional

No se puede hacer `validateTenantAccess` obligatorio porque:
1. Las tablas legales consultadas no tienen RLS por company_id (son catálogos)
2. Las llamadas inter-agente (desde otras edge functions) no tienen JWT de usuario

**Patrón mínimo seguro**:
- Validar JWT obligatorio via `validateAuth()` del helper existente
- Si `context.companyId` presente, validar membership via `validateTenantAccess()`
- Si es llamada inter-agente (sin JWT), exigir header `X-Internal-Secret` = `SUPABASE_SERVICE_ROLE_KEY`
- Sanitizar errores en el catch final (no exponer mensajes internos)

## Cambios propuestos

### 1. Auth gate al inicio de la función (después de CORS, antes de lógica)

```text
ANTES (líneas 157-165):
  const LOVABLE_API_KEY = ...
  const supabase = createClient(url, SERVICE_ROLE_KEY)
  const requestData = await req.json()

DESPUÉS:
  const requestData = await req.json()
  
  // Dual-path auth: JWT para usuarios, X-Internal-Secret para inter-agente
  const isInternalCall = !!requestData.requesting_agent
  
  if (isInternalCall) {
    const internalSecret = req.headers.get('X-Internal-Secret')
    if (internalSecret !== SERVICE_ROLE_KEY) → 401
  } else {
    const authResult = await validateAuth(req)
    if (isAuthError(authResult)) → return 401/403
    // Si tiene companyId, validar membership
    if (requestData.context?.companyId) {
      const tenantResult = await validateTenantAccess(req, companyId)
      if (isAuthError(tenantResult)) → return 403
    }
  }
  
  // service_role client solo después de auth
  const supabase = createClient(url, SERVICE_ROLE_KEY)
```

### 2. Sanitización de errores (catch final, líneas 828-837)

```text
ANTES:
  error: error instanceof Error ? error.message : 'Unknown error'

DESPUÉS:
  error: 'Internal server error'
  // Log completo solo en console.error
```

### 3. No tocar nada más

- No cambiar contrato API (mismos campos request/response)
- No cambiar lógica de prompts, IA, o DB queries
- No migrar a dual-client (eso es Fase 2 de S4)
- service_role sigue usándose para DB ops (necesario por tablas sin RLS tenant)

## Impacto esperado

| Antes | Después |
|-------|---------|
| Sin auth — abierta al público | JWT obligatorio para usuarios |
| Inter-agente sin validar | Secret header requerido |
| Errores exponen internals | Errores sanitizados |
| company_id sin validar | Membership check si presente |

## Riesgos

- **Bajo**: Las funciones que llaman inter-agente (legal-multiagent-supervisor, etc.) deberán pasar `X-Internal-Secret` — pero usan `service_role` y pueden leer la key del env
- **Ninguno en frontend**: `supabase.functions.invoke()` envía JWT automáticamente
- **Residual**: service_role sigue bypasseando RLS — se abordará en Fase 2 (dual-client)

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/legal-ai-advisor/index.ts` | Auth gate + error sanitization |

0 archivos frontend. 0 migraciones SQL.

