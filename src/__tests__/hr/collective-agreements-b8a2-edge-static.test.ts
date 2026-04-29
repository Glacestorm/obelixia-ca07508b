/**
 * B8A.2 — Static lint contract tests for the admin-gated edge wrapper.
 *
 * Reads the edge function source as text and asserts the hard safety
 * invariants without executing it (no DB, no Deno runtime needed).
 *
 * Invariants:
 *  1. No reference to the operational table `erp_hr_collective_agreements`
 *     (without `_registry`).
 *  2. No payroll engine / payslip / salary-normalizer imports or strings.
 *  3. SERVICE_ROLE_KEY is only read via `Deno.env.get(...)` (no hardcoded
 *     literal).
 *  4. None of the master-registry / payroll flags appear inside an
 *     UPDATE or upsert payload (we forbid them entirely from the file).
 *  5. `supabase/config.toml` declares
 *     `[functions.erp-hr-collective-agreement-validation] verify_jwt = true`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_FILE =
  'supabase/functions/erp-hr-collective-agreement-validation/index.ts';
const CONFIG_FILE = 'supabase/config.toml';

let SRC = '';
let CONFIG = '';
let SRC_NO_COMMENTS = '';

beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), EDGE_FILE), 'utf-8');
  CONFIG = fs.readFileSync(path.resolve(process.cwd(), CONFIG_FILE), 'utf-8');
  // Strip /* ... */ block comments and // line comments so we inspect
  // executable code only (header docblocks legitimately mention the
  // operational table name as a *prohibition*).
  SRC_NO_COMMENTS = SRC
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
});

describe('B8A.2 — edge file does not touch the operational table', () => {
  it('has zero occurrences of `erp_hr_collective_agreements` without `_registry`', () => {
    const matches = SRC_NO_COMMENTS.match(/erp_hr_collective_agreements(?!_)/g) ?? [];
    expect(matches.length).toBe(0);
  });
});

describe('B8A.2 — edge file does not import payroll surfaces', () => {
  const FORBIDDEN = [
    'payroll',
    'payslip',
    'salary_normalizer',
    'agreement_salary_resolver',
    'useESPayrollBridge',
  ];
  for (const term of FORBIDDEN) {
    it(`does not contain "${term}"`, () => {
      expect(SRC_NO_COMMENTS.toLowerCase()).not.toContain(term.toLowerCase());
    });
  }
});

describe('B8A.2 — service-role only via Deno.env.get', () => {
  it('reads SUPABASE_SERVICE_ROLE_KEY only from Deno.env.get', () => {
    expect(SRC).toMatch(/Deno\.env\.get\(\s*['"]SUPABASE_SERVICE_ROLE_KEY['"]\s*\)/);
  });

  it('does not contain a hardcoded service-role JWT literal', () => {
    // Service-role JWTs start with "eyJ" (base64 header). Edge file must
    // never embed one.
    expect(SRC).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/);
  });
});

describe('B8A.2 — edge file never patches forbidden master-registry / payroll flags', () => {
  const FORBIDDEN_KEYS = [
    'ready_for_payroll',
    'data_completeness',
    'salary_tables_loaded',
    'requires_human_review',
    'official_submission_blocked',
  ];

  for (const key of FORBIDDEN_KEYS) {
    it(`does not contain a write/assignment of \`${key}\``, () => {
      // The forbidden key must NEVER appear as an object property or
      // an assignment target in executable code. It MAY appear inside
      // the FORBIDDEN_PAYLOAD_KEYS blocklist as a string literal
      // (anti-tampering guard) — those are acceptable.
      const propAssignment = new RegExp(`\\b${key}\\s*[:=]`);
      const stringLiteral = new RegExp(`['"]${key}['"]`, 'g');
      // 1) No bare property/assignment usage (e.g. `ready_for_payroll: true`
      //    or `ready_for_payroll = ...`).
      expect(SRC_NO_COMMENTS).not.toMatch(propAssignment);
      // 2) Any occurrence as a string literal is allowed only inside the
      //    blocklist (where it is rejected). Confirm there are at most a
      //    handful and they are quoted (i.e., literals, not identifiers).
      const allOccurrences = SRC_NO_COMMENTS.match(new RegExp(`\\b${key}\\b`, 'g')) ?? [];
      const literalOccurrences = SRC_NO_COMMENTS.match(stringLiteral) ?? [];
      // Every occurrence must be a string literal (blocklist entry).
      expect(allOccurrences.length).toBe(literalOccurrences.length);
    });
  }
});

describe('B8A.2 — supabase/config.toml declares verify_jwt = true', () => {
  it('contains the function block with verify_jwt = true', () => {
    expect(CONFIG).toMatch(
      /\[functions\.erp-hr-collective-agreement-validation\]\s*\n\s*verify_jwt\s*=\s*true/,
    );
  });
});

describe('B8A.2 — edge file enforces auth + role-check', () => {
  it('verifies the JWT via getClaims', () => {
    expect(SRC).toMatch(/getClaims\s*\(/);
  });

  it('rejects requests without Bearer Authorization', () => {
    expect(SRC).toMatch(/UNAUTHORIZED/);
    expect(SRC).toMatch(/Bearer/);
  });

  it('declares ROLE_NOT_AUTHORIZED handling', () => {
    expect(SRC).toMatch(/ROLE_NOT_AUTHORIZED/);
  });

  it('uses strict Zod schemas (no extra fields allowed)', () => {
    // At least one .strict() per discriminated schema family.
    const strictCount = (SRC.match(/\.strict\(\)/g) ?? []).length;
    expect(strictCount).toBeGreaterThanOrEqual(6);
  });
});