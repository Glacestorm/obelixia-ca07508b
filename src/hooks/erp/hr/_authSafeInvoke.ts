/**
 * Auth-safe edge function invoker for Registry/Runtime/Mapping UIs.
 *
 * Hard rules:
 *  - NEVER disables JWT verification.
 *  - NEVER uses service_role.
 *  - If there is no active Supabase session, it does NOT call the edge
 *    function — it returns a structured `auth_required` result so the UI
 *    can render an "auth required" state instead of throwing.
 *  - 401/403 responses are mapped to friendly error codes and never
 *    rethrown as React runtime errors.
 */
import { supabase } from '@/integrations/supabase/client';

export type AuthSafeInvokeResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      skipped?: true;
      reason?: 'auth_required' | 'unauthorized' | 'forbidden' | 'edge_error';
      error: { code: string; message: string };
    };

const AUTH_REQUIRED: AuthSafeInvokeResult<never> = {
  success: false,
  skipped: true,
  reason: 'auth_required',
  error: {
    code: 'AUTH_REQUIRED',
    message: 'Requiere sesión autenticada para usar esta acción.',
  },
};

async function getAccessToken(forceRefresh: boolean): Promise<string | null> {
  if (forceRefresh) {
    try {
      await supabase.auth.refreshSession();
    } catch {
      // ignore — fall through to getSession
    }
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

function isUnauthorizedShape(
  edgeError: { message?: string } | null,
  resp: { error?: { code?: string; message?: string }; success?: boolean } | null,
): boolean {
  if (resp?.error?.code === 'UNAUTHORIZED') return true;
  const msg = `${edgeError?.message ?? ''} ${resp?.error?.message ?? ''}`.toLowerCase();
  return /invalid token|unauthorized|jwt/.test(msg);
}

function isForbiddenShape(resp: { error?: { code?: string } } | null): boolean {
  return resp?.error?.code === 'FORBIDDEN';
}

/**
 * Invoke an edge function with explicit Bearer auth and graceful degradation.
 * If no session: skips the call and returns `auth_required`.
 * If 401: tries one session refresh and retries once.
 */
export async function authSafeInvoke<T = unknown>(
  fnName: string,
  body: Record<string, unknown>,
): Promise<AuthSafeInvokeResult<T>> {
  const callOnce = async (forceRefresh: boolean) => {
    const token = await getAccessToken(forceRefresh);
    if (!token) return { authMissing: true as const };
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        headers: { Authorization: `Bearer ${token}` },
      });
      const resp = (data ?? null) as
        | { success?: boolean; data?: T; error?: { code?: string; message?: string } }
        | null;
      return { authMissing: false as const, edgeError: error ?? null, resp };
    } catch (e) {
      // Never let an invoke throw bubble up as a React runtime error.
      const message = e instanceof Error ? e.message : 'Edge invocation failed';
      return {
        authMissing: false as const,
        edgeError: { message } as { message?: string },
        resp: null,
      };
    }
  };

  let r = await callOnce(false);
  if (r.authMissing) return AUTH_REQUIRED;

  if (!r.resp?.success && isUnauthorizedShape(r.edgeError, r.resp)) {
    const retry = await callOnce(true);
    if (retry.authMissing) return AUTH_REQUIRED;
    r = retry;
  }

  if (r.resp?.success) {
    return { success: true, data: r.resp.data as T };
  }

  if (isUnauthorizedShape(r.edgeError, r.resp)) {
    return {
      success: false,
      reason: 'unauthorized',
      error: { code: 'UNAUTHORIZED', message: 'Sesión no válida o expirada.' },
    };
  }
  if (isForbiddenShape(r.resp)) {
    return {
      success: false,
      reason: 'forbidden',
      error: { code: 'FORBIDDEN', message: 'No tienes permisos para esta acción.' },
    };
  }
  if (r.edgeError) {
    return {
      success: false,
      reason: 'edge_error',
      error: {
        code: 'EDGE_INVOKE_ERROR',
        message: r.edgeError.message ?? 'Edge invocation failed',
      },
    };
  }
  return {
    success: false,
    reason: 'edge_error',
    error: r.resp?.error?.code
      ? { code: r.resp.error.code, message: r.resp.error.message ?? 'Unknown error' }
      : { code: 'UNKNOWN', message: 'Unknown response' },
  };
}

export function isAuthRequiredResult(
  r: AuthSafeInvokeResult<unknown>,
): r is Extract<AuthSafeInvokeResult<unknown>, { skipped: true }> {
  return r.success === false && r.skipped === true && r.reason === 'auth_required';
}