import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/legal-knowledge-sync`;

// ============================================================================
// HELPERS
// ============================================================================

async function invoke(headers: Record<string, string> = {}): Promise<Response> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  });
  return res;
}

async function consumeBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ============================================================================
// PATH 1: No auth → rejection
// ============================================================================

Deno.test("No auth headers → 401", async () => {
  const res = await invoke();
  const body = await consumeBody(res);
  assertEquals(res.status, 401);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

// ============================================================================
// PATH 2: Cron secret
// ============================================================================

Deno.test("Correct x-cron-secret → 200 (cron path)", async () => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.warn("CRON_SECRET not set, skipping cron path test");
    return;
  }

  const res = await invoke({ "x-cron-secret": cronSecret });
  const body = await consumeBody(res);
  assertEquals(res.status, 200);
  assertEquals((body as Record<string, unknown>).success, true);
  assertEquals((body as Record<string, unknown>).source, "cron");
});

Deno.test("Incorrect x-cron-secret → 401 (falls through to JWT check, no JWT)", async () => {
  const res = await invoke({ "x-cron-secret": "wrong-secret-value-12345" });
  const body = await consumeBody(res);
  // No valid cron secret AND no JWT → 401
  assertEquals(res.status, 401);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

// ============================================================================
// PATH 3: JWT paths
// ============================================================================

Deno.test("Malformed Authorization header → 401", async () => {
  const res = await invoke({ Authorization: "NotBearer xyz" });
  const body = await consumeBody(res);
  assertEquals(res.status, 401);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

Deno.test("Invalid JWT token → 401", async () => {
  const res = await invoke({ Authorization: "Bearer invalid.jwt.token" });
  const body = await consumeBody(res);
  assertEquals(res.status, 401);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

Deno.test("Expired/garbage JWT (3-part, long) → 401", async () => {
  // Construct a fake JWT that passes format checks but fails validation
  const fakeJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkZha2UiLCJpYXQiOjE1MTYyMzkwMjJ9." +
    "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const res = await invoke({ Authorization: `Bearer ${fakeJwt}` });
  const body = await consumeBody(res);
  assertEquals(res.status, 401);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

Deno.test("Anon key as Bearer (non-admin) → 401 or 403", async () => {
  // The anon key is not a user JWT, should be rejected
  const res = await invoke({ Authorization: `Bearer ${SUPABASE_ANON_KEY}` });
  const body = await consumeBody(res);
  // Depending on parsing, this could be 401 (invalid JWT) or 403 (no admin role)
  const validStatuses = [401, 403];
  assertEquals(validStatuses.includes(res.status), true,
    `Expected 401 or 403, got ${res.status}`);
  assertEquals(typeof (body as Record<string, unknown>).error, "string");
});

// ============================================================================
// PATH 4: CORS
// ============================================================================

Deno.test("OPTIONS preflight → 200 with CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  await res.text(); // consume body
  assertEquals(res.status, 200);
  assertNotEquals(res.headers.get("access-control-allow-origin"), null);
});

// ============================================================================
// PATH 5: Response structure validation on rejection
// ============================================================================

Deno.test("Rejection responses include Content-Type application/json", async () => {
  const res = await invoke();
  await consumeBody(res);
  assertEquals(res.status, 401);
  const ct = res.headers.get("content-type");
  assertEquals(ct?.includes("application/json"), true);
});

Deno.test("Rejection responses include CORS headers", async () => {
  const res = await invoke();
  await consumeBody(res);
  assertNotEquals(res.headers.get("access-control-allow-origin"), null);
});
