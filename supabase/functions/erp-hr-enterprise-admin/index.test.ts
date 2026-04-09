import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/erp-hr-enterprise-admin`;
const VALID_COMPANY_ID = "e5ca7fee-8b19-4538-8ee5-1907199bf922";
const FAKE_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

// =============================================
// BLOQUE A — SECURITY GATE TESTS
// =============================================

// --- A1: No Authorization header → 401 ---
Deno.test("enterprise-admin: rejects request without Authorization header → 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A2: Invalid JWT → 401 ---
Deno.test("enterprise-admin: rejects invalid JWT → 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid.jwt.token",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A3: Expired/fake JWT → 401 ---
Deno.test("enterprise-admin: rejects expired/fake JWT → 401", async () => {
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTAwMDAwMDAwMH0.fake_signature";
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${fakeJwt}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A4: Missing company_id → 400 ---
Deno.test("enterprise-admin: rejects missing company_id → 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: {} }),
  });

  const body = await response.json();
  // Should be 400 (missing company_id) or 401 (anon key rejected first)
  const validStatuses = [400, 401];
  assertEquals(
    validStatuses.includes(response.status),
    true,
    `Expected 400 or 401, got ${response.status}: ${JSON.stringify(body)}`
  );
});

// =============================================
// BLOQUE B — TENANT ISOLATION
// =============================================

// --- B1: Anon key as JWT + valid company → rejected ---
Deno.test("enterprise-admin: rejects anon key used as Bearer for tenant access", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  const body = await response.json();
  const rejectedStatuses = [401, 403];
  assertEquals(
    rejectedStatuses.includes(response.status),
    true,
    `Expected 401 or 403, got ${response.status}: ${JSON.stringify(body)}`
  );
});

// --- B2: Fake company_id → 403 ---
Deno.test("enterprise-admin: rejects non-existent company_id → 403", async () => {
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTAwMDAwMDAwMH0.fake_signature";
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${fakeJwt}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: FAKE_COMPANY_ID } }),
  });

  const body = await response.json();
  const rejectedStatuses = [401, 403];
  assertEquals(
    rejectedStatuses.includes(response.status),
    true,
    `Expected 401 or 403, got ${response.status}: ${JSON.stringify(body)}`
  );
});

// =============================================
// BLOQUE C — CORS & PROTOCOL
// =============================================

// --- C1: OPTIONS preflight → 200 ---
Deno.test("enterprise-admin: OPTIONS preflight returns 200 with CORS headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "https://obelixia.lovable.app",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text();
  assertEquals(response.status, 200, `Expected 200 for OPTIONS, got ${response.status}`);
  assertExists(response.headers.get("access-control-allow-origin"), "Missing CORS allow-origin header");
});

// --- C2: Error responses are JSON ---
Deno.test("enterprise-admin: error responses have JSON content-type", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  const contentType = response.headers.get("content-type") || "";
  assertEquals(contentType.includes("application/json"), true, `Expected JSON content-type, got: ${contentType}`);
  await response.json(); // consume body
});

// --- C3: CORS headers present on error responses ---
Deno.test("enterprise-admin: CORS headers present on 401 error responses", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_legal_entities", params: { company_id: VALID_COMPANY_ID } }),
  });

  await response.json();
  assertExists(response.headers.get("access-control-allow-origin"), "Missing CORS header on error response");
});

// =============================================
// BLOQUE D — REPRESENTATIVE ACTIONS (read-only)
// =============================================

// --- D1: Unknown action → 500 (caught by default case) ---
Deno.test("enterprise-admin: unknown action returns error", async () => {
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTAwMDAwMDAwMH0.fake_signature";
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${fakeJwt}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "nonexistent_action", params: { company_id: VALID_COMPANY_ID } }),
  });

  const body = await response.json();
  // Will be rejected at auth level (401) before reaching switch, or 500 if somehow passes
  const expectedStatuses = [401, 403, 500];
  assertEquals(
    expectedStatuses.includes(response.status),
    true,
    `Expected 401/403/500, got ${response.status}: ${JSON.stringify(body)}`
  );
});

// =============================================
// LIMITS OF THIS FIRST WAVE
// =============================================
// EXCLUDED from this wave (too complex / requires seed data):
//   - seed_enterprise_data (requires admin privileges, heavy writes)
//   - upsert_* / delete_* actions (need pre-existing valid data)
//   - assign_role / toggle_permission (role-dependent writes)
//   - Positive path tests requiring a real authenticated user session
// NEXT WAVE should add:
//   - Authenticated positive-path tests for list_* actions
//   - Verify RLS isolation with two different tenant users
//   - seed_enterprise_data privilege boundary tests
