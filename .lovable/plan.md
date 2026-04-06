

# Plan S2R: Lote Alto Riesgo — Hardening de 6 funciones HR

## Resumen

Aplicar el patrón estándar de seguridad (Auth Gate + Tenant Isolation + Error Sanitization) a las 6 funciones HR de mayor riesgo, sin cambiar contratos de API ni lógica de negocio.

## Patrón a aplicar (idéntico en las 6)

Insertar al inicio del handler, después del CORS preflight:

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

// Tenant isolation — membership check
const { data: membership } = await adminClient
  .from('erp_user_companies')
  .select('id')
  .eq('user_id', userId)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .maybeSingle();
if (!membership) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

Error sanitization: catch blocks return `'Internal server error'` instead of `error.message`.

## Función 1: erp-hr-accounting-bridge (912 líneas)

**Estado actual**: Sin auth. Service role. `company_id` viene en payload. Error leaks en catch y en funciones internas.

**Cambios**:
- Añadir auth gate + membership check tras CORS, usando `payload.company_id` como tenant ID
- El service role client se mantiene para operaciones internas (inserts en journal entries)
- Se crea un `adminClient` (service role) separado del `userClient` (anon+JWT)
- Sanitizar catch principal (línea 117) y 6 catches internos que exponen `error.message` (líneas 229, 434, 543, 663, 777, 887)

## Función 2: erp-hr-compensation-suite (334 líneas)

**Estado actual**: Sin auth. Service role. `company_id` en `params`. Error leaks.

**Cambios**:
- Añadir auth gate + membership check tras CORS
- Extraer `company_id` de params para validar membership antes del switch
- Para acciones sin `company_id` explícito (`upsert_merit_proposal`, `list_bonus_allocations`), extraerlo del cycle si disponible o requerir en params
- Sanitizar catch (línea 327)

## Función 3: erp-hr-executive-analytics (356 líneas)

**Estado actual**: Sin auth. No usa DB directamente (AI-only). `companyId` en `context`.

**Cambios**:
- Añadir auth gate + membership check usando `context.companyId`
- Requerir `companyId` como campo obligatorio (400 si falta)
- Sanitizar catch (línea 350)

## Función 4: hr-board-pack (297 líneas)

**Estado actual**: Sin auth. Service role. `companyId` validado como presente. Error leaks. Bug latente: `json()` helper en module scope referencia `corsHeaders` de dentro de `serve()`.

**Cambios**:
- Mover `json()` helper dentro de `serve()` para acceder a `corsHeaders` correctamente
- Añadir auth gate + membership check después de la validación de `companyId`
- Sanitizar catch (línea 288)

## Función 5: erp-hr-compliance-enterprise (322 líneas)

**Estado actual**: Sin auth. Service role. `companyId` en request body. Error leaks. `jsonResponse()` helper en module scope tiene el mismo bug que board-pack con `corsHeaders`.

**Cambios**:
- Mover `jsonResponse()` dentro de `serve()` para acceder a `corsHeaders`
- Añadir auth gate + membership check tras CORS
- Sanitizar catch (línea 314)
- La acción `seed_demo` es destructiva (DELETE + INSERT) — el membership check la protege; opcionalmente podría requerir admin role, pero el plan mínimo no lo exige

## Función 6: erp-hr-performance-agent (302 líneas)

**Estado actual**: Sin auth. Usa ANON_KEY (no service role). `company_id` en request body. Error leaks.

**Cambios**:
- Añadir auth gate + membership check tras CORS
- Sanitizar catch (línea 296)
- Nota: ya usa `SUPABASE_ANON_KEY` — esto es compatible; el auth check usa un segundo `userClient` con el JWT del usuario

## Archivos modificados

| Archivo | Auth | Membership | Error Sanitization |
|---------|------|------------|-------------------|
| `supabase/functions/erp-hr-accounting-bridge/index.ts` | getClaims | company_id payload | 7 catches |
| `supabase/functions/erp-hr-compensation-suite/index.ts` | getClaims | params.company_id | 1 catch |
| `supabase/functions/erp-hr-executive-analytics/index.ts` | getClaims | context.companyId | 1 catch |
| `supabase/functions/hr-board-pack/index.ts` | getClaims | companyId body | 1 catch + move json() |
| `supabase/functions/erp-hr-compliance-enterprise/index.ts` | getClaims | companyId body | 1 catch + move jsonResponse() |
| `supabase/functions/erp-hr-performance-agent/index.ts` | getClaims | company_id body | 1 catch |

## Riesgos

- **Bajo**: Todos los frontends ya invocan con `supabase.functions.invoke()` que inyecta el JWT automáticamente
- **Bajo**: El `company_id` ya se pasa en todas las invocaciones desde el frontend (vía ERP context)
- **Medio**: `json()` y `jsonResponse()` helpers necesitan restructuración para el scope de `corsHeaders` — se mueven dentro de `serve()`

## No se modifica

- Lógica de negocio
- Contratos de API
- Uso interno de service role para operaciones de escritura
- Otras funciones fuera del lote

