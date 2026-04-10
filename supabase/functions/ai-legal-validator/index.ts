import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";
import { successResponse, mapAuthError, validationError, internalError } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalValidationRequest {
  action: 'validate_operation' | 'check_consent' | 'log_gdpr_event' | 'get_applicable_regulations';
  operation_type?: string;
  data_classification?: string;
  data_fields?: string[];
  user_id?: string;
  destination_country?: string;
  context?: Record<string, any>;
}

interface LegalValidationResult {
  is_allowed: boolean;
  requires_consent: boolean;
  consent_type: 'explicit' | 'implicit' | 'none';
  legal_basis: string[];
  applicable_regulations: string[];
  warnings: string[];
  blocking_issues: string[];
  data_retention_days: number;
  cross_border_allowed: boolean;
  cross_border_conditions: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

// Regulation rules based on data classification and jurisdiction
const REGULATION_RULES: Record<string, {
  regulations: string[];
  requires_consent: boolean;
  consent_type: 'explicit' | 'implicit' | 'none';
  legal_basis: string[];
  retention_days: number;
  cross_border_restrictions: string[];
}> = {
  public: {
    regulations: [],
    requires_consent: false,
    consent_type: 'none',
    legal_basis: ['Legitimate interest'],
    retention_days: 365 * 10,
    cross_border_restrictions: [],
  },
  internal: {
    regulations: ['GDPR Art. 6.1.f'],
    requires_consent: false,
    consent_type: 'none',
    legal_basis: ['Legitimate interest', 'Contract performance'],
    retention_days: 365 * 5,
    cross_border_restrictions: [],
  },
  confidential: {
    regulations: ['GDPR Art. 6', 'LOPDGDD Art. 6'],
    requires_consent: true,
    consent_type: 'implicit',
    legal_basis: ['Contract performance', 'Legal obligation'],
    retention_days: 365 * 3,
    cross_border_restrictions: ['Non-EU requires SCCs'],
  },
  restricted: {
    regulations: ['GDPR Art. 9', 'LOPDGDD Art. 9', 'GDPR Art. 44-49'],
    requires_consent: true,
    consent_type: 'explicit',
    legal_basis: ['Explicit consent only'],
    retention_days: 365,
    cross_border_restrictions: ['Local processing only', 'No external AI allowed'],
  },
};

// Sensitive data patterns for auto-detection
const SENSITIVE_PATTERNS = [
  { pattern: /\b\d{8,9}[A-Z]\b/i, type: 'DNI/NIF', classification: 'confidential' },
  { pattern: /\b[A-Z]\d{8}\b/i, type: 'NIE', classification: 'confidential' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, type: 'Credit Card', classification: 'restricted' },
  { pattern: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}\b/i, type: 'IBAN', classification: 'confidential' },
  { pattern: /\b\d{3}[\s.-]?\d{2}[\s.-]?\d{4}\b/, type: 'SSN', classification: 'restricted' },
  { pattern: /\b(enfermedad|diagnóstico|tratamiento|medicación|alergia)\b/i, type: 'Health Data', classification: 'restricted' },
  { pattern: /\b(religión|etnia|orientación sexual|afiliación política)\b/i, type: 'Special Category', classification: 'restricted' },
];

