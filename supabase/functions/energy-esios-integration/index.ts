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
      const indicatorId = 600; // PVPC
      const startDate = `${targetDate}T00:00:00`;
      const endDate = `${targetDate}T23:59:59`;

      const url = `${esiosBaseUrl}/indicators/${indicatorId}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&geo_ids[]=8741`; // 8741 = Peninsular

      console.log(`[energy-esios] Fetching PVPC for ${targetDate}`);

      const esiosHeaders = {
        'Accept': 'application/json; application/vnd.esios-api-v1+json',
        'Content-Type': 'application/json',
        'Host': 'api.esios.ree.es',
        'x-api-key': ESIOS_TOKEN,
      };

      const response = await fetch(url, {
        headers: esiosHeaders,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[energy-esios] PVPC error: ${response.status}`, errText);
        throw new Error(`ESIOS API error: ${response.status}`);
      }

      const data = await response.json();
      const values = data?.indicator?.values || [];

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
        'Authorization': `Token token="${ESIOS_TOKEN}"`,
        'Accept': 'application/json; application/vnd.esios-api-v1+json',
        'Content-Type': 'application/json',
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
