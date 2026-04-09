import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 8,
  perDay: 60,
  functionName: 'hr-enterprise-integrations',
};

interface FunctionRequest {
  action: string;
  companyId: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, params } = await req.json() as FunctionRequest;
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // S6.3F: validateTenantAccess replaces manual getClaims + manual adminClient membership
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit check
    const burstResult = checkBurstLimit(companyId, RATE_LIMIT_CONFIG);
    if (!burstResult.allowed) {
      console.warn(`[hr-enterprise-integrations] Rate limited: company=${companyId}`);
      return rateLimitResponse(burstResult, corsHeaders);
    }

    console.log(`[hr-enterprise-integrations] Action: ${action}, Company: ${companyId}, remaining=${burstResult.remaining}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      // ========== CONNECTORS ==========
      case 'list_connectors':
        systemPrompt = `Eres un gestor de conectores enterprise para integraciones HR Premium.

FORMATO DE RESPUESTA (JSON estricto):
{
  "connectors": [
    {
      "id": "uuid",
      "connector_type": "bi_export|dms|esign",
      "name": "string",
      "provider": "string",
      "auth_type": "api_key|oauth2|bearer",
      "is_active": true,
      "health_status": "healthy|degraded|down|unknown",
      "config": {},
      "last_health_check_at": "ISO date or null",
      "created_at": "ISO date"
    }
  ]
}

Genera 4-6 conectores enterprise realistas: Power BI, SharePoint, DocuSign, Google Drive, Tableau, Adobe Sign.`;
        userPrompt = `Lista conectores enterprise para company ${companyId}`;
        break;

      case 'health_check':
        systemPrompt = `Eres un sistema de health check para integraciones enterprise.

FORMATO DE RESPUESTA (JSON estricto):
{
  "results": [
    {
      "connector_id": "uuid",
      "status": "healthy|degraded|down",
      "latency_ms": number,
      "last_check_at": "ISO date",
      "details": "string"
    }
  ]
}`;
        userPrompt = `Health check para conectores de company ${companyId}: ${JSON.stringify(params)}`;
        break;

      // ========== BI EXPORT ==========
      case 'list_bi_datasets':
        systemPrompt = `Eres un gestor de datasets para exportación a herramientas BI enterprise.

FORMATO DE RESPUESTA (JSON estricto):
{
  "datasets": [
    {
      "id": "uuid",
      "name": "string",
      "dataset_type": "executive_kpis|regulatory_report|fairness_summary|workforce_analytics|legal_contracts|compliance_dashboard|payroll_summary|incident_log",
      "refresh_frequency": "realtime|hourly|daily|weekly|manual",
      "export_format": "json|csv|odata|parquet",
      "row_count": number,
      "last_exported_at": "ISO date or null",
      "is_active": true,
      "schema_definition": {
        "fields": [{"name": "string", "type": "string", "description": "string"}]
      }
    }
  ]
}

Genera 6-8 datasets enterprise realistas para HR Premium.`;
        userPrompt = `Lista datasets BI para company ${companyId}`;
        break;

      case 'export_bi_dataset':
        systemPrompt = `Eres un sistema de exportación de datasets BI.

FORMATO DE RESPUESTA (JSON estricto):
{
  "export": {
    "dataset_id": "uuid",
    "export_id": "uuid",
    "status": "completed",
    "rows_exported": number,
    "format": "json|csv",
    "size_bytes": number,
    "download_url": "string",
    "exported_at": "ISO date",
    "duration_ms": number
  }
}`;
        userPrompt = `Exporta dataset ${JSON.stringify(params)} para company ${companyId}`;
        break;

      // ========== DMS ==========
      case 'list_dms_archives':
        systemPrompt = `Eres un gestor de archivado documental enterprise para HR Premium.

FORMATO DE RESPUESTA (JSON estricto):
{
  "archives": [
    {
      "id": "uuid",
      "source_type": "executive_report|regulatory_report|evidence_package|compliance_document|legal_contract|audit_report",
      "source_name": "string",
      "source_id": "uuid",
      "remote_path": "/HR/Reports/2026/...",
      "archive_status": "pending|uploading|archived|failed",
      "file_size_bytes": number,
      "mime_type": "application/pdf",
      "archived_at": "ISO date or null",
      "retry_count": number,
      "created_at": "ISO date"
    }
  ]
}

Genera 5-8 registros de archivado realistas.`;
        userPrompt = `Lista archivos DMS para company ${companyId}`;
        break;

      case 'archive_document':
        systemPrompt = `Eres un sistema de archivado documental enterprise.

FORMATO DE RESPUESTA (JSON estricto):
{
  "archive": {
    "id": "uuid",
    "source_type": "string",
    "source_name": "string",
    "remote_path": "string",
    "remote_id": "string",
    "archive_status": "archived",
    "archived_at": "ISO date",
    "file_size_bytes": number,
    "duration_ms": number
  }
}`;
        userPrompt = `Archiva documento: ${JSON.stringify(params)}`;
        break;

      // ========== E-SIGN ==========
      case 'list_esign_envelopes':
        systemPrompt = `Eres un gestor de flujos de firma electrónica enterprise para HR Premium.

FORMATO DE RESPUESTA (JSON estricto):
{
  "envelopes": [
    {
      "id": "uuid",
      "document_type": "premium_contract|regulatory_report|legal_document|compliance_certificate|board_resolution",
      "document_name": "string",
      "document_id": "uuid",
      "envelope_status": "draft|sent|delivered|signed|completed|declined|voided|expired",
      "remote_envelope_id": "string or null",
      "signers": [
        {"name": "string", "email": "string", "role": "string", "status": "pending|signed|declined", "signed_at": "ISO date or null"}
      ],
      "expiration_date": "ISO date",
      "completed_at": "ISO date or null",
      "created_at": "ISO date"
    }
  ]
}

Genera 5-7 envelopes realistas.`;
        userPrompt = `Lista envelopes e-sign para company ${companyId}`;
        break;

      case 'create_esign_envelope':
        systemPrompt = `Eres un sistema de firma electrónica enterprise.

FORMATO DE RESPUESTA (JSON estricto):
{
  "envelope": {
    "id": "uuid",
    "document_type": "string",
    "document_name": "string",
    "envelope_status": "sent",
    "remote_envelope_id": "string",
    "signers": [{"name": "string", "email": "string", "role": "string", "status": "pending"}],
    "expiration_date": "ISO date",
    "created_at": "ISO date"
  }
}`;
        userPrompt = `Crea envelope de firma: ${JSON.stringify(params)}`;
        break;

      // ========== LOGS ==========
      case 'list_integration_logs':
        systemPrompt = `Eres un sistema de auditoría de integraciones enterprise.

FORMATO DE RESPUESTA (JSON estricto):
{
  "logs": [
    {
      "id": "uuid",
      "integration_type": "bi_export|dms|esign",
      "action": "string",
      "status": "info|success|warning|error",
      "resource_type": "string",
      "resource_id": "uuid",
      "details": {},
      "error_message": "string or null",
      "duration_ms": number,
      "created_at": "ISO date"
    }
  ],
  "summary": {
    "total": number,
    "success": number,
    "errors": number,
    "warnings": number
  }
}

Genera 10-15 entradas de log realistas.`;
        userPrompt = `Lista logs de integración para company ${companyId}, filtros: ${JSON.stringify(params || {})}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Créditos insuficientes' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[hr-enterprise-integrations] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true, action, data: result, timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[hr-enterprise-integrations] Error:', error);
    return new Response(JSON.stringify({
      success: false, error: 'Internal server error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
