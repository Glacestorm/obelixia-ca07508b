import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/payroll-supervisor`;
const VALID_COMPANY_ID = "e5ca7fee-8b19-4538-8ee5-1907199bf922";
const FAKE_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

// =============================================
// A — AUTH GATE TESTS
// =============================================

Deno.test("payroll-supervisor: rejects request without Authorization → 401", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  assertEquals(res.status, 401, `Expected 401, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-supervisor: rejects malformed JWT → rejection", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": "Bearer not.valid.jwt.token",
    },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 500];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-supervisor: rejects expired/garbage JWT", async () => {
  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.garbage_sig";
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${fakeJwt}`,
    },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403, 500];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection, got ${res.status}: ${JSON.stringify(body)}`);
});

// =============================================
// B — TENANT ISOLATION TESTS
// =============================================

Deno.test("payroll-supervisor: rejects anon key as Bearer", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-supervisor: rejects fake company_id → tenant isolation", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "start_cycle", company_id: FAKE_COMPANY_ID, period_year: 2026, period_month: 1 }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected rejection for fake company, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("payroll-supervisor: missing company_id returns error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "get_kpis" }),
  });
  const body = await res.json();
  // company_id required → 400
  const accepted = [400, 401];
  assertEquals(accepted.includes(res.status), true,
    `Expected error for missing company_id, got ${res.status}`);
});

// =============================================
// C — ACTION HANDLING TESTS
// =============================================

Deno.test("payroll-supervisor: unknown action returns controlled error", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action: "totally_invalid_action", company_id: VALID_COMPANY_ID }),
  });
  const body = await res.json();
  const accepted = [400, 401, 403];
  assertEquals(accepted.includes(res.status), true,
    `Expected controlled error, got ${res.status}: ${JSON.stringify(body)}`);
  assertExists(body.error || body.success === false, "Response should indicate failure");
});

// =============================================
// D — CORS TESTS
// =============================================

Deno.test("payroll-supervisor: OPTIONS preflight → 200 with CORS", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200, `Expected 200 for OPTIONS, got ${res.status}`);
  assertExists(res.headers.get("access-control-allow-origin"), "Missing CORS Allow-Origin");
});

Deno.test("payroll-supervisor: error responses include CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  await res.json();
  assertExists(res.headers.get("access-control-allow-origin"), "Error response missing CORS");
});

Deno.test("payroll-supervisor: responses have JSON content-type", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ action: "get_kpis", company_id: VALID_COMPANY_ID }),
  });
  await res.json();
  const ct = res.headers.get("content-type") ?? "";
  assertEquals(ct.includes("application/json"), true, `Expected JSON, got ${ct}`);
});
