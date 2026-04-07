

# Plan S2R: Lote Bajo — Hardening de 9 funciones HR

## Resumen

Endurecer las 9 funciones HR restantes con el patrón adecuado según su tipo: auth + membership (con tenant), auth-only (sin tenant), o auth + membership + cuidado con integraciones externas.

## Clasificación

| Función | Líneas | DB | Tenant source | Tipo | Error leak |
|---------|--------|----|---------------|------|------------|
| erp-hr-analytics-agent | 417 | No (AI-only) | `context.companyId` | Auth + Membership | Sí (L411) |
| erp-hr-people-analytics-ai | 192 | No (AI-only) | `companyId` body | Auth + Membership | Sí (L188) |
| erp-hr-recruitment-agent | 365 | Sí (service role) | `companyId` body | Auth + Membership | Sí (L359) |
| hr-analytics-bi | 184 | No (AI-only) | `companyId` body | Auth + Membership | Sí (L178) |
| hr-enterprise-integrations | 327 | No (AI-only) | `companyId` body | Auth + Membership | Sí (L322) |
| hr-country-registry | 338 | Sí (service role) | `companyId` body | Auth + Membership | Sí (L329) |
| erp-hr-innovation-discovery | 310 | Sí (service role) | `company_id` body | Auth + Membership | Sí (L304) |
| erp-hr-industry-templates | 449 | Sí (service role) | `company_id` body | Auth + Membership | Sí (L443) |
| send-hr-alert | 302 | Sí (service role) | `company_id` body | Auth + Membership | No (ya sanitizado) |

Todas tienen `companyId` o `company_id` — todas aplican auth + membership.

## Patrón estándar (insertar tras CORS preflight)

```typescript
// Auth gate
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const token = authHeader.replace('Bearer ', '');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const userId = claimsData.claims.sub;

// Tenant isolation
const adminClient = createClient(supabaseUrl, serviceKey);
const { data: membership } = await adminClient
  .from('erp_user_companies').select('id')
  .eq('user_id', userId).eq('company_id', companyId)
  .eq('is_active', true).maybeSingle();
if (!membership) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

## Cambios por función

### 1. erp-hr-analytics-agent (417 líneas, AI-only)
- Añadir import `createClient`
- Auth gate + membership con `context.companyId` (parsear body, extraer companyId antes del switch)
- Sanitizar catch (L411)

### 2. erp-hr-people-analytics-ai (192 líneas, AI-only)
- Añadir import `createClient`
- Auth gate + membership con `companyId` del body
- Sanitizar catch (L188)

### 3. erp-hr-recruitment-agent (365 líneas, DB + service role)
- Ya importa `createClient`. Renombrar `supabase` existente a `adminClient` y reusar
- Auth gate + membership con `companyId` del body
- Sanitizar catch (L359)

### 4. hr-analytics-bi (184 líneas, AI-only, tiene rate limiter)
- Añadir import `createClient`
- Auth gate + membership con `companyId` del body, **antes** del rate limiter (auth primero)
- Sanitizar catch (L178)

### 5. hr-enterprise-integrations (327 líneas, AI-only, tiene rate limiter)
- Añadir import `createClient`
- Auth gate + membership con `companyId` del body, **antes** del rate limiter
- Sanitizar catch (L322)

### 6. hr-country-registry (338 líneas, DB + service role)
- Ya importa `createClient`. Renombrar `supabase` a `adminClient` y reusar
- Auth gate + membership con `companyId` del body
- **Fix scope bug**: mover `jsonResponse()` helper dentro de `serve()` (mismo bug que board-pack)
- Sanitizar catch (L329)

### 7. erp-hr-innovation-discovery (310 líneas, DB + service role)
- Ya importa `createClient`. Renombrar `supabase` a `adminClient` y reusar
- Auth gate + membership con `company_id` del body
- Sanitizar catch (L304)

### 8. erp-hr-industry-templates (449 líneas, DB + service role)
- Ya importa `createClient`. Renombrar `supabase` a `adminClient` y reusar
- Auth gate + membership con `company_id` del body (puede ser undefined — validar con 400)
- Sanitizar catch (L443)

### 9. send-hr-alert (302 líneas, DB + service role + integraciones externas)
- Ya importa `createClient`. Ya tiene CORS seguro y error sanitizado
- Añadir auth gate + membership con `company_id` del body
- Renombrar `supabase` a `adminClient`
- **No tocar** lógica de Resend/Twilio/WhatsApp — solo añadir gate al inicio
- Error ya sanitizado — sin cambios en catch

## Archivos modificados

| Archivo | Import | Auth | Membership | Error | Extra |
|---------|--------|------|------------|-------|-------|
| `supabase/functions/erp-hr-analytics-agent/index.ts` | Añadir | getClaims | context.companyId | Sanitizar | — |
| `supabase/functions/erp-hr-people-analytics-ai/index.ts` | Añadir | getClaims | companyId body | Sanitizar | — |
| `supabase/functions/erp-hr-recruitment-agent/index.ts` | Existente | getClaims | companyId body | Sanitizar | Rename supabase→adminClient |
| `supabase/functions/hr-analytics-bi/index.ts` | Añadir | getClaims | companyId body | Sanitizar | Auth antes de rate limiter |
| `supabase/functions/hr-enterprise-integrations/index.ts` | Añadir | getClaims | companyId body | Sanitizar | Auth antes de rate limiter |
| `supabase/functions/hr-country-registry/index.ts` | Existente | getClaims | companyId body | Sanitizar | Rename + move jsonResponse() |
| `supabase/functions/erp-hr-innovation-discovery/index.ts` | Existente | getClaims | company_id body | Sanitizar | Rename supabase→adminClient |
| `supabase/functions/erp-hr-industry-templates/index.ts` | Existente | getClaims | company_id body | Sanitizar | Rename supabase→adminClient |
| `supabase/functions/send-hr-alert/index.ts` | Existente | getClaims | company_id body | Ya hecho | Rename supabase→adminClient |

## Riesgos

- **Bajo**: Frontend usa `supabase.functions.invoke()` que inyecta JWT automáticamente
- **Bajo**: `companyId`/`company_id` ya se pasa en todas las invocaciones desde el ERP context
- **Medio**: `hr-country-registry` requiere mover `jsonResponse()` dentro de `serve()` (bug de scope)
- **Ninguno en integraciones**: `send-hr-alert` solo añade gate al inicio; lógica de Resend/Twilio intacta

