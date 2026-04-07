/**
 * Tenant Auth Helper — S3
 * Centralizes JWT validation + tenant membership checks for Edge Functions.
 * 
 * Usage:
 *   import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
 *   const result = await validateTenantAccess(req, companyId);
 *   if (isAuthError(result)) return new Response(JSON.stringify(result.body), { status: result.status, headers });
 *   const { userId, adminClient } = result;
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface TenantAuthResult {
  userId: string;
  companyId: string;
  adminClient: ReturnType<typeof createClient>;
}

export interface AuthOnlyResult {
  userId: string;
}

export interface TenantAuthError {
  status: 401 | 403;
  body: { error: string };
}

/**
 * Type guard to distinguish auth errors from successful results.
 */
export function isAuthError(
  result: TenantAuthResult | AuthOnlyResult | TenantAuthError
): result is TenantAuthError {
  return 'status' in result;
}

/**
 * Validates JWT only (no tenant check).
 * Use for functions that don't operate on company-scoped data.
 */
export async function validateAuth(
  req: Request
): Promise<AuthOnlyResult | TenantAuthError> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  return { userId: claimsData.claims.sub as string };
}

/**
 * Validates JWT and verifies active membership in the given company.
 * Returns adminClient (service_role) for downstream DB operations.
 */
export async function validateTenantAccess(
  req: Request,
  companyId: string
): Promise<TenantAuthResult | TenantAuthError> {
  const authResult = await validateAuth(req);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: membership } = await adminClient
    .from('erp_user_companies')
    .select('id')
    .eq('user_id', authResult.userId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) {
    return { status: 403, body: { error: 'Forbidden' } };
  }

  return {
    userId: authResult.userId,
    companyId,
    adminClient,
  };
}
