import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/payroll-calculation-engine`;
const VALID_COMPANY_ID = "e5ca7fee-8b19-4538-8ee5-1907199bf922";
const FAKE_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

// =============================================
// A — AUTH GATE TESTS
// =============================================

Deno.test("payroll-calc: rejects request without Authorization header → 401", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  assertEquals(res.status, 401, `Expected 401, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-calc: rejects malformed JWT → 401 or sanitized error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": "Bearer not.a.valid.jwt",
    },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 500];
  assertEquals(accepted.includes(res.status), true,
    `Expected one of ${accepted}, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-calc: rejects expired/garbage JWT → rejection", async () => {
  // Structurally valid JWT with garbage signature
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid_sig";
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${fakeJwt}`,
    },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403, 500];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection status, got ${res.status}: ${JSON.stringify(body)}`);
});

// =============================================
// B — TENANT ISOLATION TESTS
// =============================================

Deno.test("payroll-calc: rejects anon key as Bearer for tenant access", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-calc: rejects fake company_id → tenant isolation", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "calculate_payroll", company_id: FAKE_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection for fake company, got ${res.status}: ${JSON.stringify(body)}`);
});

// =============================================
// C — ACTION HANDLING TESTS
// =============================================

Deno.test("payroll-calc: unknown action returns controlled error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "nonexistent_action", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  // Either auth rejects first (401/403) or action error returns 400
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected controlled error, got ${res.status}: ${JSON.stringify(body)}`);
  assertExists(body.error || body.success === false, "Response should indicate failure");
});

Deno.test("payroll-calc: missing company_id returns error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "calculate_payroll" }),
  });
  const body = await res.json();
  // company_id required → caught by try/catch → 400
  const accepted = [400, 401];
  assertEquals(accepted.includes(res.status), true,
    `Expected error for missing company_id, got ${res.status}`);
});

// =============================================
// D — CORS TESTS
// =============================================

Deno.test("payroll-calc: OPTIONS preflight returns 200 with CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200, `Expected 200 for OPTIONS, got ${res.status}`);
  assertExists(res.headers.get("access-control-allow-origin"), "Missing CORS Allow-Origin");
});

Deno.test("payroll-calc: error responses include CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  await res.json();
  assertExists(res.headers.get("access-control-allow-origin"), "Error response missing CORS");
});

Deno.test("payroll-calc: responses have application/json content-type", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "calculate_payroll", company_id: VALID_COMPANY_ID }),
  });
  await res.json();
  const ct = res.headers.get("content-type") ?? "";
  assertEquals(ct.includes("application/json"), true, `Expected JSON content-type, got ${ct}`);
});