// Countries with adequate protection (EU standard)
const ADEQUATE_COUNTRIES = [
  'ES', 'AD', 'DE', 'FR', 'IT', 'PT', 'BE', 'NL', 'AT', 'PL', 'CZ', 'SK', 'HU',
  'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LU', 'IE', 'DK', 'SE', 'FI', 'EE',
  'LV', 'LT', 'UK', 'CH', 'NO', 'IS', 'LI', 'JP', 'KR', 'NZ', 'CA', 'AR', 'UY',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH: validateAuth (real JWT validation) ---
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders);
    const authenticatedUserId = authResult.userId;

    // --- userClient for DB ops (anon key + user JWT, goes through RLS) ---
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { action, operation_type, data_classification, data_fields, destination_country, context } = 
      await req.json() as LegalValidationRequest;

    if (!action) return validationError('action is required', corsHeaders);

    console.log(`[ai-legal-validator] Action: ${action}, Classification: ${data_classification}, User: ${authenticatedUserId}`);

    let result: any;
    const startTime = Date.now();

    switch (action) {
      case 'validate_operation':
        result = validateOperation(
          data_classification || 'public',
          operation_type || 'unknown',
          data_fields || [],
          destination_country,
          context
        );
        
        // Log the validation — use authenticatedUserId, not body.user_id
        await userClient.rpc('log_ai_legal_validation', {
          p_request_id: crypto.randomUUID(),
          p_user_id: authenticatedUserId,
          p_operation_type: operation_type || 'unknown',
          p_data_classification: data_classification || 'public',
          p_is_approved: result.is_allowed,
          p_legal_basis: result.legal_basis,
          p_applicable_regulations: result.applicable_regulations,
          p_warnings: result.warnings,
          p_blocking_issues: result.blocking_issues,
          p_requires_consent: result.requires_consent,
          p_consent_type: result.consent_type,
          p_cross_border_transfer: !!destination_country,
          p_destination_countries: destination_country ? [destination_country] : [],
          p_processing_time_ms: Date.now() - startTime,
        });
        break;

      case 'get_applicable_regulations':
        result = getApplicableRegulations(data_classification || 'public', context);
        break;

      case 'check_consent':
        result = await checkConsent(userClient, authenticatedUserId, data_classification || 'public');
        break;

      case 'log_gdpr_event':
        result = await logGDPREvent(userClient, {
          user_id: authenticatedUserId,
          operation_type,
          data_classification,
          context,
        });
        break;

      default:
        return validationError(`Unknown action: ${action}`, corsHeaders);
    }

    return successResponse({
      action,
      ...result,
      processing_time_ms: Date.now() - startTime,
    }, corsHeaders);

  } catch (error) {
    console.error('[ai-legal-validator] Error:', error);
    return internalError(corsHeaders);
  }
});

// === VALIDATE OPERATION ===
function validateOperation(
  classification: string,
  operationType: string,
  dataFields: string[],
  destinationCountry?: string,
  context?: Record<string, any>
): LegalValidationResult {
  const rules = REGULATION_RULES[classification] || REGULATION_RULES.public;
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  let detectedClassification = classification;
  for (const field of dataFields) {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.pattern.test(field)) {
        warnings.push(`Detected ${pattern.type} in data fields`);
        if (REGULATION_RULES[pattern.classification] && 
            getClassificationLevel(pattern.classification) > getClassificationLevel(detectedClassification)) {
          detectedClassification = pattern.classification;
        }
      }
    }
  }

  const effectiveRules = REGULATION_RULES[detectedClassification] || rules;

  let crossBorderAllowed = true;
  const crossBorderConditions: string[] = [];

  if (destinationCountry) {
    if (!ADEQUATE_COUNTRIES.includes(destinationCountry.toUpperCase())) {
      if (detectedClassification === 'restricted') {
        blockingIssues.push(`Cross-border transfer to ${destinationCountry} blocked for restricted data`);
        crossBorderAllowed = false;
      } else if (detectedClassification === 'confidential') {
        crossBorderConditions.push('Standard Contractual Clauses (SCCs) required');
        crossBorderConditions.push('Data Processing Agreement required');
        warnings.push(`Transfer to ${destinationCountry} requires additional safeguards`);
      }
    }
  }

  if (context?.provider_type === 'external' && detectedClassification === 'restricted') {
    blockingIssues.push('Restricted data cannot be processed by external AI providers');
    crossBorderAllowed = false;
  }

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (detectedClassification === 'restricted') {
    riskLevel = blockingIssues.length > 0 ? 'critical' : 'high';
  } else if (detectedClassification === 'confidential') {
    riskLevel = warnings.length > 0 ? 'medium' : 'low';
  }

  return {
    is_allowed: blockingIssues.length === 0,
    requires_consent: effectiveRules.requires_consent,
    consent_type: effectiveRules.consent_type,
    legal_basis: effectiveRules.legal_basis,
    applicable_regulations: effectiveRules.regulations,
    warnings,
    blocking_issues: blockingIssues,
    data_retention_days: effectiveRules.retention_days,
    cross_border_allowed: crossBorderAllowed,
    cross_border_conditions: crossBorderConditions,
    risk_level: riskLevel,
  };
}

