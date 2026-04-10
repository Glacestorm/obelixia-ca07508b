/**
 * Error Contract v1 — S8.0
 * Standardized response shapes for all edge functions.
 */

export interface StandardSuccess {
  success: true;
  data: unknown;
  meta: { timestamp: string };
}

export interface StandardError {
  success: false;
  error: { code: string; message: string };
  meta: { timestamp: string };
}

const ts = () => new Date().toISOString();

export function successResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  const body: StandardSuccess = { success: true, data, meta: { timestamp: ts() } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  const body: StandardError = { success: false, error: { code, message }, meta: { timestamp: ts() } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Map TenantAuthError to standard error response */
export function mapAuthError(
  authResult: { status: 401 | 403; body: { error: string } },
  headers: Record<string, string>,
): Response {
  const code = authResult.status === 401 ? 'AUTH_MISSING' : 'AUTH_FORBIDDEN';
  return errorResponse(code, authResult.body.error, authResult.status, headers);
}

// Convenience builders
export const validationError = (message: string, headers: Record<string, string>) =>
  errorResponse('VALIDATION_ERROR', message, 400, headers);

export const notFoundError = (entity: string, headers: Record<string, string>) =>
  errorResponse('NOT_FOUND', `${entity} not found`, 404, headers);

export const businessRuleError = (message: string, headers: Record<string, string>, details?: unknown) =>
  errorResponse('BUSINESS_RULE_VIOLATION', message, 422, headers);

export const internalError = (headers: Record<string, string>) =>
  errorResponse('INTERNAL_ERROR', 'Internal server error', 500, headers);
