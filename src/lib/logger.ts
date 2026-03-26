/**
 * Logger centralizado — elimina console.log en producción
 * Uso: import { logger } from '@/lib/logger';
 * logger.log('mensaje') — solo visible en development
 * logger.error('error') — siempre visible
 * logger.warn('aviso')  — siempre visible
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log:   (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn:  (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.info(...args); },
} as const;

export default logger;
