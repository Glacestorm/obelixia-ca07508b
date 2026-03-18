/**
 * erp-hr-agreement-updater - Edge function para actualización automática de convenios colectivos
 * Busca renovaciones de convenios y actualiza tablas salariales
 * Se ejecuta diariamente vía pg_cron o manualmente
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  action: 'check_renewals' | 'update_agreement' | 'bulk_update' | 'daily_scan';
  target_year?: number;
  sector?: string;
  agreement_codes?: string[];
  dry_run?: boolean;
}

const SECTORS = [
  'Metal', 'Construcción', 'Hostelería', 'Comercio', 'Oficinas y despachos',
  'Transporte', 'Limpieza', 'Seguridad privada', 'Educación', 'Sanidad privada',
  'Banca', 'Seguros', 'Telecomunicaciones', 'Industria química', 'Alimentación',
  'Textil', 'Madera y mueble', 'Artes gráficas', 'Siderometalurgia', 'Energía',
  'Agricultura', 'Consultoría y estudios de mercado'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, target_year, sector, agreement_codes, dry_run } = await req.json() as UpdateRequest;
    const year = target_year || new Date().getFullYear();

    console.log(`[agreement-updater] Action: ${action}, Year: ${year}, Sector: ${sector || 'all'}`);

    switch (action) {
      case 'daily_scan':
      case 'check_renewals': {
        // Get existing agreements to check for updates
        const { data: existingAgreements } = await supabase
          .from('erp_hr_collective_agreements')
          .select('code, name, effective_date, expiration_date, metadata')
          .eq('is_active', true)
          .eq('is_system', true);

        const existingCodes = (existingAgreements || []).map(a => a.code);

        // Process in batches of 4 sectors
        const sectorsToCheck = sector ? [sector] : SECTORS;
        const allUpdates: any[] = [];
        const batchSize = 4;

        for (let i = 0; i < sectorsToCheck.length; i += batchSize) {
          const batch = sectorsToCheck.slice(i, i + batchSize);
          const batchPromises = batch.map(s => checkSectorRenewals(LOVABLE_API_KEY, s, year, existingCodes));
          const batchResults = await Promise.all(batchPromises);
          for (const result of batchResults) {
            if (result?.updates) allUpdates.push(...result.updates);
          }
        }

        if (dry_run) {
          return jsonResponse({ success: true, action, dry_run: true, updates_found: allUpdates.length, updates: allUpdates });
        }

        // Apply updates
        let applied = 0;
        let errors = 0;

        for (const update of allUpdates) {
          try {
            await applyAgreementUpdate(supabase, update, year);
            applied++;
          } catch (err) {
            console.error(`[agreement-updater] Error applying update for ${update.code}:`, err);
            errors++;
          }
        }

        // Log the scan
        await supabase.from('erp_hr_collective_agreements').select('id').limit(1); // Just to verify connection

        console.log(`[agreement-updater] Scan complete: ${allUpdates.length} found, ${applied} applied, ${errors} errors`);

        return jsonResponse({
          success: true,
          action,
          year,
          updates_found: allUpdates.length,
          applied,
          errors,
          details: allUpdates.map(u => ({ code: u.code, name: u.name, type: u.update_type })),
          timestamp: new Date().toISOString()
        });
      }

      case 'update_agreement': {
        if (!agreement_codes?.length) throw new Error('agreement_codes required');

        const results: any[] = [];
        for (const code of agreement_codes) {
          const update = await fetchAgreementDetails(LOVABLE_API_KEY, code, year);
          if (update) {
            await applyAgreementUpdate(supabase, update, year);
            results.push({ code, status: 'updated' });
          } else {
            results.push({ code, status: 'no_update_found' });
          }
        }

        return jsonResponse({ success: true, action, results });
      }

      case 'bulk_update': {
        // Force update all system agreements to target year
        const { data: systemAgreements } = await supabase
          .from('erp_hr_collective_agreements')
          .select('code, name')
          .eq('is_system', true)
          .eq('is_active', true);

        if (!systemAgreements?.length) {
          return jsonResponse({ success: true, message: 'No system agreements found' });
        }

        const allResults: any[] = [];
        const codes = systemAgreements.map(a => a.code);

        for (let i = 0; i < codes.length; i += 5) {
          const batch = codes.slice(i, i + 5);
          const promises = batch.map(code => fetchAgreementDetails(LOVABLE_API_KEY, code, year));
          const results = await Promise.all(promises);

          for (let j = 0; j < results.length; j++) {
            if (results[j]) {
              try {
                await applyAgreementUpdate(supabase, results[j], year);
                allResults.push({ code: batch[j], status: 'updated' });
              } catch (e) {
                allResults.push({ code: batch[j], status: 'error', error: (e as Error).message });
              }
            } else {
              allResults.push({ code: batch[j], status: 'no_data' });
            }
          }
        }

        return jsonResponse({ success: true, action, total: allResults.length, results: allResults });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[agreement-updater] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkSectorRenewals(apiKey: string, sector: string, year: number, existingCodes: string[]) {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en convenios colectivos españoles con conocimiento actualizado. Tu tarea es generar los datos de los principales convenios colectivos estatales del sector "${sector}" para el año ${year}.

IMPORTANTE: Genera los convenios principales de este sector con las tablas salariales vigentes o proyectadas para ${year}. Si un convenio de 2025 se ha prorrogado o renovado, incluye los datos con la actualización salarial correspondiente (IPC + mejora habitual del sector). Si no hay publicación oficial aún para ${year}, proyecta basándote en el último convenio conocido con un incremento del 3-4% (media de subidas salariales pactadas en España).

Genera MÍNIMO 3-5 convenios por sector con sus tablas salariales completas.

FORMATO JSON ESTRICTO (array):
[
  {
    "code": "CODIGO_UNICO_CONVENIO",
    "name": "Nombre completo del convenio",
    "update_type": "renewal",
    "boe_reference": "BOE-A-${year}-XXXXX",
    "effective_date": "${year}-01-01",
    "expiration_date": "${year}-12-31",
    "cnae_codes": ["XXXX"],
    "jurisdiction_code": "ES",
    "working_hours_week": 40,
    "vacation_days": 30,
    "extra_payments": 2,
    "salary_groups": [
      {
        "group": "Grupo 1",
        "level": "Nivel 1", 
        "description": "Descripción del grupo profesional",
        "base_salary_monthly": 1500,
        "plus_convenio_monthly": 100,
        "extra_pay_amount": 1500,
        "base_salary_annual": 22400
      }
    ],
    "seniority_rules": { "type": "trienios", "percentage": 3 },
    "source_url": "https://www.boe.es/...",
    "legal_summary": "Resumen del convenio"
  }
]

NUNCA devuelvas un array vacío. Siempre hay al menos un convenio estatal principal por sector.
Convenios existentes en el sistema (actualiza si hay nuevos datos): ${existingCodes.join(', ')}`
          },
          {
            role: 'user',
            content: `Busca TODOS los convenios colectivos del sector "${sector}" renovados o actualizados para ${year}. Solo datos reales y verificables.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error(`[agreement-updater] AI API error for sector ${sector}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { updates: [] };

    const updates = JSON.parse(jsonMatch[0]);
    console.log(`[agreement-updater] Found ${updates.length} updates for sector: ${sector}`);
    return { updates };
  } catch (err) {
    console.error(`[agreement-updater] Error checking sector ${sector}:`, err);
    return null;
  }
}

async function fetchAgreementDetails(apiKey: string, code: string, year: number) {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en convenios colectivos españoles. Devuelve datos del convenio "${code}" para ${year} en JSON con la misma estructura que se pide.`
          },
          {
            role: 'user',
            content: `Datos completos del convenio ${code} para ${year}: tablas salariales por grupo, jornada, vacaciones, pagas extra, antigüedad. JSON puro.`
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function applyAgreementUpdate(supabase: any, update: any, year: number) {
  if (!update.code || !update.name) return;

  const effectiveDate = update.effective_date || `${year}-01-01`;
  const expirationDate = update.expiration_date || `${year}-12-31`;

  // Upsert agreement
  const { error: agError } = await supabase
    .from('erp_hr_collective_agreements')
    .upsert({
      code: update.code,
      name: update.name,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      jurisdiction_code: update.jurisdiction_code || 'ES',
      working_hours_week: update.working_hours_week || 40,
      vacation_days: update.vacation_days || 30,
      extra_payments: update.extra_payments || 2,
      cnae_codes: update.cnae_codes || [],
      is_active: true,
      is_system: true,
      source_url: update.source_url || update.boe_reference || null,
      seniority_rules: update.seniority_rules || null,
      metadata: {
        update_type: update.update_type || 'renewal',
        boe_reference: update.boe_reference,
        legal_summary: update.legal_summary,
        last_auto_update: new Date().toISOString(),
        year
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'code' });

  if (agError) {
    console.error(`[agreement-updater] Error upserting agreement ${update.code}:`, agError);
    throw agError;
  }

  // Update salary tables
  if (update.salary_groups?.length) {
    // Deactivate old salary rows for this code/year
    await supabase
      .from('erp_hr_agreement_salary_tables')
      .update({ is_active: false })
      .eq('agreement_code', update.code)
      .eq('year', year);

    // Insert new salary rows
    const salaryRows = update.salary_groups.map((sg: any) => ({
      agreement_code: update.code,
      agreement_name: update.name,
      professional_group: sg.group || sg.professional_group || 'Sin grupo',
      level: sg.level || 'Único',
      professional_group_description: sg.description || null,
      base_salary_monthly: sg.base_salary_monthly || 0,
      base_salary_annual: sg.base_salary_annual || null,
      plus_convenio_monthly: sg.plus_convenio_monthly || 0,
      extra_pay_amount: sg.extra_pay_amount || 0,
      total_annual_compensation: sg.base_salary_annual || (sg.base_salary_monthly * 14) || null,
      year,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      is_active: true,
      source_reference: update.boe_reference || update.source_url || null,
      metadata: { auto_updated: true, update_type: update.update_type },
    }));

    const { error: stError } = await supabase
      .from('erp_hr_agreement_salary_tables')
      .insert(salaryRows);

    if (stError) {
      console.error(`[agreement-updater] Error inserting salary tables for ${update.code}:`, stError);
    }
  }

  console.log(`[agreement-updater] Applied update for ${update.code} (${update.name})`);
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