function getClassificationLevel(classification: string): number {
  const levels: Record<string, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
    restricted: 3,
  };
  return levels[classification] || 0;
}

// === GET APPLICABLE REGULATIONS ===
function getApplicableRegulations(
  classification: string,
  context?: Record<string, any>
): {
  regulations: Array<{
    code: string;
    name: string;
    articles: string[];
    description: string;
  }>;
  jurisdiction: string[];
} {
  const regulations: Array<{
    code: string;
    name: string;
    articles: string[];
    description: string;
  }> = [];

  const jurisdiction: string[] = [];

  if (classification !== 'public') {
    regulations.push({
      code: 'GDPR',
      name: 'General Data Protection Regulation',
      articles: ['Art. 6 - Lawfulness', 'Art. 7 - Consent', 'Art. 13-14 - Information'],
      description: 'EU regulation on data protection and privacy',
    });
    jurisdiction.push('EU', 'EEA');
  }

  if (context?.country === 'ES' || !context?.country) {
    regulations.push({
      code: 'LOPDGDD',
      name: 'Ley Orgánica de Protección de Datos',
      articles: ['Art. 6 - Tratamiento', 'Art. 7 - Menores', 'Art. 89 - Empleados'],
      description: 'Spanish implementation of GDPR with additional provisions',
    });
    jurisdiction.push('ES');
  }

  if (context?.country === 'AD') {
    regulations.push({
      code: 'APDA',
      name: 'Llei 29/2021 de Protecció de Dades',
      articles: ['Art. 5 - Principis', 'Art. 6 - Consentiment'],
      description: 'Andorran data protection law',
    });
    jurisdiction.push('AD');
  }

  if (classification === 'restricted') {
    regulations.push({
      code: 'GDPR-Art9',
      name: 'GDPR Special Categories',
      articles: ['Art. 9 - Processing of special categories'],
      description: 'Rules for processing health, biometric, racial/ethnic data',
    });
  }

  if (context?.cross_border) {
    regulations.push({
      code: 'GDPR-Ch5',
      name: 'GDPR International Transfers',
      articles: ['Art. 44 - General principle', 'Art. 46 - Safeguards', 'Art. 49 - Derogations'],
      description: 'Rules for transferring data outside EU/EEA',
    });
  }

  return { regulations, jurisdiction };
}

// === CHECK CONSENT ===
async function checkConsent(
  client: any,
  userId: string,
  classification: string
): Promise<{
  has_consent: boolean;
  consent_date?: string;
  consent_type?: string;
  expires_at?: string;
}> {
  if (classification === 'public' || classification === 'internal') {
    return { has_consent: true, consent_type: 'implicit' };
  }

  return {
    has_consent: false,
    consent_type: classification === 'restricted' ? 'explicit' : 'implicit',
  };
}

// === LOG GDPR EVENT ===
async function logGDPREvent(
  client: any,
  event: {
    user_id: string;
    operation_type?: string;
    data_classification?: string;
    context?: Record<string, any>;
  }
): Promise<{ logged: boolean; event_id?: string }> {
  try {
    const { data, error } = await client
      .from('ai_audit_logs')
      .insert({
        event_type: 'gdpr_' + (event.operation_type || 'access'),
        user_id: event.user_id,
        action: event.operation_type,
        data_classification: event.data_classification,
        compliance_flags: ['GDPR', 'LOPDGDD'],
        risk_level: event.data_classification === 'restricted' ? 'high' : 'low',
        metadata: event.context,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { logged: true, event_id: data?.id };
  } catch (error) {
    console.error('[log_gdpr_event] Error:', error);
    return { logged: false };
  }
}
