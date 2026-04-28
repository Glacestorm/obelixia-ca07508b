/**
 * B5B — Edge function: Collective Agreements Importer (admin-gated).
 *
 * SECURITY:
 *  - Requires a valid JWT.
 *  - Requires the caller to have role 'admin' (via public.has_role).
 *  - Uses service_role only after admin verification, to write to the
 *    Master Registry (which has restrictive RLS).
 *  - NEVER touches `erp_hr_collective_agreements` (operational table).
 *  - NEVER activates `ready_for_payroll` or `salary_tables_loaded`.
 *
 * The actual writer logic is the pure
 * `runCollectiveAgreementMetadataImport` service from
 * `src/engines/erp/hr/collectiveAgreementsImportWriter.ts`. We
 * re-implement it here in Deno because edge functions cannot import
 * from `src/`. The contract MUST stay in lock-step with the unit-tested
 * service: same forced safety flags, same safe metadata patch fields,
 * same versioning rule.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RawAgreementMetadata {
  source: string;
  sourceId?: string;
  agreementCode?: string;
  officialName: string;
  publicationDate?: string;
  publicationUrl?: string;
  documentUrl?: string;
  jurisdictionCode?: string;
  autonomousRegion?: string;
  provinceCode?: string;
  scopeType?: string;
  sector?: string;
  cnaeCodes?: string[];
  effectiveStartDate?: string;
  effectiveEndDate?: string;
}

interface RequestBody {
  source: string;
  items: RawAgreementMetadata[];
  dryRun?: boolean;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const OFFICIAL_BULLETINS = new Set([
  'BOE', 'BOIB', 'DOGC', 'DOGV', 'BOJA', 'BOCM', 'BOP', 'REGCON',
]);

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildInternalCode(raw: RawAgreementMetadata, fallbackSource: string): string {
  if (raw.agreementCode && raw.agreementCode.trim().length > 0) {
    return raw.agreementCode.trim().toUpperCase();
  }
  return [
    raw.source ?? fallbackSource,
    slugify(raw.officialName ?? 'unknown'),
    raw.jurisdictionCode ? slugify(raw.jurisdictionCode) : 'es',
  ].filter(Boolean).join('::');
}

function inferScope(raw: RawAgreementMetadata): string {
  const explicit = raw.scopeType?.toLowerCase();
  if (['state', 'autonomous', 'provincial', 'company', 'group', 'sector'].includes(explicit ?? '')) {
    return explicit!;
  }
  if (raw.provinceCode) return 'provincial';
  if (raw.autonomousRegion) return 'autonomous';
  if (raw.source === 'BOE') return 'state';
  return 'sector';
}

function inferSourceQuality(raw: RawAgreementMetadata): string {
  const isOfficial = OFFICIAL_BULLETINS.has(raw.source);
  const hasUrl = Boolean(raw.publicationUrl?.trim() || raw.documentUrl?.trim());
  if (isOfficial && hasUrl) return 'official';
  if (isOfficial) return 'pending_official_validation';
  return 'public_secondary';
}

function normalizeRecord(raw: RawAgreementMetadata, fallbackSource: string) {
  return {
    internal_code: buildInternalCode(raw, fallbackSource),
    agreement_code: raw.agreementCode?.trim() || null,
    official_name: raw.officialName,
    short_name: null as string | null,
    scope_type: inferScope(raw),
    jurisdiction_code: raw.jurisdictionCode || raw.provinceCode || raw.autonomousRegion || 'ES',
    autonomous_region: raw.autonomousRegion ?? (raw.source === 'BOIB' ? 'IB' : null),
    province_code: raw.provinceCode ?? null,
    sector: raw.sector ?? null,
    cnae_codes: Array.isArray(raw.cnaeCodes) ? [...raw.cnaeCodes] : [],
    publication_source: raw.source ?? fallbackSource,
    publication_url: raw.publicationUrl ?? raw.documentUrl ?? null,
    publication_date: raw.publicationDate ?? null,
    effective_start_date: raw.effectiveStartDate ?? null,
    effective_end_date: raw.effectiveEndDate ?? null,
    // Hard safety contract — DO NOT RELAX.
    status: 'pendiente_validacion' as const,
    source_quality: inferSourceQuality(raw),
    data_completeness: 'metadata_only' as const,
    salary_tables_loaded: false as const,
    ready_for_payroll: false as const,
    requires_human_review: true as const,
    official_submission_blocked: true as const,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // ── 1. Auth: JWT required ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // ── 2. Authorization: admin role required ──
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin, error: roleErr } = await adminClient.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (roleErr || !isAdmin) {
    return jsonResponse({ error: 'Forbidden — admin role required' }, 403);
  }

  // ── 3. Parse + validate body ──
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  if (!body?.source || !Array.isArray(body.items)) {
    return jsonResponse({ error: 'Missing source or items[]' }, 400);
  }
  if (body.items.length > 1000) {
    return jsonResponse({ error: 'Too many items (max 1000 per run)' }, 400);
  }

  // ── 4. Normalize + dedupe ──
  const errors: Array<{ sourceId?: string; reason: string }> = [];
  const seen = new Map<string, ReturnType<typeof normalizeRecord>>();
  let dedupedDuringNormalize = 0;

  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') {
      errors.push({ reason: 'invalid_raw_item' });
      continue;
    }
    if (!raw.officialName || typeof raw.officialName !== 'string') {
      errors.push({ sourceId: raw.sourceId, reason: 'missing_official_name' });
      continue;
    }
    const withSource = { ...raw, source: raw.source ?? body.source };
    const norm = normalizeRecord(withSource, body.source);
    const key = norm.agreement_code
      ? `code::${norm.agreement_code.toUpperCase()}`
      : `compound::${norm.publication_source}::${norm.official_name.trim().toLowerCase()}::${norm.jurisdiction_code}`;
    if (seen.has(key)) {
      dedupedDuringNormalize += 1;
      continue;
    }
    seen.set(key, norm);
  }
  const records = Array.from(seen.values());

  // ── 5. Plan upsert against existing registry ──
  const codes = records.map(r => r.internal_code);
  let existing: Array<{ id: string; internal_code: string }> = [];
  if (codes.length > 0) {
    const { data: ex, error: exErr } = await adminClient
      .from('erp_hr_collective_agreements_registry')
      .select('id,internal_code')
      .in('internal_code', codes);
    if (exErr) {
      errors.push({ reason: `fetch_existing_failed: ${exErr.message}` });
    } else if (Array.isArray(ex)) {
      existing = ex as Array<{ id: string; internal_code: string }>;
    }
  }
  const existingByCode = new Map(existing.map(e => [e.internal_code.toUpperCase(), e]));

  const toInsert = records.filter(r => !existingByCode.has(r.internal_code.toUpperCase()));
  const toUpdate = records.filter(r => existingByCode.has(r.internal_code.toUpperCase()));

  // ── 6. Dry run short-circuit ──
  if (body.dryRun === true) {
    const status = errors.length > 0 ? 'completed_with_warnings' : 'completed';
    const { data: runRow } = await adminClient
      .from('erp_hr_collective_agreements_registry_import_runs')
      .insert({
        source: body.source,
        total_found: body.items.length,
        inserted: 0,
        updated: 0,
        skipped: dedupedDuringNormalize,
        errors: errors.length,
        report_json: {
          dryRun: true,
          plan: {
            toInsert: toInsert.map(r => r.internal_code),
            toUpdate: toUpdate.map(r => r.internal_code),
          },
          dedupedDuringNormalize,
          errors,
        },
        status,
        finished_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return jsonResponse({
      dryRun: true,
      totalFound: body.items.length,
      normalized: records.length,
      inserted: 0,
      updated: 0,
      skipped: dedupedDuringNormalize,
      errors,
      plan: {
        toInsert: toInsert.map(r => ({ internal_code: r.internal_code, official_name: r.official_name })),
        toUpdate: toUpdate.map(r => ({ internal_code: r.internal_code, official_name: r.official_name })),
      },
      importRunId: runRow?.id ?? null,
      status,
    });
  }

  // ── 7. Real writes ──
  let inserted = 0;
  let updated = 0;
  const SAFE_UPDATE_FIELDS = [
    'official_name', 'short_name', 'jurisdiction_code', 'autonomous_region',
    'province_code', 'sector', 'cnae_codes', 'publication_source',
    'publication_url', 'publication_date', 'effective_start_date',
    'effective_end_date',
  ];

  for (const rec of toInsert) {
    const { data: ins, error: insErr } = await adminClient
      .from('erp_hr_collective_agreements_registry')
      .insert(rec)
      .select('id')
      .single();
    if (insErr || !ins) {
      errors.push({ sourceId: rec.internal_code, reason: `insert_failed: ${insErr?.message ?? 'unknown'}` });
      continue;
    }
    const id = ins.id as string;
    const docHash = rec.publication_url ?? null;
    await adminClient.from('erp_hr_collective_agreements_registry_versions').insert({
      agreement_id: id,
      version_label: 'metadata-import-v1',
      publication_date: rec.publication_date,
      source_url: rec.publication_url,
      effective_start_date: rec.effective_start_date,
      effective_end_date: rec.effective_end_date,
      change_type: 'initial_text',
      source_hash: docHash,
      parsed_summary: { data_completeness: 'metadata_only', source: body.source },
      is_current: true,
    });
    await adminClient.from('erp_hr_collective_agreements_registry_sources').insert({
      agreement_id: id,
      source_type: rec.publication_source ?? body.source,
      source_url: rec.publication_url,
      document_url: rec.publication_url,
      document_hash: docHash,
      status: 'pending',
      source_quality: rec.source_quality,
    });
    inserted += 1;
  }

  const nowIso = new Date().toISOString();
  for (const rec of toUpdate) {
    const ex = existingByCode.get(rec.internal_code.toUpperCase())!;
    const patch: Record<string, unknown> = {
      updated_at: nowIso,
      last_verified_at: nowIso,
    };
    for (const f of SAFE_UPDATE_FIELDS) {
      const v = (rec as Record<string, unknown>)[f];
      if (v !== undefined) patch[f] = v;
    }
    const { error: upErr } = await adminClient
      .from('erp_hr_collective_agreements_registry')
      .update(patch)
      .eq('id', ex.id);
    if (upErr) {
      errors.push({ sourceId: rec.internal_code, reason: `update_failed: ${upErr.message}` });
      continue;
    }
    // Versioning on hash change
    const newHash = rec.publication_url ?? null;
    const { data: cur } = await adminClient
      .from('erp_hr_collective_agreements_registry_versions')
      .select('id,source_hash')
      .eq('agreement_id', ex.id)
      .eq('is_current', true)
      .maybeSingle();
    const previousHash = (cur as { source_hash?: string | null } | null)?.source_hash ?? null;
    if (newHash && newHash !== previousHash) {
      await adminClient
        .from('erp_hr_collective_agreements_registry_versions')
        .update({ is_current: false })
        .eq('agreement_id', ex.id);
      await adminClient.from('erp_hr_collective_agreements_registry_versions').insert({
        agreement_id: ex.id,
        version_label: `metadata-import-${nowIso.slice(0, 10)}`,
        publication_date: rec.publication_date,
        source_url: rec.publication_url,
        effective_start_date: rec.effective_start_date,
        effective_end_date: rec.effective_end_date,
        change_type: 'modificacion',
        source_hash: newHash,
        parsed_summary: {
          data_completeness: 'metadata_only',
          source: body.source,
          reason: 'document_hash_change',
        },
        is_current: true,
      });
    }
    updated += 1;
  }

  // ── 8. Audit run ──
  const status: 'completed' | 'completed_with_warnings' | 'failed' =
    errors.length === 0
      ? 'completed'
      : inserted + updated > 0
        ? 'completed_with_warnings'
        : 'failed';

  const { data: runRow } = await adminClient
    .from('erp_hr_collective_agreements_registry_import_runs')
    .insert({
      source: body.source,
      total_found: body.items.length,
      inserted,
      updated,
      skipped: dedupedDuringNormalize,
      errors: errors.length,
      report_json: {
        dryRun: false,
        errors,
        insertedCodes: toInsert.map(r => r.internal_code),
        updatedCodes: toUpdate.map(r => r.internal_code),
        dedupedDuringNormalize,
        triggeredBy: userId,
      },
      status,
      finished_at: nowIso,
    })
    .select('id')
    .single();

  return jsonResponse({
    dryRun: false,
    totalFound: body.items.length,
    normalized: records.length,
    inserted,
    updated,
    skipped: dedupedDuringNormalize,
    errors,
    importRunId: runRow?.id ?? null,
    status,
  });
});
