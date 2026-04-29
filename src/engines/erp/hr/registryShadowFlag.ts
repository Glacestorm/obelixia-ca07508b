/**
 * B10C — Hardcoded shadow flag for registry-aware agreement resolution.
 * Changing this requires a code PR. Never read from env, DB, CMS or remote.
 *
 * Hard rules:
 *  - No process.env, no import.meta.env, no localStorage.
 *  - No Supabase, no fetch, no DB, no CMS, no remote flag service.
 *  - When this constant is `false`, downstream callers MUST NOT execute
 *    the registry preview (B10A) or comparator (B10B) for payroll.
 *  - Real payroll output MUST be byte-equivalent whether this flag is
 *    true or false; B10C only allows attaching shadow metadata, never
 *    altering operative concepts, lines, summary or persistence.
 */
export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false;