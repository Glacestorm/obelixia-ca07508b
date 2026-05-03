/**
 * QA-LEGACY-01 — Test helper for the auth-safe Supabase invocation flow.
 *
 * Many UI hooks now route writes through `authSafeInvoke`, which:
 *  1. reads the active session via `supabase.auth.getSession()`,
 *  2. forwards a Bearer token explicitly,
 *  3. invokes `supabase.functions.invoke(fn, { body, headers })`.
 *
 * Older tests only mocked `supabase.functions.invoke` and skipped
 * `supabase.auth.getSession`, which made `authSafeInvoke` short-circuit to
 * `auth_required` and never reach the edge mock. This helper builds a
 * complete mock surface so tests can exercise the real edge-routing path
 * without changing any product code.
 *
 * Pure test utility — never imported from runtime code.
 */
import { vi, type Mock } from 'vitest';

export interface AuthSafeMock {
  invoke: Mock;
  getSession: Mock;
  refreshSession: Mock;
  supabase: {
    auth: {
      getSession: Mock;
      refreshSession: Mock;
    };
    functions: { invoke: Mock };
  };
}

const FAKE_TOKEN = 'test-access-token-qa-legacy-01';

/**
 * Build a Supabase mock object compatible with `authSafeInvoke`.
 * Default: authenticated session + invoke returns success/empty.
 */
export function buildAuthSafeSupabaseMock(opts?: {
  session?: 'authenticated' | 'missing';
  invokeResult?: { data?: unknown; error?: unknown };
}): AuthSafeMock {
  const session =
    (opts?.session ?? 'authenticated') === 'authenticated'
      ? { access_token: FAKE_TOKEN }
      : null;

  const getSession = vi.fn().mockResolvedValue({ data: { session } });
  const refreshSession = vi.fn().mockResolvedValue({ data: { session } });
  const invoke = vi.fn().mockResolvedValue(
    opts?.invokeResult ?? { data: { success: true, data: [] }, error: null },
  );

  return {
    invoke,
    getSession,
    refreshSession,
    supabase: {
      auth: { getSession, refreshSession },
      functions: { invoke },
    },
  };
}