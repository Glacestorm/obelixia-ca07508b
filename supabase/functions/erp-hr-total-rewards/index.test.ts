import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/erp-hr-total-rewards`;
const VALID_COMPANY_ID = "e5ca7fee-8b19-4538-8ee5-1907199bf922";
const FAKE_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

// =============================================
// BLOQUE A — SECURITY GATE TESTS
// =============================================

// --- A1: No Authorization header → 401 ---
Deno.test("erp-hr-total-rewards: rejects request without Authorization header → 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A2: Invalid/malformed JWT → 401 ---
Deno.test("erp-hr-total-rewards: rejects invalid JWT → 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid.jwt.token",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A3: Expired/fake JWT → 401 ---
Deno.test("erp-hr-total-rewards: rejects expired/fake JWT → 401", async () => {
  const expiredJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ.signature";
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${expiredJwt}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A4: Anon key as JWT + non-existent company → 401/403 ---
Deno.test("erp-hr-total-rewards: rejects non-existent company_id → 401 or 403", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: FAKE_COMPANY_ID,
    }),
  });

  const body = await response.json();
  const isRejected = response.status === 401 || response.status === 403;
  assertEquals(isRejected, true, `Expected 401 or 403, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A5: Missing both employee_id and company_id → 400 ---
Deno.test("erp-hr-total-rewards: rejects missing identifiers → 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      // no company_id, no employee_id
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 400, `Expected 400, got ${response.status}: ${JSON.stringify(body)}`);
  assertExists(body.error);
});

// --- A6: CORS preflight → 200 with required headers ---
Deno.test("erp-hr-total-rewards: CORS preflight returns 200 with required headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  const allowOrigin = response.headers.get("access-control-allow-origin");
  const allowHeaders = response.headers.get("access-control-allow-headers");
  assertExists(allowOrigin, "Missing Access-Control-Allow-Origin");
  assertExists(allowHeaders, "Missing Access-Control-Allow-Headers");
  await response.text();
});

// --- A7: Error responses include CORS headers ---
Deno.test("erp-hr-total-rewards: error responses include CORS headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid.jwt.token",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const allowOrigin = response.headers.get("access-control-allow-origin");
  assertExists(allowOrigin, "Error responses must include CORS headers");
  await response.json();
});

// --- A8: Response content-type is JSON ---
Deno.test("erp-hr-total-rewards: responses have application/json content-type", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer bad",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const ct = response.headers.get("content-type");
  assertEquals(ct?.includes("application/json"), true, `Expected JSON content-type, got: ${ct}`);
  await response.json();
});

// --- A9: Anon key + valid company (no real user) → rejected ---
Deno.test("erp-hr-total-rewards: anon key with valid company is rejected", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "compare_market",
      company_id: VALID_COMPANY_ID,
    }),
  });

  const body = await response.json();
  const isRejected = response.status === 401 || response.status === 403;
  assertEquals(isRejected, true, `Anon key should be rejected, got ${response.status}: ${JSON.stringify(body)}`);
});

// --- A10: employee_id path without auth → 401 ---
Deno.test("erp-hr-total-rewards: employee_id path without auth → 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "analyze_compensation",
      employee_id: "00000000-0000-0000-0000-000000000001",
      fiscal_year: 2025,
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 401, `Expected 401, got ${response.status}: ${JSON.stringify(body)}`);
});
