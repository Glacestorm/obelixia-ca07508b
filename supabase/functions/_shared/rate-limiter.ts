/**
 * Hybrid Rate Limiter for HR Edge Functions
 * - In-memory burst protection (per cold start)
 * - DB-backed daily/monthly limits (persistent)
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory burst limiter (resets on cold start)
const memoryStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Max requests per minute (in-memory burst) */
  burstPerMinute: number;
  /** Max requests per hour (DB-backed) */
  perHour?: number;
  /** Max requests per day (DB-backed) */
  perDay?: number;
  /** Function name for logging */
  functionName: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  limit: number;
}

/**
 * Check in-memory burst rate limit
 */
export function checkBurstLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window
  const key = `${config.functionName}:${identifier}`;

  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: config.burstPerMinute - 1, limit: config.burstPerMinute };
  }

  if (entry.count >= config.burstPerMinute) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
      limit: config.burstPerMinute,
    };
  }

  entry.count++;
  return { allowed: true, remaining: config.burstPerMinute - entry.count, limit: config.burstPerMinute };
}

/**
 * Check DB-backed persistent rate limit (daily)
 * Call this for expensive operations (AI generation, report creation)
 */
export async function checkPersistentLimit(
  supabase: any,
  userId: string,
  companyId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!config.perDay) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Count today's requests
    const { count, error } = await supabase
      .from('erp_hr_api_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('endpoint', config.functionName)
      .gte('created_at', `${today}T00:00:00Z`);

    if (error) {
      console.warn(`[rate-limiter] DB check failed: ${error.message}, allowing request`);
      return { allowed: true, remaining: config.perDay, limit: config.perDay };
    }

    const currentCount = count || 0;
    if (currentCount >= config.perDay) {
      return {
        allowed: false,
        remaining: 0,
        limit: config.perDay,
        retryAfterMs: getMillisecondsUntilMidnight(),
      };
    }

    return { allowed: true, remaining: config.perDay - currentCount, limit: config.perDay };
  } catch {
    // Fail open on error
    return { allowed: true, remaining: config.perDay, limit: config.perDay };
  }
}

/**
 * Log a rate-limited request for persistent tracking
 */
export async function logRateLimitedRequest(
  supabase: any,
  companyId: string,
  endpoint: string,
  userId?: string
): Promise<void> {
  try {
    await supabase.from('erp_hr_api_access_log').insert({
      company_id: companyId,
      endpoint,
      method: 'POST',
      status_code: 200,
      request_params: { user_id: userId, tracked_by: 'rate_limiter' },
    });
  } catch {
    // Don't fail on logging errors
  }
}

/**
 * Create a 429 response with rate limit headers
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Demasiadas solicitudes. Intenta más tarde.',
      retryAfterMs: result.retryAfterMs,
      limit: result.limit,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

function getMillisecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now - entry.windowStart > 120_000) { // 2 minutes stale
      memoryStore.delete(key);
    }
  }
}, 300_000);
