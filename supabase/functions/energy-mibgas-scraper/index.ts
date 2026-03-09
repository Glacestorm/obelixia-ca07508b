/**
 * energy-mibgas-scraper
 * Scrapes MIBGAS market data using Firecrawl connector.
 * Returns structured gas prices: PVB Day Ahead, Month Ahead, futures, indices.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MibgasProduct {
  product: string;
  delivery: string;
  price_eur_mwh: number;
  category: 'index' | 'spot' | 'forward';
  market: string; // PVB, VTP, TVB, etc.
}

interface MibgasResult {
  success: boolean;
  data: {
    day_ahead_es: number | null;
    month_ahead_es: number | null;
    day_ahead_pt: number | null;
    day_ahead_change: number | null;
    day_ahead_change_pct: number | null;
    products: MibgasProduct[];
    last_updated: string;
    source: 'mibgas_firecrawl';
    data_quality: 'real' | 'partial';
  };
  error?: string;
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  // Handle "51,65" or "51.65" formats
  const cleaned = text.replace(/[^\d,.\-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractProducts(markdown: string): MibgasProduct[] {
  const products: MibgasProduct[] = [];

  // Parse the tabular data from the homepage markdown
  // Pattern: product name, date, price appear in sequence
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);

  // Indices
  const lpiMatch = markdown.match(/LPI\)?\s*Day\s*Ahead[\s\S]*?(\d{2}\/\d{2})[\s\S]*?(\d+[,.]?\d*)/i);
  if (lpiMatch) {
    products.push({
      product: 'MIBGAS PVB LPI Day Ahead',
      delivery: lpiMatch[1],
      price_eur_mwh: parsePrice(lpiMatch[2]) || 0,
      category: 'index',
      market: 'PVB',
    });
  }

  const apiMatch = markdown.match(/API\)?\s*Day\s*Ahead[\s\S]*?(\d{2}\/\d{2})[\s\S]*?(\d+[,.]?\d*)/i);
  if (apiMatch) {
    products.push({
      product: 'MIBGAS PVB API Day Ahead',
      delivery: apiMatch[1],
      price_eur_mwh: parsePrice(apiMatch[2]) || 0,
      category: 'index',
      market: 'PVB',
    });
  }

  // Spot products: Intradiario, Diario
  const intradayMatch = markdown.match(/Intradiario\s*\n\s*(\d{2}\/\d{2})\s*\n\s*(\d+[,.]?\d*)/i);
  if (intradayMatch) {
    products.push({
      product: 'Intradiario',
      delivery: intradayMatch[1],
      price_eur_mwh: parsePrice(intradayMatch[2]) || 0,
      category: 'spot',
      market: 'PVB',
    });
  }

  // Diario entries (can have multiple dates)
  const diarioSection = markdown.match(/Diario\s*\n([\s\S]*?)(?=Fin de semana|Resto de mes)/i);
  if (diarioSection) {
    const diarioLines = diarioSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < diarioLines.length - 1; i += 2) {
      const date = diarioLines[i];
      const price = diarioLines[i + 1];
      if (/\d{2}\/\d{2}/.test(date) && /\d+[,.]?\d*/.test(price)) {
        products.push({
          product: `Diario`,
          delivery: date,
          price_eur_mwh: parsePrice(price) || 0,
          category: 'spot',
          market: 'PVB',
        });
      }
    }
  }

  // Weekend
  const weekendMatch = markdown.match(/Fin de semana\s*\n\s*(\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2})\s*\n\s*(\d+[,.]?\d*)/i);
  if (weekendMatch) {
    products.push({
      product: 'Fin de semana',
      delivery: weekendMatch[1],
      price_eur_mwh: parsePrice(weekendMatch[2]) || 0,
      category: 'spot',
      market: 'PVB',
    });
  }

  // Resto de mes
  const restoMatch = markdown.match(/Resto de mes\s*\n\s*(\w+\s*\d{4})\s*\n\s*(\d+[,.]?\d*)/i);
  if (restoMatch) {
    products.push({
      product: 'Resto de mes',
      delivery: restoMatch[1],
      price_eur_mwh: parsePrice(restoMatch[2]) || 0,
      category: 'forward',
      market: 'PVB',
    });
  }

  // Monthly forwards: Mes\n Month Year\n Price
  const mesSection = markdown.match(/\nMes\s*\n([\s\S]*?)(?=Trimestre)/i);
  if (mesSection) {
    const mesLines = mesSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < mesLines.length - 1; i += 2) {
      const label = mesLines[i];
      const price = mesLines[i + 1];
      if (/\w+\s+\d{4}/.test(label) && /\d+[,.]?\d*/.test(price)) {
        products.push({
          product: `Mes ${label}`,
          delivery: label,
          price_eur_mwh: parsePrice(price) || 0,
          category: 'forward',
          market: 'PVB',
        });
      }
    }
  }

  // Quarterly forwards
  const trimestreSection = markdown.match(/Trimestre\s*\n([\s\S]*?)(?=Semestre)/i);
  if (trimestreSection) {
    const tLines = trimestreSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < tLines.length - 1; i += 2) {
      const label = tLines[i];
      const price = tLines[i + 1];
      if (/Q\d\s+\d{4}/.test(label) && /\d+[,.]?\d*/.test(price)) {
        products.push({
          product: `Trimestre ${label}`,
          delivery: label,
          price_eur_mwh: parsePrice(price) || 0,
          category: 'forward',
          market: 'PVB',
        });
      }
    }
  }

  // Semester forwards
  const semestreSection = markdown.match(/Semestre\s*\n([\s\S]*?)(?=Año)/i);
  if (semestreSection) {
    const sLines = semestreSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < sLines.length - 1; i += 2) {
      const label = sLines[i];
      const price = sLines[i + 1];
      if (/\d+[,.]?\d*/.test(price)) {
        products.push({
          product: `Semestre ${label}`,
          delivery: label,
          price_eur_mwh: parsePrice(price) || 0,
          category: 'forward',
          market: 'PVB',
        });
      }
    }
  }

  // Annual forwards
  const anoSection = markdown.match(/\nAño\s*\n([\s\S]*?)(?=\[|actualizado|$)/i);
  if (anoSection) {
    const aLines = anoSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < aLines.length - 1; i += 2) {
      const label = aLines[i];
      const price = aLines[i + 1];
      if (/\d{4}/.test(label) && /\d+[,.]?\d*/.test(price)) {
        products.push({
          product: `Año ${label}`,
          delivery: label,
          price_eur_mwh: parsePrice(price) || 0,
          category: 'forward',
          market: 'PVB',
        });
      }
    }
  }

  return products;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[mibgas-scraper] Starting scrape of mibgas.es...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.mibgas.es',
        formats: ['markdown'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[mibgas-scraper] Firecrawl error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Firecrawl error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await response.json();
    const markdown: string = scrapeData?.data?.markdown || scrapeData?.markdown || '';

    if (!markdown || markdown.length < 100) {
      console.error('[mibgas-scraper] Insufficient content scraped');
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient content from MIBGAS' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[mibgas-scraper] Scraped ${markdown.length} chars`);

    // Extract headline prices
    const dayAheadMatch = markdown.match(/Day\s*Ahead\s*ES[\s\S]*?(\d+[,.]?\d+)\s*€\/MWh/i);
    const monthAheadMatch = markdown.match(/Month\s*Ahead\s*ES[\s\S]*?(\d+[,.]?\d+)\s*€\/MWh/i);
    const dayAheadPtMatch = markdown.match(/Day\s*Ahead\s*PT[\s\S]*?(\d+[,.]?\d+)\s*€\/MWh/i);

    // Extract change
    const changeMatch = markdown.match(/Day\s*Ahead\s*ES[\s\S]*?(\d+[,.]?\d+)\s*€\/MWh[\s\S]*?\*\*(\d+[,.]?\d+)\*\*\s*€\/MWh[\s\S]*?\*\*(\d+[,.]?\d+)\*\*\s*%/i);

    const dayAheadEs = dayAheadMatch ? parsePrice(dayAheadMatch[1]) : null;
    const monthAheadEs = monthAheadMatch ? parsePrice(monthAheadMatch[1]) : null;
    const dayAheadPt = dayAheadPtMatch ? parsePrice(dayAheadPtMatch[1]) : null;
    const dayAheadChange = changeMatch ? parsePrice(changeMatch[2]) : null;
    const dayAheadChangePct = changeMatch ? parsePrice(changeMatch[3]) : null;

    // Extract updated timestamp
    const updatedMatch = markdown.match(/actualizado:\s*(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2})/i);
    const lastUpdated = updatedMatch ? updatedMatch[1] : new Date().toISOString();

    // Extract all products
    const products = extractProducts(markdown);

    console.log(`[mibgas-scraper] Day Ahead ES: ${dayAheadEs}, Products: ${products.length}`);

    const result: MibgasResult = {
      success: true,
      data: {
        day_ahead_es: dayAheadEs,
        month_ahead_es: monthAheadEs,
        day_ahead_pt: dayAheadPt,
        day_ahead_change: dayAheadChange,
        day_ahead_change_pct: dayAheadChangePct,
        products,
        last_updated: lastUpdated,
        source: 'mibgas_firecrawl',
        data_quality: dayAheadEs !== null && products.length >= 5 ? 'real' : 'partial',
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[mibgas-scraper] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
