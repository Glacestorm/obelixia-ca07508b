import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOURCE_FEEDS: Record<string, { fetchUrl: string; parser: string }> = {
  'BOE': { fetchUrl: 'https://www.boe.es/rss/boe.php?s=1', parser: 'boe_rss' },
  'DOUE': { fetchUrl: 'https://eur-lex.europa.eu/rss/rss.xml', parser: 'eurlex_rss' },
};

const MAX_DOCS_PER_SOURCE = 20;
const REFRESH_TIMEOUT_MS = 120_000;

interface RefreshRequest {
  action: 'refresh_all' | 'refresh_source' | 'check_changes' | 'get_refresh_logs';
  source_id?: string;
  limit?: number;
  trigger?: 'manual' | 'scheduled';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const body: RefreshRequest = await req.json();
    const { action, trigger = 'manual' } = body;

    switch (action) {
      case 'refresh_all': {
        const { data: lockResult } = await supabase.rpc('try_acquire_regulatory_refresh_lock');
        if (!lockResult) {
          return jsonResponse({
            success: false, error: 'Refresh already in progress',
            message: 'Ya hay un refresco en curso. Espere a que termine.',
          }, 409);
        }

        try {
          const { data: sources } = await supabase
            .from('erp_regulatory_sources')
            .select('*')
            .eq('is_enabled', true)
            .eq('ingestion_method', 'auto')
            .order('last_checked_at', { ascending: true, nullsFirst: true });

          if (!sources || sources.length === 0) {
            await supabase.rpc('release_regulatory_refresh_lock');
            return jsonResponse({ success: true, message: 'No auto-enabled sources', refreshed: 0, trigger });
          }

          // Load feedback stats for confidence adjustment
          const feedbackStats = await loadFeedbackStats(supabase);
          // Phase 2E: Load cross-domain feedback for escalation learning
          const escalationLearning = await loadEscalationLearning(supabase);

          const results = [];
          for (const source of sources) {
            try {
              const result = await withTimeout(
                refreshSource(supabase, source, LOVABLE_API_KEY, trigger, feedbackStats, escalationLearning),
                REFRESH_TIMEOUT_MS
              );
              results.push(result);
            } catch (timeoutErr) {
              console.error(`[regulatory-refresh] Timeout for ${source.code}`);
              results.push({ source: source.code, status: 'timeout', error: 'Timeout exceeded' });
              await supabase.from('erp_regulatory_sources').update({
                refresh_status: 'error',
                last_error_at: new Date().toISOString(),
                last_error_message: 'Timeout exceeded',
              }).eq('id', source.id);
            }
          }

          return jsonResponse({
            success: true, refreshed: results.length, results, trigger,
            timestamp: new Date().toISOString(),
          });
        } finally {
          await supabase.rpc('release_regulatory_refresh_lock');
        }
      }

      case 'refresh_source': {
        if (!body.source_id) {
          return jsonResponse({ success: false, error: 'source_id required' }, 400);
        }
        const { data: source } = await supabase
          .from('erp_regulatory_sources')
          .select('*')
          .eq('id', body.source_id)
          .single();

        if (!source) return jsonResponse({ success: false, error: 'Source not found' }, 404);

        const feedbackStats = await loadFeedbackStats(supabase);
        const escalationLearning = await loadEscalationLearning(supabase);
        const result = await refreshSource(supabase, source, LOVABLE_API_KEY, trigger, feedbackStats, escalationLearning);
        return jsonResponse({ success: true, result, trigger });
      }

      case 'get_refresh_logs': {
        let query = supabase
          .from('erp_regulatory_refresh_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(body.limit || 20);

        if (body.source_id) query = query.eq('source_id', body.source_id);
        const { data: logs } = await query;
        return jsonResponse({ success: true, logs: logs || [] });
      }

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[regulatory-refresh] Error:', error);
    return jsonResponse({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// === FEEDBACK-BASED CONFIDENCE ADJUSTMENT (weighted by reviewer role) ===
async function loadFeedbackStats(supabase: any): Promise<Map<string, { total: number; accepted: number; rejected: number }>> {
  const stats = new Map<string, { total: number; accepted: number; rejected: number }>();
  try {
    const { data } = await supabase
      .from('erp_regulatory_feedback')
      .select('field_reviewed, accepted, reviewer_role, reviewer_domain')
      .order('created_at', { ascending: false })
      .limit(300);

    if (data) {
      const ROLE_WEIGHT: Record<string, number> = {
        superadmin: 2, admin: 2, responsable_comercial: 1.5,
        director_comercial: 1.5, auditor: 1.5, user: 1,
      };

      for (const fb of data) {
        const key = fb.field_reviewed || 'general';
        const weight = ROLE_WEIGHT[fb.reviewer_role || 'user'] || 1;
        const existing = stats.get(key) || { total: 0, accepted: 0, rejected: 0 };
        existing.total += weight;
        if (fb.accepted === true) existing.accepted += weight;
        if (fb.accepted === false) existing.rejected += weight;
        stats.set(key, existing);
      }
    }
  } catch (e) {
    console.error('[regulatory-refresh] Error loading feedback stats:', e);
  }
  return stats;
}

// === Phase 2E: ESCALATION LEARNING from cross-domain feedback ===
interface EscalationLearning {
  enabled: boolean;
  falsePositiveRate: number;
  falseNegativeCount: number;
  sourceAccuracy: Map<string, number>;
  legalAreaAccuracy: Map<string, number>;
  minSamples: number;
}

async function loadEscalationLearning(supabase: any): Promise<EscalationLearning> {
  const learning: EscalationLearning = {
    enabled: false, falsePositiveRate: 0, falseNegativeCount: 0,
    sourceAccuracy: new Map(), legalAreaAccuracy: new Map(), minSamples: 5,
  };

  try {
    // Check if escalation learning is enabled
    const { data: config } = await supabase
      .from('erp_learning_config')
      .select('config_value, is_active')
      .eq('config_key', 'escalation_learning')
      .single();

    if (!config?.is_active || !config?.config_value?.enabled) return learning;
    learning.enabled = true;
    learning.minSamples = config.config_value.min_samples || 5;

    // Load cross-domain feedback for escalation accuracy
    const { data: feedback } = await supabase
      .from('erp_cross_domain_feedback')
      .select('escalation_correct, should_have_escalated, source_code, legal_area, origin')
      .not('escalation_correct', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!feedback || feedback.length < learning.minSamples) return learning;

    const total = feedback.length;
    const falsePositives = feedback.filter((f: any) => f.escalation_correct === false).length;
    learning.falsePositiveRate = falsePositives / total;
    learning.falseNegativeCount = feedback.filter((f: any) => f.should_have_escalated === true).length;

    // Source-specific accuracy
    const bySource = new Map<string, { correct: number; total: number }>();
    const byArea = new Map<string, { correct: number; total: number }>();

    for (const fb of feedback) {
      if (fb.source_code) {
        const s = bySource.get(fb.source_code) || { correct: 0, total: 0 };
        s.total++;
        if (fb.escalation_correct) s.correct++;
        bySource.set(fb.source_code, s);
      }
      if (fb.legal_area) {
        const a = byArea.get(fb.legal_area) || { correct: 0, total: 0 };
        a.total++;
        if (fb.escalation_correct) a.correct++;
        byArea.set(fb.legal_area, a);
      }
    }

    for (const [source, stats] of bySource) {
      if (stats.total >= 3) learning.sourceAccuracy.set(source, stats.correct / stats.total);
    }
    for (const [area, stats] of byArea) {
      if (stats.total >= 3) learning.legalAreaAccuracy.set(area, stats.correct / stats.total);
    }
  } catch (e) {
    console.warn('[regulatory-refresh] Escalation learning load error:', e);
  }
  return learning;
}

function adjustConfidenceFromFeedback(
  feedbackStats: Map<string, { total: number; accepted: number; rejected: number }>,
  field: string, baseConfidence: number
): number {
  const stats = feedbackStats.get(field);
  if (!stats || stats.total < 3) return baseConfidence;
  const acceptRate = stats.accepted / stats.total;
  return Math.min(1, Math.max(0.1, baseConfidence * (0.5 + acceptRate * 0.5)));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout exceeded')), ms)),
  ]);
}

async function refreshSource(
  supabase: any, source: any, aiApiKey: string | undefined, trigger: string,
  feedbackStats: Map<string, { total: number; accepted: number; rejected: number }>,
  escalationLearning: EscalationLearning
) {
  const logId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await supabase.from('erp_regulatory_refresh_log').insert({
    id: logId, source_id: source.id, status: 'running', started_at: startedAt, trigger_type: trigger,
  });

  await supabase.from('erp_regulatory_sources').update({
    refresh_status: 'running', last_checked_at: startedAt,
  }).eq('id', source.id);

  try {
    const feedConfig = SOURCE_FEEDS[source.code];
    let documents: any[] = [];

    if (feedConfig) {
      documents = await fetchFromFeed(feedConfig, source);
    } else if (source.url) {
      documents = await fetchFromGenericUrl(source);
    } else {
      await completeRefresh(supabase, source.id, logId, {
        status: 'completed', documents_found: 0, documents_new: 0, documents_updated: 0, documents_unchanged: 0,
      });
      return { source: source.code, status: 'no_feed', documents_found: 0, trigger };
    }

    if (documents.length > MAX_DOCS_PER_SOURCE) {
      documents = documents.slice(0, MAX_DOCS_PER_SOURCE);
    }

    let newCount = 0, updatedCount = 0, unchangedCount = 0;

    for (const doc of documents) {
      const contentHash = await hashContent(doc.title + (doc.content || '') + (doc.url || ''));

      const { data: existing } = await supabase
        .from('erp_regulatory_documents')
        .select('id, content_hash, version')
        .eq('source_id', source.id)
        .or(`document_title.eq.${doc.title},source_url.eq.${doc.url}`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        if (existing.content_hash === contentHash) { unchangedCount++; continue; }
        await supabase.from('erp_regulatory_documents').update({
          summary: doc.summary || null, content_hash: contentHash,
          version: (existing.version || 1) + 1, change_type: 'updated', updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        updatedCount++;
      } else {
        let classification: any = {};
        if (aiApiKey && doc.content) {
          classification = await classifyWithAI(aiApiKey, doc, source);
        }

        const impactConfidence = adjustConfidenceFromFeedback(feedbackStats, 'impact_level', 0.8);
        const summaryConfidence = adjustConfidenceFromFeedback(feedbackStats, 'summary', 0.85);
        const forceHumanReview = impactConfidence < 0.5 || summaryConfidence < 0.5;

        await supabase.from('erp_regulatory_documents').insert({
          source_id: source.id,
          document_title: doc.title,
          document_type: classification.document_type || 'otro',
          reference_code: doc.reference_code || null,
          issuing_body: source.issuing_body,
          territorial_scope: classification.territorial_scope || source.territorial_scope,
          jurisdiction_code: classification.jurisdiction_code || source.jurisdiction_code,
          publication_date: doc.publication_date || new Date().toISOString().split('T')[0],
          status: 'vigente',
          summary: classification.summary || doc.summary || null,
          impact_summary: classification.impact_summary || null,
          impact_domains: classification.impact_domains || source.domain_tags || [],
          impact_level: classification.impact_level || 'medium',
          legal_area: classification.legal_area || null,
          tags: classification.tags || [],
          source_url: doc.url || source.url,
          origin_verified: true,
          requires_human_review: forceHumanReview || (classification.requires_human_review ?? true),
          data_source: 'live',
          content_hash: contentHash,
          change_type: 'new',
        });
        newCount++;
      }
    }

    // Traceability invocation
    await supabase.from('erp_ai_agent_invocations').insert({
      agent_code: 'regulatory-intelligence',
      supervisor_code: 'legal-supervisor',
      company_id: '00000000-0000-0000-0000-000000000000',
      input_summary: `refresh_source: ${source.name} (${source.code})`,
      routing_reason: `Refresco ${trigger === 'scheduled' ? 'programado' : 'manual'} de fuente ${source.code}`,
      confidence_score: 0.95,
      outcome_status: 'success',
      execution_time_ms: Date.now() - new Date(startedAt).getTime(),
      response_summary: `Encontrados: ${documents.length}, Nuevos: ${newCount}, Actualizados: ${updatedCount}, Sin cambios: ${unchangedCount}`,
      metadata: {
        source: 'live', trigger, action: 'refresh', source_code: source.code,
        documents_found: documents.length, documents_new: newCount, documents_updated: updatedCount,
        feedback_adjusted: feedbackStats.size > 0,
        escalation_learning_active: escalationLearning.enabled,
      },
    });

    // === CROSS-DOMAIN ESCALATION TO OBELIXIA (Phase 2E: learning-aware) ===
    if (newCount > 0) {
      try {
        const { data: newDocs } = await supabase
          .from('erp_regulatory_documents')
          .select('*')
          .eq('source_id', source.id)
          .eq('change_type', 'new')
          .eq('data_source', 'live')
          .order('created_at', { ascending: false })
          .limit(newCount);

        if (newDocs) {
          for (const doc of newDocs) {
            const shouldEscalate = evaluateCrossDomainTrigger(doc, escalationLearning, source.code);
            if (shouldEscalate) {
              console.log(`[regulatory-refresh] Escalating to ObelixIA: ${doc.document_title?.substring(0, 50)}`);
              try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                await fetch(`${supabaseUrl}/functions/v1/obelixia-supervisor`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'regulatory_cross_domain',
                    company_id: '00000000-0000-0000-0000-000000000000',
                    document: {
                      id: doc.id, document_title: doc.document_title, summary: doc.summary,
                      impact_summary: doc.impact_summary, impact_domains: doc.impact_domains,
                      impact_level: doc.impact_level, requires_human_review: doc.requires_human_review,
                      source_url: doc.source_url, source_code: source.code,
                      publication_date: doc.publication_date, legal_area: doc.legal_area,
                    },
                    trigger_reason: shouldEscalate.reason,
                  }),
                });
              } catch (escErr) {
                console.error(`[regulatory-refresh] ObelixIA escalation error:`, escErr);
              }
            }
          }
        }
      } catch (crossErr) {
        console.error(`[regulatory-refresh] Cross-domain evaluation error:`, crossErr);
      }
    }

    await completeRefresh(supabase, source.id, logId, {
      status: 'completed', documents_found: documents.length,
      documents_new: newCount, documents_updated: updatedCount, documents_unchanged: unchangedCount,
    });

    return {
      source: source.code, status: 'completed', trigger,
      documents_found: documents.length, new: newCount, updated: updatedCount, unchanged: unchangedCount,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[regulatory-refresh] Source ${source.code} error:`, error);

    await supabase.from('erp_regulatory_sources').update({
      refresh_status: 'error', last_error_at: new Date().toISOString(), last_error_message: errorMessage,
    }).eq('id', source.id);

    await supabase.from('erp_regulatory_refresh_log').update({
      status: 'failed', completed_at: new Date().toISOString(), error_message: errorMessage,
    }).eq('id', logId);

    return { source: source.code, status: 'error', trigger, error: errorMessage };
  }
}

async function completeRefresh(supabase: any, sourceId: string, logId: string, data: any) {
  const now = new Date().toISOString();
  await supabase.from('erp_regulatory_sources').update({
    refresh_status: 'idle', last_success_at: now, documents_found: data.documents_found,
  }).eq('id', sourceId);
  await supabase.from('erp_regulatory_refresh_log').update({ ...data, completed_at: now }).eq('id', logId);
}

async function fetchFromFeed(config: { fetchUrl: string; parser: string }, source: any): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(config.fetchUrl, {
      headers: { 'User-Agent': 'ObelixIA-RegulatoryIntelligence/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${config.fetchUrl}`);
    const text = await response.text();
    if (config.parser === 'boe_rss') return parseBoeRss(text);
    if (config.parser === 'eurlex_rss') return parseEurLexRss(text);
    return [];
  } catch (error) {
    console.error(`[regulatory-refresh] Feed fetch error for ${source.code}:`, error);
    return [];
  }
}

function parseBoeRss(xml: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_DOCS_PER_SOURCE) {
    const itemContent = match[1];
    const title = extractTag(itemContent, 'title');
    const link = extractTag(itemContent, 'link');
    const description = extractTag(itemContent, 'description');
    const pubDate = extractTag(itemContent, 'pubDate');
    if (title) {
      items.push({
        title: cleanHtml(title), url: link || null,
        content: cleanHtml(description || ''),
        summary: cleanHtml(description || '').substring(0, 500),
        publication_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : null,
        reference_code: extractBoeReference(title),
      });
    }
  }
  return items;
}

