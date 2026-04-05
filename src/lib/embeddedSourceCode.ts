/**
 * Embedded Source Code - Stripped to fix OOM build errors
 * The embedded strings were causing RegExp heap exhaustion during Rollup bundling.
 * Version: 9.0.0 (lightweight)
 */

export const APP_TSX = '/* stripped for build performance */';
export const USE_AUTH_TSX = '/* stripped for build performance */';
export const SUPABASE_CLIENT_TS = '/* stripped for build performance */';
export const MAIN_TSX = '/* stripped for build performance */';

// Re-export a helper so existing consumers don't break
export function getEmbeddedSource(name: string): string {
  return `/* ${name}: stripped for build performance — use direct file reads instead */`;
}
