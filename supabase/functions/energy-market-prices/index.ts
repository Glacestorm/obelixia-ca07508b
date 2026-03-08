import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchRequest {
  action: 'fetch_omie' | 'fetch_ree' | 'predict' | 'alerts';
  start_date?: string;
  end_date?: string;
  energy_type?: string;
  alert_thresholds?: { high: number; low: number };
}

/**
 * OMIE public API: https://www.omie.es/es/file-access-list
 * REE/ESIOS: https://api.esios.ree.es (requires token for full access, public for day-ahead)
 * This function fetches real OMIE prices when available, stores in energy_market_prices,
 * and provides prediction + alert capabilities via Lovable AI.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, start_date, end_date, energy_type = 'electricity', alert_thresholds } = await req.json() as FetchRequest;

    // =========== FETCH OMIE ===========
    if (action === 'fetch_omie') {
      const targetDate = start_date || new Date().toISOString().split('T')[0];
      
      // OMIE provides day-ahead market prices in CSV format
      // URL pattern: https://www.omie.es/es/file-download?parents%5B0%5D=marginalpdbc&filename=marginalpdbc_YYYYMMDD.1
      const dateFormatted = targetDate.replace(/-/g, '');
      const omieUrl = `https://www.omie.es/es/file-download?parents%5B0%5D=marginalpdbc&filename=marginalpdbc_${dateFormatted}.1`;

      let prices: Array<{ hour: number; price_eur_mwh: number }> = [];
      let source: 'omie' | 'mock' = 'mock';

      try {
        const omieResponse = await fetch(omieUrl, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(8000),
        });

        if (omieResponse.ok) {
          const csvText = await omieResponse.text();
          // OMIE CSV format: hour;price_spain;price_portugal
          const lines = csvText.split('\n').filter(l => l.trim() && !l.startsWith('*'));
          
          for (const line of lines) {
            const parts = line.split(';');
            if (parts.length >= 2) {
              const hour = parseInt(parts[0]) - 1; // OMIE uses 1-24, we use 0-23
              const priceSpain = parseFloat(parts[1]);
              if (!isNaN(hour) && hour >= 0 && hour < 24 && !isNaN(priceSpain)) {
                prices.push({ hour, price_eur_mwh: Math.round(priceSpain * 100) / 100 });
              }
            }
          }

          if (prices.length >= 20) {
            source = 'omie';
            console.log(`[energy-market-prices] OMIE: ${prices.length} prices fetched for ${targetDate}`);
          } else {
            prices = [];
          }
        }
      } catch (omieErr) {
        console.warn(`[energy-market-prices] OMIE fetch failed for ${targetDate}:`, omieErr);
      }

      // Fallback to mock if OMIE unavailable
      if (prices.length === 0) {
        const seed = targetDate.split('-').reduce((a: number, b: string) => a + parseInt(b), 0);
        const dow = new Date(targetDate).getDay();
        const dowFactor = dow === 0 || dow === 6 ? 0.82 : 1.0;
        
        prices = Array.from({ length: 24 }, (_, hour) => {
          const hourFactor = hour >= 8 && hour <= 12 ? 1.4 : hour >= 18 && hour <= 22 ? 1.5 : hour >= 0 && hour <= 6 ? 0.5 : 0.9;
          const noise = Math.sin(seed * hour * 0.7) * 18;
          const dayNoise = Math.cos(seed * 0.13) * 9;
          const price = Math.max(5, (85 + dayNoise) * hourFactor * dowFactor + noise);
          return { hour, price_eur_mwh: Math.round(price * 100) / 100 };
        });
        source = 'mock';
      }

      // Upsert into database
      const rows = prices.map(p => ({
        price_date: targetDate,
        hour: p.hour,
        energy_type,
        market_source: source,
        price_eur_mwh: p.price_eur_mwh,
        price_eur_kwh: Math.round((p.price_eur_mwh / 1000) * 10000) / 10000,
        zone: 'peninsula',
      }));

      const { error: upsertError } = await supabase
        .from('energy_market_prices')
        .upsert(rows, { onConflict: 'price_date,hour,energy_type' });

      if (upsertError) {
        console.warn('[energy-market-prices] Upsert warning:', upsertError);
      }

      return new Response(JSON.stringify({
        success: true,
        source,
        date: targetDate,
        count: prices.length,
        prices,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========== PREDICT ===========
    if (action === 'predict') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      // Get last 7 days of data for context
      const { data: historicalData } = await supabase
        .from('energy_market_prices')
        .select('price_date, hour, price_eur_mwh')
        .eq('energy_type', energy_type)
        .order('price_date', { ascending: false })
        .order('hour', { ascending: true })
        .limit(168); // 7 days × 24 hours

      const prompt = `Analiza estos precios eléctricos del mercado español (OMIE) y predice las próximas 24 horas.

Datos históricos (últimos 7 días):
${JSON.stringify(historicalData?.slice(0, 48) || [])}

Responde en JSON estricto:
{
  "predictions": [{ "hour": 0, "predicted_price": 85.50, "confidence": 0.75 }, ...para las 24h],
  "trend": "up" | "down" | "stable",
  "summary": "breve resumen en español",
  "factors": ["factor1", "factor2"]
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Eres un analista de mercados energéticos español. Responde solo en JSON válido.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'Rate limit - intenta más tarde' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI API error: ${status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'No JSON parsed' };
      } catch {
        result = { rawContent: content, parseError: true };
      }

      return new Response(JSON.stringify({ success: true, action: 'predict', data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========== ALERTS ===========
    if (action === 'alerts') {
      const thresholds = alert_thresholds || { high: 150, low: 30 };
      
      // Check today's prices
      const today = new Date().toISOString().split('T')[0];
      const { data: todayPrices } = await supabase
        .from('energy_market_prices')
        .select('hour, price_eur_mwh')
        .eq('price_date', today)
        .eq('energy_type', energy_type)
        .order('hour', { ascending: true });

      const alerts: Array<{ type: string; hour: number; price: number; message: string }> = [];
      
      (todayPrices || []).forEach((p: any) => {
        if (p.price_eur_mwh >= thresholds.high) {
          alerts.push({
            type: 'high_price',
            hour: p.hour,
            price: p.price_eur_mwh,
            message: `⚠️ Precio alto: ${p.price_eur_mwh} €/MWh a las ${p.hour}:00`,
          });
        }
        if (p.price_eur_mwh <= thresholds.low) {
          alerts.push({
            type: 'low_price',
            hour: p.hour,
            price: p.price_eur_mwh,
            message: `💚 Precio bajo: ${p.price_eur_mwh} €/MWh a las ${p.hour}:00`,
          });
        }
      });

      return new Response(JSON.stringify({
        success: true,
        alerts,
        thresholds,
        date: today,
        total_alerts: alerts.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);
  } catch (error) {
    console.error('[energy-market-prices] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
