/**
 * HR Command Center — static feature flag.
 *
 * Hardcoded OFF by default. Do NOT read from env, BD, or dynamic flags.
 * Flip manually via PR only. Tests can `vi.mock` this module to force ON.
 *
 * Invariants:
 *  - persisted_priority_apply OFF
 *  - C3B3C2 BLOCKED
 *  - VPT stays internal_ready · official integrations stay read-only
 */
export const HR_COMMAND_CENTER_ENABLED = false;
