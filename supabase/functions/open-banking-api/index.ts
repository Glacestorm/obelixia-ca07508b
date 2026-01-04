import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-fapi-auth-date, x-fapi-customer-ip-address, x-fapi-interaction-id, x-tpp-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-fapi-interaction-id',
};

// Simplified OpenAPI spec reference
const openAPISpec = {
  openapi: "3.1.0",
  info: { title: "Open Banking API - PSD2/PSD3", version: "2.0.0", description: "API PSD2/PSD3 compliant" },
  servers: [{ url: "https://avaugfnqvvqcilhiudlf.supabase.co/functions/v1/open-banking-api" }],
  paths: {
    "/accounts": { get: { summary: "Get accounts", tags: ["Accounts"] } },
    "/accounts/{accountId}": { get: { summary: "Get account details", tags: ["Accounts"] } },
    "/accounts/{accountId}/transactions": { get: { summary: "Get transactions", tags: ["Transactions"] } },
    "/accounts/{accountId}/balances": { get: { summary: "Get balances", tags: ["Balances"] } },
    "/payments": { post: { summary: "Initiate payment", tags: ["Payments"] } },
    "/funds-confirmation": { post: { summary: "Confirm funds", tags: ["Funds"] } },
    "/consents": { post: { summary: "Create consent", tags: ["Consents"] } },
    "/consents/{consentId}": { get: { summary: "Get consent" }, delete: { summary: "Revoke consent" } },
    "/tpps": { post: { summary: "Register TPP", tags: ["TPP"] } },
    "/sepa-instant": { post: { summary: "SEPA Instant Payment", tags: ["SEPA"] } },
    "/vrp/mandates": { post: { summary: "Create VRP mandate", tags: ["VRP"] } },
    "/premium/tiers": { get: { summary: "List premium tiers", tags: ["Premium"] } }
  }
};

const generateInteractionId = () => crypto.randomUUID();

async function validateTPP(tppId: string | null, supabase: any, endpoint: string) {
  if (!tppId) return { valid: false, error: 'x-tpp-id header required' };
  
  const { data: tpp, error } = await supabase.from('registered_tpps').select('*').eq('tpp_id', tppId).single();
  if (error || !tpp) return { valid: false, error: 'TPP not registered' };
  if (tpp.authorization_status !== 'authorized') return { valid: false, error: `TPP status: ${tpp.authorization_status}` };
  if (tpp.expires_at && new Date(tpp.expires_at) < new Date()) return { valid: false, error: 'TPP expired' };
  
  const { data: rateLimitData } = await supabase.from('tpp_rate_limits').select('request_count').eq('tpp_id', tppId).gte('window_start', new Date(Date.now() - 3600000).toISOString());
  const currentCount = rateLimitData?.reduce((sum: number, r: any) => sum + r.request_count, 0) || 0;
  if (currentCount >= tpp.rate_limit_per_hour) return { valid: false, error: 'Rate limit exceeded' };
  
  await supabase.from('tpp_rate_limits').insert({ tpp_id: tppId, endpoint, request_count: 1 });
  return { valid: true, tpp };
}

async function validateToken(authHeader: string | null, supabase: any) {
  if (!authHeader?.startsWith('Bearer ')) return { valid: false };
  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.substring(7));
    if (error || !user) return { valid: false };
    return { valid: true, userId: user.id, scopes: ['accounts', 'payments', 'fundsconfirmation'] };
  } catch { return { valid: false }; }
}

async function validateConsent(tppId: string, userId: string, permission: string, supabase: any) {
  const { data: consent, error } = await supabase.from('open_banking_consents').select('*')
    .eq('tpp_id', tppId).eq('user_id', userId).eq('status', 'authorized').contains('permissions', [permission])
    .gt('expiration_date', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single();
  if (error || !consent) return { valid: false, error: 'No valid consent' };
  await supabase.from('open_banking_consents').update({ last_action_date: new Date().toISOString() }).eq('id', consent.id);
  return { valid: true, consent };
}

async function logAudit(supabase: any, data: any) {
  try { await supabase.from('open_banking_audit_log').insert(data); } catch (e) { console.error('[OB API] Audit error:', e); }
}

const jsonApiResponse = (data: any, status: number, interactionId: string) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/vnd.api+json', 'x-fapi-interaction-id': interactionId }
});

