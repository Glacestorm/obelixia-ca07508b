import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * ESIOS/REE Integration
 * API Docs: https://api.esios.ree.es
 * 
 * Key indicators:
 * - 600: PVPC price (€/MWh)
 * - 1001: Day-ahead market price
 * - 1739: Demand forecast
 * - 10211: Generation by technology
 * 
 * Requires ESIOS_TOKEN secret
 */

interface EsiosRequest {
  action: 'fetch_pvpc' | 'fetch_spot' | 'fetch_demand' | 'fetch_generation' | 'status';
  date?: string; // YYYY-MM-DD
  indicator_id?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ESIOS_TOKEN = Deno.env.get('ESIOS_TOKEN');
    
    const { action, date, indicator_id } = await req.json() as EsiosRequest;

    // ========== STATUS CHECK ==========
    if (action === 'status') {
      // Update source status
      const status = ESIOS_TOKEN ? 'configured' : 'missing_token';
      
      await supabase.from('energy_market_sources')
        .update({ 
          last_fetch_status: status,
          metadata: { token_configured: !!ESIOS_TOKEN, checked_at: new Date().toISOString() }
        })
        .eq('source_name', 'ESIOS/REE');

      return new Response(JSON.stringify({
        success: true,
        configured: !!ESIOS_TOKEN,
        status,
        message: ESIOS_TOKEN 
          ? 'ESIOS token configurado correctamente' 
          : 'ESIOS token no configurado. Añade el secret ESIOS_TOKEN.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ESIOS_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ESIOS_TOKEN no configurado',
        message: 'Necesitas configurar el token ESIOS/REE para acceder a datos reales.',
        fallback: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const esiosBaseUrl = 'https://api.esios.ree.es';

    // ========== FETCH PVPC ==========
    if (action === 'fetch_pvpc') {
      const indicatorId = 1001; // PVPC term facturación energía activa 2.0TD
      const startDate = `${targetDate}T00:00:00`;
      const endDate = `${targetDate}T23:59:59`;

      console.log(`[energy-esios] Fetching PVPC for ${targetDate}`);
      console.log(`[energy-esios] Token length: ${ESIOS_TOKEN.length}, prefix: ${ESIOS_TOKEN.substring(0, 6)}...`);

      let values: any[] = [];
      let source = 'esios';

      // Try ESIOS API first
      try {
        const esiosUrl = `${esiosBaseUrl}/indicators/${indicatorId}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&geo_ids[]=8741`;
        const esiosResponse = await fetch(esiosUrl, {
          headers: {
            'Accept': 'application/json; application/vnd.esios-api-v1+json',
            'Content-Type': 'application/json',
            'x-api-key': ESIOS_TOKEN,
            'Authorization': `Token token="${ESIOS_TOKEN}"`,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (esiosResponse.ok) {
          const esiosData = await esiosResponse.json();
          values = esiosData?.indicator?.values || [];
          source = 'esios';
          console.log(`[energy-esios] ESIOS success: ${values.length} values`);
        } else {
          const errText = await esiosResponse.text();
          console.warn(`[energy-esios] ESIOS returned ${esiosResponse.status}: ${errText}`);
          throw new Error(`ESIOS ${esiosResponse.status}`);
        }
      } catch (esiosErr) {
        console.warn(`[energy-esios] ESIOS failed, trying REE public API...`, esiosErr);
        
        // Fallback: REE public API (apidatos.ree.es) — no token required for PVPC
        try {
          const reeUrl = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${targetDate}T00:00&end_date=${targetDate}T23:59&time_trunc=hour`;
          const reeResponse = await fetch(reeUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          if (reeResponse.ok) {
            const reeData = await reeResponse.json();
            // REE API structure: included[].attributes.values[]
            const pvpcSeries = reeData?.included?.find((s: any) => s.type === 'PVPC' || s.id === '600');
            if (pvpcSeries?.attributes?.values) {
              values = pvpcSeries.attributes.values.map((v: any) => ({
                datetime: v.datetime,
                value: v.value,
                geo_name: 'Peninsular',
              }));
              source = 'ree_public';
              console.log(`[energy-esios] REE public API success: ${values.length} values`);
            }
          } else {
            console.warn(`[energy-esios] REE public API returned ${reeResponse.status}`);
          }
        } catch (reeErr) {
          console.warn(`[energy-esios] REE public API also failed:`, reeErr);
        }
      }

      if (values.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No se pudieron obtener datos PVPC de ninguna fuente',
          fallback: true,
          message: 'El token ESIOS puede ser inválido o haber expirado. La API pública de REE tampoco respondió. Verifica tu token en https://api.esios.ree.es/',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // values already populated from ESIOS or REE fallback above

      const prices = values.map((v: any) => {
        const dt = new Date(v.datetime);
        return {
          hour: dt.getUTCHours(),
          price_eur_mwh: Math.round(v.value * 100) / 100,
          geo_name: v.geo_name || 'Peninsular',
        };
      }).filter((p: any) => p.hour >= 0 && p.hour < 24);

      // Persist to energy_market_prices
      if (prices.length > 0) {
        const rows = prices.map((p: any) => ({
          price_date: targetDate,
          hour: p.hour,
          energy_type: 'electricity',
          market_source: 'esios',
          price_eur_mwh: p.price_eur_mwh,
          price_eur_kwh: Math.round((p.price_eur_mwh / 1000) * 10000) / 10000,
          zone: 'peninsula',
        }));

        await supabase.from('energy_market_prices')
          .upsert(rows, { onConflict: 'price_date,hour,energy_type' });

        // Update source status
        await supabase.from('energy_market_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            last_fetch_status: 'success',
            fetch_count: supabase.rpc ? undefined : undefined, // increment handled separately
          })
          .eq('source_name', 'ESIOS/REE');
      }

      return new Response(JSON.stringify({
        success: true,
        source: 'esios',
        indicator: 'PVPC',
        date: targetDate,
        count: prices.length,
        prices,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== FETCH SPOT (Day-ahead) ==========
    if (action === 'fetch_spot') {
      const indicatorId = indicator_id || 1001;
      const startDate = `${targetDate}T00:00:00`;
      const endDate = `${targetDate}T23:59:59`;

      const url = `${esiosBaseUrl}/indicators/${indicatorId}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&geo_ids[]=8741`;

      console.log(`[energy-esios] Fetching spot (indicator ${indicatorId}) for ${targetDate}`);

      const esiosHeaders2 = {
        'Accept': 'application/json; application/vnd.esios-api-v1+json',
        'Content-Type': 'application/json',
        'Host': 'api.esios.ree.es',
        'x-api-key': ESIOS_TOKEN,
      };

      const response = await fetch(url, {
        headers: esiosHeaders2,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`ESIOS API error: ${response.status}`);
      }

      const data = await response.json();
      const values = data?.indicator?.values || [];

      return new Response(JSON.stringify({
        success: true,
        source: 'esios',
        indicator_id: indicatorId,
        indicator_name: data?.indicator?.name || 'Unknown',
        date: targetDate,
        count: values.length,
        values: values.map((v: any) => ({
          datetime: v.datetime,
          value: v.value,
          geo_name: v.geo_name,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== FETCH DEMAND ==========
    if (action === 'fetch_demand') {
      const indicatorId = 1739;
      const startDate = `${targetDate}T00:00:00`;
      const endDate = `${targetDate}T23:59:59`;

      const url = `${esiosBaseUrl}/indicators/${indicatorId}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&geo_ids[]=8741`;

      const esiosHeaders3 = {
        'Accept': 'application/json; application/vnd.esios-api-v1+json',
        'Content-Type': 'application/json',
        'Host': 'api.esios.ree.es',
        'x-api-key': ESIOS_TOKEN,
      };

      const response = await fetch(url, {
        headers: esiosHeaders3,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`ESIOS API error: ${response.status}`);

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        source: 'esios',
        indicator: 'demand_forecast',
        date: targetDate,
        values: data?.indicator?.values || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);
  } catch (error) {
    console.error('[energy-esios] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
