

# Plan: Helper `_shared/tenant-auth.ts` — Auth + Tenant Validation

## Objetivo

Crear un módulo compartido en `supabase/functions/_shared/tenant-auth.ts` que centralice las ~25 líneas de auth gate + membership check repetidas en todas las funciones endurecidas.

## Archivo nuevo

**`supabase/functions/_shared/tenant-auth.ts`**

### Firma del helper

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface TenantAuthResult {
  userId: string;
  companyId: string;
  adminClient: ReturnType<typeof createClient>;
}

export interface TenantAuthError {
  status: 401 | 403;
  body: { error: string };
}

/**
 * Validates JWT and verifies user membership in the given company.
 * Returns TenantAuthResult on success, TenantAuthError on failure.
 */
export async function validateTenantAccess(
  req: Request,
  companyId: string,
): Promise<TenantAuthResult | TenantAuthError>;

/**
 * Validates JWT only (no tenant check).
 * For functions without company_id.
 */
export async function validateAuth(
  req: Request,
): Promise<{ userId: string } | TenantAuthError>;

/** Type guard */
export function isAuthError(
  result: TenantAuthResult | TenantAuthError
): result is TenantAuthError;
```

### Implementacion

- `validateAuth`: extrae Bearer token, crea userClient con anonKey, llama `getClaims(token)`, retorna `userId` o error 401
- `validateTenantAccess`: llama `validateAuth` internamente, luego crea adminClient con serviceKey, consulta `erp_user_companies` con `user_id + company_id + is_active`, retorna resultado o error 403
- `isAuthError`: type guard simple (`'status' in result`)
- `adminClient` se incluye en el resultado para que las funciones con DB lo reusen sin crear otro client

### Ejemplo de uso en una edge function

```typescript
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

// Tras CORS preflight y body parse:
const result = await validateTenantAccess(req, companyId);
if (isAuthError(result)) {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const { userId, adminClient } = result;
// ... lógica de negocio
```

Esto reduce ~25 líneas repetidas a ~5 líneas por función.

## Lo que NO se hace

- No se sustituyen las validaciones existentes en las funciones ya endurecidas (eso será tanda posterior)
- No se cambia ningún contrato funcional
- No se modifican funciones existentes

## Archivos

| Archivo | Acción |
|---------|--------|
| `supabase/functions/_shared/tenant-auth.ts` | Crear (nuevo) |

## Riesgos

- **Ninguno**: fichero nuevo sin dependientes. Las funciones existentes siguen con su código inline hasta migración gradual posterior.