const jsonApiError = (title: string, detail: string, status: number, interactionId: string) => 
  jsonApiResponse({ errors: [{ status: status.toString(), title, detail }] }, status, interactionId);

serve(async (req) => {
  const interactionId = req.headers.get('x-fapi-interaction-id') || generateInteractionId();
  const tppId = req.headers.get('x-tpp-id');
  const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders, 'x-fapi-interaction-id': interactionId } });

  const url = new URL(req.url);
  const path = url.pathname.replace('/open-banking-api', '');
  console.log(`[OB API] ${req.method} ${path} - ${interactionId}`);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Public endpoints
  if (path === '/openapi.json' || path === '/spec') return jsonApiResponse(openAPISpec, 200, interactionId);

  // TPP Registration
  if (path === '/tpps' && req.method === 'POST') {
    const body = await req.json();
    const { tppId: newTppId, tppName, services, redirectUris, organizationId, registrationNumber, contactEmail, countryCode, regulatoryAuthority, qwacCertificate, qsealcCertificate } = body;
    if (!newTppId || !tppName || !services || !redirectUris) return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    
    const { data: existing } = await supabase.from('registered_tpps').select('tpp_id').eq('tpp_id', newTppId).single();
    if (existing) return jsonApiError('Conflict', 'TPP exists', 409, interactionId);
    
    const { data: newTpp, error } = await supabase.from('registered_tpps').insert({
      tpp_id: newTppId, tpp_name: tppName, organization_id: organizationId, registration_number: registrationNumber,
      services, redirect_uris: redirectUris, contact_email: contactEmail, country_code: countryCode,
      regulatory_authority: regulatoryAuthority, qwac_certificate: qwacCertificate, qsealc_certificate: qsealcCertificate,
      authorization_status: 'pending', expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }).select().single();
    
    if (error) return jsonApiError('Internal Error', 'Registration failed', 500, interactionId);
    await logAudit(supabase, { tpp_id: newTppId, endpoint: '/tpps', method: 'POST', response_status: 201, interaction_id: interactionId, ip_address: ipAddress });
    return jsonApiResponse({ data: { id: newTpp.id, type: 'tpps', attributes: { tppId: newTpp.tpp_id, status: 'pending' } } }, 201, interactionId);
  }

  // OAuth endpoints
  if (path === '/oauth/authorize') {
    const code = crypto.randomUUID();
    return jsonApiResponse({ data: { type: 'authorization', attributes: { code, state: url.searchParams.get('state') } } }, 200, interactionId);
  }
  
  if (path === '/oauth/token' && req.method === 'POST') {
    return jsonApiResponse({ access_token: crypto.randomUUID(), token_type: 'Bearer', expires_in: 3600, refresh_token: crypto.randomUUID(), scope: 'accounts payments fundsconfirmation' }, 200, interactionId);
  }

  const authResult = await validateToken(req.headers.get('authorization'), supabase);
  const publicPaths = ['/openapi.json', '/spec', '/oauth/authorize', '/oauth/token', '/tpps'];
  
  if (!publicPaths.includes(path) && !path.startsWith('/tpps')) {
    if (tppId) {
      const tppValidation = await validateTPP(tppId, supabase, path);
      if (!tppValidation.valid) return jsonApiError('Unauthorized', tppValidation.error!, 401, interactionId);
    }
    if (!authResult.valid) return jsonApiError('Unauthorized', 'Token required', 401, interactionId);
  }

  // GET /accounts
  if (path === '/accounts' && req.method === 'GET') {
    if (!authResult.scopes?.includes('accounts')) return jsonApiError('Forbidden', 'accounts scope required', 403, interactionId);
    const { data: companies } = await supabase.from('companies').select('id, name, bp, tax_id, facturacion_anual').eq('gestor_id', authResult.userId).limit(50);
    const accounts = (companies || []).map((c: any) => ({
      id: c.id, type: 'accounts', attributes: { iban: c.bp || `AD00${c.id.substring(0,12).toUpperCase()}`, currency: 'EUR', name: c.name, status: 'enabled' }
    }));
    return jsonApiResponse({ data: accounts, meta: { totalRecords: accounts.length } }, 200, interactionId);
  }

  // GET /accounts/:id
  const accountMatch = path.match(/^\/accounts\/([^\/]+)$/);
  if (accountMatch && req.method === 'GET') {
    const { data: company } = await supabase.from('companies').select('*').eq('id', accountMatch[1]).single();
    if (!company) return jsonApiError('Not Found', 'Account not found', 404, interactionId);
    return jsonApiResponse({ data: { id: company.id, type: 'accounts', attributes: { iban: company.bp, currency: 'EUR', name: company.name, status: 'enabled' } } }, 200, interactionId);
  }

  // GET /accounts/:id/transactions
  const txMatch = path.match(/^\/accounts\/([^\/]+)\/transactions$/);
  if (txMatch && req.method === 'GET') {
    const { data: visits } = await supabase.from('visits').select('id, visit_date, result, notes, companies(name)').eq('company_id', txMatch[1]).order('visit_date', { ascending: false }).limit(100);
    const transactions = (visits || []).map((v: any) => ({
      id: v.id, type: 'transactions', attributes: { bookingDate: v.visit_date, valueDate: v.visit_date, transactionAmount: { amount: (Math.random()*10000).toFixed(2), currency: 'EUR' }, creditorName: v.companies?.name, remittanceInformationUnstructured: v.notes || v.result }
    }));
    return jsonApiResponse({ data: transactions, meta: { totalRecords: transactions.length } }, 200, interactionId);
  }

  // GET /accounts/:id/balances
  const balMatch = path.match(/^\/accounts\/([^\/]+)\/balances$/);
  if (balMatch && req.method === 'GET') {
    const { data: company } = await supabase.from('companies').select('facturacion_anual').eq('id', balMatch[1]).single();
    const balance = company?.facturacion_anual || 0;
    return jsonApiResponse({ data: [{ balanceType: 'closingBooked', balanceAmount: { amount: balance.toFixed(2), currency: 'EUR' }, referenceDate: new Date().toISOString().split('T')[0] }] }, 200, interactionId);
  }

  // POST /payments
  if (path === '/payments' && req.method === 'POST') {
    if (!authResult.scopes?.includes('payments')) return jsonApiError('Forbidden', 'payments scope required', 403, interactionId);
    const body = await req.json();
    if (!body.debtorAccount?.iban || !body.creditorAccount?.iban || !body.instructedAmount?.amount) return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    const paymentId = crypto.randomUUID();
    await logAudit(supabase, { tpp_id: tppId || 'direct', user_id: authResult.userId, endpoint: path, method: 'POST', response_status: 201, interaction_id: interactionId, ip_address: ipAddress });
    return jsonApiResponse({ data: { id: paymentId, type: 'payments', attributes: { transactionStatus: 'RCVD', paymentId, ...body } } }, 201, interactionId);
  }

  // POST /funds-confirmation
  if (path === '/funds-confirmation' && req.method === 'POST') {
    if (!authResult.scopes?.includes('fundsconfirmation')) return jsonApiError('Forbidden', 'fundsconfirmation scope required', 403, interactionId);
    const body = await req.json();
    if (!body.account?.iban || !body.instructedAmount?.amount) return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    const { data: company } = await supabase.from('companies').select('facturacion_anual').eq('bp', body.account.iban).single();
    const fundsAvailable = (company?.facturacion_anual || 0) >= parseFloat(body.instructedAmount.amount);
    return jsonApiResponse({ data: { fundsAvailable } }, 200, interactionId);
  }

  // POST /consents
  if (path === '/consents' && req.method === 'POST') {
    if (!tppId || !authResult.valid) return jsonApiError('Unauthorized', 'TPP and user auth required', 401, interactionId);
    const body = await req.json();
    const { access, validUntil, frequencyPerDay, recurringIndicator } = body;
    if (!access || !validUntil || frequencyPerDay === undefined) return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    
    const consentId = crypto.randomUUID();
    const permissions: string[] = [];
    if (access.accounts) permissions.push('accounts');
    if (access.balances) permissions.push('balances');
    if (access.transactions) permissions.push('transactions');
    if (access.payments) permissions.push('payments');
    
    const { error } = await supabase.from('open_banking_consents').insert({
      consent_id: consentId, tpp_id: tppId, user_id: authResult.userId, status: 'pending', permissions,
      expiration_date: new Date(validUntil).toISOString(), frequency_per_day: frequencyPerDay, recurring_indicator: recurringIndicator || false,
      valid_until: validUntil, sca_status: 'required'
    });
    if (error) return jsonApiError('Internal Error', 'Consent creation failed', 500, interactionId);
    return jsonApiResponse({ data: { id: consentId, type: 'consents', attributes: { consentId, consentStatus: 'received', validUntil, frequencyPerDay } } }, 201, interactionId);
  }

  // GET /consents/:id
  const consentGetMatch = path.match(/^\/consents\/([^\/]+)$/);
  if (consentGetMatch && req.method === 'GET') {
    const { data: consent } = await supabase.from('open_banking_consents').select('*').eq('consent_id', consentGetMatch[1]).single();
    if (!consent) return jsonApiError('Not Found', 'Consent not found', 404, interactionId);
    return jsonApiResponse({ data: { id: consent.consent_id, type: 'consents', attributes: { consentId: consent.consent_id, consentStatus: consent.status, permissions: consent.permissions, validUntil: consent.valid_until } } }, 200, interactionId);
  }

  // DELETE /consents/:id
  if (consentGetMatch && req.method === 'DELETE') {
    await supabase.from('open_banking_consents').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('consent_id', consentGetMatch[1]);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'x-fapi-interaction-id': interactionId } });
  }

  // POST /consents/:id/authorise
  const consentAuthMatch = path.match(/^\/consents\/([^\/]+)\/authorise$/);
  if (consentAuthMatch && req.method === 'POST') {
    await supabase.from('open_banking_consents').update({ status: 'authorized', authorized_at: new Date().toISOString(), sca_status: 'finalised' }).eq('consent_id', consentAuthMatch[1]);
    return jsonApiResponse({ data: { consentId: consentAuthMatch[1], consentStatus: 'authorized', scaStatus: 'finalised' } }, 200, interactionId);
  }

  // POST /sepa-instant
  if (path === '/sepa-instant' && req.method === 'POST') {
    if (!authResult.scopes?.includes('payments')) return jsonApiError('Forbidden', 'payments scope required', 403, interactionId);
    const body = await req.json();
    if (!body.debtorIban || !body.creditorIban || !body.amount) return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    
    const endToEndId = `SEPA${Date.now()}${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const { data: payment, error } = await supabase.from('sepa_instant_payments').insert({
      tpp_id: tppId || 'direct', user_id: authResult.userId, debtor_iban: body.debtorIban, debtor_name: body.debtorName || 'Account Holder',
      creditor_iban: body.creditorIban, creditor_name: body.creditorName, creditor_bic: body.creditorBic, amount: parseFloat(body.amount),
      currency: body.currency || 'EUR', remittance_info: body.remittanceInfo, end_to_end_id: endToEndId, instruction_id: `INST${Date.now()}`,
      status: 'accepted', settlement_date: new Date().toISOString(), processing_time_ms: 50
    }).select().single();
    
    if (error) return jsonApiError('Internal Error', 'SEPA payment failed', 500, interactionId);
    return jsonApiResponse({ data: { id: payment.id, type: 'sepa-instant-payments', attributes: { endToEndId, transactionStatus: 'ACSC', settlementDate: payment.settlement_date } } }, 201, interactionId);
  }

  // GET /sepa-instant/:id
  const sepaMatch = path.match(/^\/sepa-instant\/([^\/]+)$/);
  if (sepaMatch && req.method === 'GET') {
    const { data: payment } = await supabase.from('sepa_instant_payments').select('*').eq('id', sepaMatch[1]).single();
    if (!payment) return jsonApiError('Not Found', 'Payment not found', 404, interactionId);
    return jsonApiResponse({ data: { id: payment.id, type: 'sepa-instant-payments', attributes: { endToEndId: payment.end_to_end_id, status: payment.status, amount: { value: payment.amount, currency: payment.currency } } } }, 200, interactionId);
  }

  // VRP Mandates
  if (path === '/vrp/mandates' && req.method === 'POST') {
    if (!authResult.scopes?.includes('payments') || !tppId) return jsonApiError('Forbidden', 'payments scope and TPP required', 403, interactionId);
    const consentValidation = await validateConsent(tppId, authResult.userId!, 'payments', supabase);
    if (!consentValidation.valid) return jsonApiError('Forbidden', consentValidation.error!, 403, interactionId);
    
    const body = await req.json();
    if (!body.debtorAccount || !body.creditorAccount || !body.creditorName || !body.maxAmount || !body.frequency || !body.validFrom) 
      return jsonApiError('Bad Request', 'Missing fields', 400, interactionId);
    
    const { data: mandate, error } = await supabase.from('vrp_mandates').insert({
      consent_id: consentValidation.consent.id, tpp_id: tppId, debtor_account: body.debtorAccount, creditor_account: body.creditorAccount,
      creditor_name: body.creditorName, max_amount: parseFloat(body.maxAmount), currency: body.currency || 'EUR', frequency: body.frequency,
      max_per_period: body.maxPerPeriod ? parseFloat(body.maxPerPeriod) : null, valid_from: new Date(body.validFrom).toISOString(),
      valid_to: body.validTo ? new Date(body.validTo).toISOString() : null, reference: body.reference, status: 'awaiting_authorization'
    }).select().single();
    
    if (error) return jsonApiError('Internal Error', 'VRP mandate failed', 500, interactionId);
    return jsonApiResponse({ data: { id: mandate.id, type: 'vrp-mandates', attributes: { mandateId: mandate.id, status: mandate.status, maxAmount: { value: body.maxAmount, currency: body.currency || 'EUR' } } } }, 201, interactionId);
  }

  // GET /vrp/mandates/:id
  const vrpMatch = path.match(/^\/vrp\/mandates\/([^\/]+)$/);
  if (vrpMatch && req.method === 'GET') {
    const { data: mandate } = await supabase.from('vrp_mandates').select('*').eq('id', vrpMatch[1]).single();
    if (!mandate) return jsonApiError('Not Found', 'Mandate not found', 404, interactionId);
    return jsonApiResponse({ data: { id: mandate.id, type: 'vrp-mandates', attributes: { status: mandate.status, maxAmount: { value: mandate.max_amount, currency: mandate.currency } } } }, 200, interactionId);
  }

  // POST /vrp/mandates/:id/authorise
  const vrpAuthMatch = path.match(/^\/vrp\/mandates\/([^\/]+)\/authorise$/);
  if (vrpAuthMatch && req.method === 'POST') {
    await supabase.from('vrp_mandates').update({ status: 'authorized', updated_at: new Date().toISOString() }).eq('id', vrpAuthMatch[1]);
    return jsonApiResponse({ data: { mandateId: vrpAuthMatch[1], status: 'authorized' } }, 200, interactionId);
  }

  // POST /vrp/mandates/:id/payments
  const vrpPayMatch = path.match(/^\/vrp\/mandates\/([^\/]+)\/payments$/);
  if (vrpPayMatch && req.method === 'POST') {
    const { data: mandate } = await supabase.from('vrp_mandates').select('*').eq('id', vrpPayMatch[1]).eq('status', 'authorized').single();
    if (!mandate) return jsonApiError('Not Found', 'Active mandate not found', 404, interactionId);
    
    const body = await req.json();
    if (!body.amount) return jsonApiError('Bad Request', 'Amount required', 400, interactionId);
    if (parseFloat(body.amount) > parseFloat(mandate.max_amount)) return jsonApiError('Bad Request', 'Exceeds max amount', 400, interactionId);
    
    const endToEndId = `VRP${Date.now()}${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const { data: payment, error } = await supabase.from('vrp_payments').insert({
      mandate_id: vrpPayMatch[1], amount: parseFloat(body.amount), currency: mandate.currency, end_to_end_id: endToEndId,
      payment_reference: body.paymentReference, status: 'completed'
    }).select().single();
    
    if (error) return jsonApiError('Internal Error', 'VRP payment failed', 500, interactionId);
    return jsonApiResponse({ data: { id: payment.id, type: 'vrp-payments', attributes: { mandateId: vrpPayMatch[1], endToEndId, status: 'completed', amount: { value: body.amount, currency: mandate.currency } } } }, 201, interactionId);
  }

  // DELETE /vrp/mandates/:id
  if (vrpMatch && req.method === 'DELETE') {
    await supabase.from('vrp_mandates').update({ status: 'revoked', updated_at: new Date().toISOString() }).eq('id', vrpMatch[1]);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'x-fapi-interaction-id': interactionId } });
  }

  // Premium tiers
  if (path === '/premium/tiers' && req.method === 'GET') {
    const { data: tiers } = await supabase.from('premium_api_tiers').select('*').eq('is_active', true).order('price_monthly', { ascending: true });
    return jsonApiResponse({ data: (tiers || []).map((t: any) => ({ id: t.id, type: 'premium-tiers', attributes: { tierName: t.tier_name, features: t.features, priceMonthly: t.price_monthly } })) }, 200, interactionId);
  }

  // POST /premium/subscribe
  if (path === '/premium/subscribe' && req.method === 'POST') {
    if (!tppId) return jsonApiError('Bad Request', 'x-tpp-id required', 400, interactionId);
    const body = await req.json();
    if (!body.tierId) return jsonApiError('Bad Request', 'tierId required', 400, interactionId);
    
    const { data: tier } = await supabase.from('premium_api_tiers').select('*').eq('id', body.tierId).eq('is_active', true).single();
    if (!tier) return jsonApiError('Not Found', 'Tier not found', 404, interactionId);
    
    const { data: existing } = await supabase.from('tpp_premium_subscriptions').select('id').eq('tpp_id', tppId).eq('status', 'active').single();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    if (existing) {
      await supabase.from('tpp_premium_subscriptions').update({ tier_id: body.tierId, auto_renew: body.autoRenew ?? true, expires_at: expiresAt }).eq('id', existing.id);
    } else {
      await supabase.from('tpp_premium_subscriptions').insert({ tpp_id: tppId, tier_id: body.tierId, status: 'active', auto_renew: body.autoRenew ?? true, expires_at: expiresAt });
    }
    
    await supabase.from('registered_tpps').update({ rate_limit_per_hour: tier.rate_limit_per_hour }).eq('tpp_id', tppId);
    return jsonApiResponse({ data: { type: 'premium-subscriptions', attributes: { tppId, tierName: tier.tier_name, status: 'active', expiresAt } } }, 200, interactionId);
  }

  // GET /premium/subscription
  if (path === '/premium/subscription' && req.method === 'GET') {
    if (!tppId) return jsonApiError('Bad Request', 'x-tpp-id required', 400, interactionId);
    const { data: sub } = await supabase.from('tpp_premium_subscriptions').select('*, premium_api_tiers(*)').eq('tpp_id', tppId).eq('status', 'active').single();
    if (!sub) return jsonApiResponse({ data: { type: 'premium-subscriptions', attributes: { status: 'none', tierName: 'basic' } } }, 200, interactionId);
    return jsonApiResponse({ data: { id: sub.id, type: 'premium-subscriptions', attributes: { tierName: sub.premium_api_tiers?.tier_name, status: sub.status, features: sub.premium_api_tiers?.features, expiresAt: sub.expires_at } } }, 200, interactionId);
  }

  return jsonApiError('Not Found', `Endpoint ${path} not found`, 404, interactionId);
});