function parseEurLexRss(xml: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_DOCS_PER_SOURCE) {
    const itemContent = match[1];
    const title = extractTag(itemContent, 'title');
    const link = extractTag(itemContent, 'link');
    const description = extractTag(itemContent, 'description');
    const pubDate = extractTag(itemContent, 'pubDate');
    if (title) {
      items.push({
        title: cleanHtml(title), url: link || null,
        content: cleanHtml(description || ''),
        summary: cleanHtml(description || '').substring(0, 500),
        publication_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : null,
      });
    }
  }
  return items;
}

async function fetchFromGenericUrl(source: any): Promise<any[]> {
  try {
    await fetch(source.url, { method: 'HEAD', headers: { 'User-Agent': 'ObelixIA-RegulatoryIntelligence/1.0' } });
    return [];
  } catch { return []; }
}

async function classifyWithAI(apiKey: string, doc: any, source: any): Promise<any> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Clasifica este documento normativo. Responde SOLO JSON:
{
  "document_type": "ley|real_decreto|orden|resolucion|directiva|reglamento|circular|otro",
  "territorial_scope": "national|european",
  "jurisdiction_code": "ES|EU",
  "legal_area": "laboral|fiscal|mercantil|administrativo|compliance|otro",
  "impact_domains": ["hr","legal","compliance","fiscal"],
  "impact_level": "critical|high|medium|low",
  "impact_summary": "una frase de impacto operativo",
  "summary": "resumen ejecutivo en 2 frases",
  "tags": ["tag1"],
  "requires_human_review": boolean
}`,
          },
          {
            role: 'user',
            content: `Título: ${doc.title}\nFuente: ${source.name} (${source.jurisdiction_code})\nContenido: ${(doc.content || '').substring(0, 3000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });
    if (!response.ok) return {};
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    console.error('[regulatory-refresh] AI classification error:', e);
    return {};
  }
}

