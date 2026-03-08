import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/hr-board-pack`;

Deno.test("hr-board-pack: rejects missing company_id with 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_templates" }),
  });

  const body = await response.json();
  assertEquals(response.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error, "company_id is required");
});

Deno.test("hr-board-pack: rejects demo-company-id with 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: "list_templates", companyId: "demo-company-id" }),
  });

  const body = await response.json();
  assertEquals(response.status, 400);
  assertEquals(body.success, false);
});

Deno.test("hr-board-pack: list_templates returns valid response", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "list_templates",
      companyId: "e5ca7fee-8b19-4538-8ee5-1907199bf922",
    }),
  });

  const body = await response.json();
  await response.text().catch(() => {}); // consume
  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertExists(body.templates);
});

Deno.test("hr-board-pack: list_packs returns valid response", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "list_packs",
      companyId: "e5ca7fee-8b19-4538-8ee5-1907199bf922",
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertExists(body.packs);
});

Deno.test("hr-board-pack: generate_pack requires templateId and period", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "generate_pack",
      companyId: "e5ca7fee-8b19-4538-8ee5-1907199bf922",
      // Missing templateId and period
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 500);
  assertEquals(body.success, false);
});

Deno.test("hr-board-pack: update_status requires packId and status", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "update_status",
      companyId: "e5ca7fee-8b19-4538-8ee5-1907199bf922",
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 500);
  assertEquals(body.success, false);
});

Deno.test("hr-board-pack: unknown action returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "nonexistent_action",
      companyId: "e5ca7fee-8b19-4538-8ee5-1907199bf922",
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 500);
  assertEquals(body.success, false);
});

Deno.test("hr-board-pack: CORS preflight returns 200", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  await response.text(); // consume
});
