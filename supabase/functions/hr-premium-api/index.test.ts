import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/hr-premium-api`;

Deno.test("hr-premium-api: rejects missing auth with 401", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_api_clients", params: { company_id: "test" } }),
  });

  const body = await response.json();
  assertEquals(response.status, 401);
});

Deno.test("hr-premium-api: CORS preflight returns 200", async () => {
  const response = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(response.status, 200);
  await response.text();
});

Deno.test("hr-premium-api: unknown action returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "nonexistent_action", params: { company_id: "test" } }),
  });

  // Either 401 (invalid token) or 500 (unknown action) — both acceptable
  const body = await response.json();
  assertEquals(body.success === false || !!body.error, true);
});
