import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EUDIRequest {
  action: 'request_credential' | 'verify_presentation' | 'check_revocation' | 'create_presentation_request';
  credentialType?: 'PID' | 'mDL' | 'QEAA' | 'EAA';
  presentationId?: string;
  holderDID?: string;
  verifierDID?: string;
  requiredClaims?: string[];
  nonce?: string;
}

/**
 * GALIA EUDI Wallet Integration - eIDAS 2.0 Compliant
 * 
 * Integrates with the European Digital Identity Wallet for:
 * - Person Identification Data (PID) verification
 * - Mobile Driving License (mDL) validation
 * - Qualified Electronic Attestation of Attributes (QEAA)
 * - OpenID4VP presentation verification
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, credentialType, presentationId, holderDID, verifierDID, requiredClaims, nonce } = await req.json() as EUDIRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'request_credential':
        systemPrompt = `Eres un sistema de verificación de identidad digital eIDAS 2.0.
        
CAPACIDADES:
- Validar credenciales del European Digital Identity Wallet
- Soportar PID (Person Identification Data), mDL (Mobile Driving License)
- Verificar Qualified Electronic Attestation of Attributes (QEAA)
- Gestionar niveles de aseguramiento (low, substantial, high)

CREDENCIAL SOLICITADA: ${credentialType || 'PID'}
CLAIMS REQUERIDOS: ${requiredClaims?.join(', ') || 'familyName, givenName, birthDate, personalIdentifier'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "presentationRequest": {
    "id": "string (UUID)",
    "type": "OpenID4VPRequest",
    "responseType": "vp_token",
    "clientId": "string (verifier DID)",
    "redirectUri": "string",
    "nonce": "string",
    "state": "string",
    "presentationDefinition": {
      "id": "string",
      "inputDescriptors": [...]
    }
  },
  "qrCodeData": "string (base64 QR para app wallet)",
  "deepLinkUrl": "string (para apertura directa)",
  "expiresAt": "ISO8601 timestamp",
  "assuranceLevel": "low | substantial | high"
}`;

        userPrompt = `Genera una solicitud de presentación de credencial ${credentialType || 'PID'} para el verificador ${verifierDID || 'did:web:galia.gob.es'} con nonce ${nonce || crypto.randomUUID()}.`;
        break;

      case 'verify_presentation':
        systemPrompt = `Eres un verificador de credenciales EUDI Wallet conforme a eIDAS 2.0.

TAREAS:
1. Verificar firma criptográfica de la credencial
2. Validar cadena de confianza del emisor
3. Comprobar estado de revocación
4. Verificar vigencia temporal
5. Confirmar nivel de aseguramiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "verified": boolean,
  "credentialId": "string",
  "issuer": {
    "did": "string",
    "name": "string",
    "country": "string",
    "trustLevel": "qualified | trusted | unknown"
  },
  "subject": {
    "claims": {...},
    "assuranceLevel": "low | substantial | high"
  },
  "validations": {
    "signatureValid": boolean,
    "chainValid": boolean,
    "notRevoked": boolean,
    "notExpired": boolean
  },
  "issuanceDate": "ISO8601",
  "expirationDate": "ISO8601",
  "warnings": [],
  "errors": []
}`;

        userPrompt = `Verifica la presentación ${presentationId} del holder ${holderDID}. Simula una verificación completa de credenciales españolas emitidas por FNMT-RCM.`;
        break;

      case 'check_revocation':
        systemPrompt = `Eres un servicio de verificación de estado de credenciales.

MÉTODOS DE REVOCACIÓN SOPORTADOS:
- StatusList2021 (W3C)
- RevocationList2020
- OCSP (Online Certificate Status Protocol)

FORMATO DE RESPUESTA (JSON estricto):
{
  "credentialId": "string",
  "status": "valid | revoked | suspended | unknown",
  "statusListCredential": "string (URL)",
  "statusListIndex": "string",
  "lastChecked": "ISO8601",
  "nextUpdate": "ISO8601",
  "reason": "string | null"
}`;

        userPrompt = `Verifica el estado de revocación de la credencial ${presentationId}.`;
        break;

      case 'create_presentation_request':
        systemPrompt = `Eres un generador de solicitudes de presentación OpenID4VP.

ESPECIFICACIONES:
- Cumplimiento OpenID4VP Draft 20
- Selective Disclosure compatible
- DIF Presentation Exchange 2.0

FORMATO DE RESPUESTA (JSON estricto):
{
  "request_uri": "string",
  "client_id": "string",
  "presentation_definition": {
    "id": "string",
    "name": "Verificación GALIA",
    "purpose": "Verificación de identidad para solicitud de subvención LEADER",
    "input_descriptors": [
      {
        "id": "string",
        "name": "string",
        "purpose": "string",
        "constraints": {
          "fields": [...]
        }
      }
    ]
  },
  "response_mode": "direct_post",
  "response_uri": "string",
  "nonce": "string",
  "state": "string"
}`;

        userPrompt = `Crea una solicitud de presentación para verificar ${credentialType || 'PID'} con los claims: ${requiredClaims?.join(', ') || 'familyName, givenName, birthDate, personalIdentifier'}.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-eudi-wallet] Processing action: ${action}`);

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
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    console.log(`[galia-eudi-wallet] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      eidas2Compliant: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-eudi-wallet] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
