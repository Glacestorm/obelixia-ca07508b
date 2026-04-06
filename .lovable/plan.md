

# Plan S2R: Lote Medio — Hardening de 7 funciones HR

## Resumen

Aplicar Auth Gate + Tenant Isolation + Error Sanitization a 7 funciones HR de riesgo medio. Todas comparten el mismo patrón de cambio.

## Estado actual

| Función | Líneas | Auth | DB | company_id source | Error leak |
|---------|--------|------|-----|-------------------|------------|
| erp-hr-talent-intelligence | 289 | No | Sí (service role) | `params.company_id` | L283 |
| erp-hr-esg-selfservice | 385 | No | Sí (service role) | `params.companyId` | L377 |
| erp-hr-training-agent | 301 | No | No (AI-only) | `company_id` body | L295 |
| erp-hr-regulatory-watch | 280 | No | No (AI-only) | `company_id` body | L274 |
| erp-hr-onboarding-agent | 235 | No | No (AI-only) | `company_id` body | L229 |
| erp-hr-talent-skills-agent | 434 | No | No (AI-only) | `company_id` body | L428 |
| hr-compliance-automation | 193 | No | No (AI-only) | `company_id` body | L188 |

## Cambios por función

### Patrón común (insertar tras CORS preflight)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

### Notas por función

1. **erp-hr-talent-intelligence**: Ya importa `createClient`. Ya tiene `supabase` con service role — renombrar a `adminClient` y reusar para membership + operaciones DB.
2. **erp-hr-esg-selfservice**: Ya importa `createClient`. Usa `companyId` (camelCase) de `params`. Ya tiene validación de companyId en L33 — auth gate va antes.
3. **erp-hr-training-agent**: Añadir import `createClient`. Extraer `company_id` del body antes del switch para membership check.
4. **erp-hr-regulatory-watch**: Añadir import `createClient`. Usar `company_id` del body.
5. **erp-hr-onboarding-agent**: Añadir import `createClient`. Usar `company_id` del body.
6. **erp-hr-talent-skills-agent**: Añadir import `createClient`. Usar `company_id` del body.
7. **hr-compliance-automation**: Añadir import `createClient`. Usar `body.company_id`.

### Error sanitization (todas)

Reemplazar `error instanceof Error ? error.message : 'Unknown error'` por `'Internal server error'` en cada catch.

## Archivos modificados

| Archivo | Import | Auth | Membership | Sanitize |
|---------|--------|------|------------|----------|
| `supabase/functions/erp-hr-talent-intelligence/index.ts` | Existente | getClaims | params.company_id | 1 catch |
| `supabase/functions/erp-hr-esg-selfservice/index.ts` | Existente | getClaims | params.companyId | 1 catch |
| `supabase/functions/erp-hr-training-agent/index.ts` | Añadir | getClaims | company_id body | 1 catch |
| `supabase/functions/erp-hr-regulatory-watch/index.ts` | Añadir | getClaims | company_id body | 1 catch |
| `supabase/functions/erp-hr-onboarding-agent/index.ts` | Añadir | getClaims | company_id body | 1 catch |
| `supabase/functions/erp-hr-talent-skills-agent/index.ts` | Añadir | getClaims | company_id body | 1 catch |
| `supabase/functions/hr-compliance-automation/index.ts` | Añadir | getClaims | company_id body | 1 catch |

## Riesgos

- **Bajo**: Frontend usa `supabase.functions.invoke()` que inyecta JWT automáticamente
- **Bajo**: `company_id` ya se envía en todas las invocaciones desde el ERP context
- **Ninguno**: No se cambia lógica de negocio ni contratos de API

