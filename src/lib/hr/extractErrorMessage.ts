/**
 * extractErrorMessage — Extrae mensaje de error compatible con S8 y legacy
 * S8 shape: { error: { code, message } }
 * Legacy shape: { error: "string" }
 */
export function extractErrorMessage(data: any, fallback = 'Error desconocido'): string {
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.error?.message === 'string') return data.error.message;
  return fallback;
}