// === CROSS-DOMAIN TRIGGER EVALUATION (Phase 2E: learning-aware) ===
const CROSS_DOMAIN_KEYWORDS_STRONG = [
  'despido', 'ERE', 'ERTE', 'maternidad', 'paternidad',
  'movilidad internacional', 'RGPD', 'LOPDGDD', 'acoso',
  'indemnización', 'convenio colectivo',
];
const CROSS_DOMAIN_KEYWORDS_WEAK = [
  'contratación', 'jornada', 'permiso', 'cotización', 'seguridad social',
  'teletrabajo', 'salario', 'compliance', 'prevención', 'igualdad',
];

function evaluateCrossDomainTrigger(doc: any, learning: EscalationLearning, sourceCode: string): { reason: string } | null {
  const domains = doc.impact_domains || [];
  const impactLevel = doc.impact_level || 'low';
  const title = (doc.document_title || '').toLowerCase();
  const summary = (doc.summary || '').toLowerCase();
  const text = title + ' ' + summary;

  const hasHR = domains.includes('hr');
  const hasLegal = domains.includes('legal');
  const hasCompliance = domains.includes('compliance');
  const relevantDomains = domains.filter((d: string) => ['hr', 'legal', 'compliance', 'fiscal'].includes(d));

  // Phase 2E: Learning-based adjustments
  if (learning.enabled) {
    // If this source has historically low accuracy, require stronger signals
    const sourceAcc = learning.sourceAccuracy.get(sourceCode);
    if (sourceAcc !== undefined && sourceAcc < 0.4) {
      // Only escalate for critical+multi-domain from unreliable sources
      if (impactLevel === 'critical' && hasHR && hasLegal) {
        return { reason: `Critical + hr+legal (source ${sourceCode} low-accuracy, tightened)` };
      }
      const strongMatches = CROSS_DOMAIN_KEYWORDS_STRONG.filter(kw => text.includes(kw));
      if (strongMatches.length >= 2 && relevantDomains.length >= 2) {
        return { reason: `Strong keywords ${strongMatches.slice(0, 2).join('+')} (source tightened)` };
      }
      return null; // Skip escalation for low-accuracy source without strong signals
    }

    // If false positive rate is high (>40%), tighten all rules
    if (learning.falsePositiveRate > 0.4) {
      // Require both strong keyword AND multi-domain
      const strongMatches = CROSS_DOMAIN_KEYWORDS_STRONG.filter(kw => text.includes(kw));
      if (strongMatches.length >= 1 && hasHR && (hasLegal || hasCompliance)) {
        return { reason: `High FP rate - tightened: ${strongMatches[0]} + ${relevantDomains.join('+')}` };
      }
      if (impactLevel === 'critical' && relevantDomains.length >= 2) {
        return { reason: `High FP rate - critical + multi-domain only` };
      }
      return null;
    }
  }

  // Standard rules (same as Phase 2C)
  // Rule 1: Must have BOTH hr AND (legal OR compliance) for multi-domain trigger
  if (relevantDomains.length >= 2 && hasHR && (hasLegal || hasCompliance)) {
    return { reason: `Multi-domain impact: ${relevantDomains.join('+')}` };
  }

  // Rule 2: Critical impact ONLY if it touches hr+legal
  if (impactLevel === 'critical' && hasHR && (hasLegal || hasCompliance)) {
    return { reason: `Critical impact on ${relevantDomains.join('+')}` };
  }

  // Rule 3: High impact needs BOTH hr+legal domains explicitly
  if (impactLevel === 'high' && hasHR && hasLegal) {
    return { reason: `High impact on hr+legal` };
  }

  // Rule 4: Strong cross-domain keywords (≥1) + at least 2 relevant domains
  const strongMatches = CROSS_DOMAIN_KEYWORDS_STRONG.filter(kw => text.includes(kw));
  if (strongMatches.length >= 1 && relevantDomains.length >= 2) {
    return { reason: `Cross-domain keyword: ${strongMatches[0]} + ${relevantDomains.join('+')}` };
  }

  // Rule 5: Multiple weak keywords (≥3) + hr + legal
  const weakMatches = CROSS_DOMAIN_KEYWORDS_WEAK.filter(kw => text.includes(kw));
  if (weakMatches.length >= 3 && hasHR && hasLegal) {
    return { reason: `Multiple cross-domain signals: ${weakMatches.slice(0, 3).join(', ')}` };
  }

  // Rule 6: Human review + both hr and legal
  if (doc.requires_human_review && hasHR && hasLegal) {
    return { reason: `Human review required + hr+legal` };
  }

  return null;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : null;
}

function cleanHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function extractBoeReference(title: string): string | null {
  const match = title.match(/(Real Decreto(?:-ley)?|Ley Orgánica|Ley|Orden|Resolución)\s+[\d\/]+/i);
  return match ? match[0] : null;
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
