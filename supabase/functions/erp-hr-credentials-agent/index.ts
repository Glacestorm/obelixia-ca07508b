import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialRequest {
  action: 'issue_credential' | 'verify_credential' | 'revoke_credential' | 
          'list_credentials' | 'generate_proof' | 'audit_trail';
  credentialType?: string;
  employeeId?: string;
  credentialId?: string;
  credentialData?: Record<string, unknown>;
  verificationCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, credentialType, employeeId, credentialId, credentialData, verificationCode } = 
      await req.json() as CredentialRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'issue_credential':
        systemPrompt = `Eres un sistema de emisión de credenciales digitales verificables para RRHH.
        
TIPOS DE CREDENCIALES SOPORTADAS:
- employment: Certificado de empleo activo
- training: Certificación de formación completada
- skills: Acreditación de competencias verificadas
- compliance: Certificación de cumplimiento normativo
- performance: Reconocimiento de desempeño
- safety: Certificación PRL/Seguridad Laboral

FORMATO DE RESPUESTA (JSON estricto):
{
  "credential": {
    "id": "uuid-generado",
    "type": "tipo_credencial",
    "issuer": "Obelixia HR System",
    "issuanceDate": "ISO-8601",
    "expirationDate": "ISO-8601 o null",
    "credentialSubject": {
      "id": "employee_id",
      "name": "nombre_empleado",
      "claims": {...}
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "ISO-8601",
      "verificationMethod": "did:web:obelixia.hr#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": "hash_simulado_base64"
    }
  },
  "verificationUrl": "https://verify.obelixia.hr/credential/{id}",
  "qrCodeData": "data_para_qr",
  "blockchain": {
    "network": "Polygon",
    "txHash": "hash_simulado",
    "blockNumber": numero,
    "timestamp": "ISO-8601"
  }
}`;
        userPrompt = `Emite una credencial de tipo "${credentialType}" para el empleado ${employeeId}.
Datos adicionales: ${JSON.stringify(credentialData)}
Genera un identificador único, fecha de emisión actual y estructura completa de credencial verificable.`;
        break;

      case 'verify_credential':
        systemPrompt = `Eres un sistema de verificación de credenciales digitales.
        
PROCESO DE VERIFICACIÓN:
1. Validar estructura de la credencial
2. Verificar firma criptográfica
3. Comprobar estado de revocación
4. Validar vigencia temporal
5. Confirmar emisor autorizado

FORMATO DE RESPUESTA (JSON estricto):
{
  "verified": true/false,
  "status": "valid" | "expired" | "revoked" | "invalid",
  "checks": {
    "signature": { "passed": true/false, "details": "..." },
    "revocation": { "passed": true/false, "details": "..." },
    "expiration": { "passed": true/false, "details": "..." },
    "issuer": { "passed": true/false, "details": "..." }
  },
  "credential": {
    "type": "...",
    "subject": "...",
    "issuedAt": "...",
    "expiresAt": "..."
  },
  "verifiedAt": "ISO-8601",
  "verifierInfo": {
    "method": "Ed25519Signature2020",
    "confidence": 0-100
  }
}`;
        userPrompt = `Verifica la credencial con ID: ${credentialId}
Código de verificación: ${verificationCode}
Realiza todas las comprobaciones de seguridad.`;
        break;

      case 'revoke_credential':
        systemPrompt = `Eres un sistema de revocación de credenciales digitales.
        
MOTIVOS DE REVOCACIÓN:
- termination: Fin de relación laboral
- fraud: Detección de fraude
- error: Error en emisión
- update: Actualización requerida
- request: Solicitud del titular

FORMATO DE RESPUESTA (JSON estricto):
{
  "revoked": true,
  "credentialId": "...",
  "revocationDate": "ISO-8601",
  "reason": "...",
  "revokedBy": "...",
  "blockchain": {
    "txHash": "...",
    "blockNumber": number
  },
  "notification": {
    "sent": true,
    "recipients": ["..."],
    "method": "email"
  }
}`;
        userPrompt = `Revoca la credencial ${credentialId}.
Motivo: ${credentialData?.reason || 'No especificado'}
Registra en blockchain y notifica a las partes relevantes.`;
        break;

      case 'list_credentials':
        systemPrompt = `Eres un sistema de consulta de credenciales digitales para empleados.

FORMATO DE RESPUESTA (JSON estricto):
{
  "credentials": [
    {
      "id": "uuid",
      "type": "tipo",
      "title": "título_legible",
      "status": "active" | "expired" | "revoked",
      "issuedAt": "ISO-8601",
      "expiresAt": "ISO-8601 o null",
      "issuer": "emisor",
      "verificationUrl": "url",
      "badgeIcon": "emoji_o_url"
    }
  ],
  "summary": {
    "total": number,
    "active": number,
    "expired": number,
    "revoked": number
  },
  "recommendations": ["..."]
}`;
        userPrompt = `Lista todas las credenciales del empleado ${employeeId}.
Incluye estado actual y recomendaciones de renovación.`;
        break;

      case 'generate_proof':
        systemPrompt = `Eres un generador de pruebas selectivas (Selective Disclosure) para credenciales.
        
PRINCIPIO: El empleado puede compartir solo ciertos atributos de su credencial sin revelar toda la información.

FORMATO DE RESPUESTA (JSON estricto):
{
  "proof": {
    "id": "uuid",
    "type": "SelectiveDisclosure2023",
    "credentialId": "...",
    "disclosedClaims": {
      "campo1": "valor1",
      "campo2": "valor2"
    },
    "hiddenClaims": ["campo3", "campo4"],
    "proofValue": "hash_zk_simulado",
    "validUntil": "ISO-8601",
    "singleUse": true/false
  },
  "shareableLink": "https://verify.obelixia.hr/proof/{id}",
  "qrCodeData": "...",
  "instructions": "..."
}`;
        userPrompt = `Genera una prueba selectiva para la credencial ${credentialId}.
Atributos a revelar: ${JSON.stringify(credentialData?.disclosedFields || [])}
Atributos a ocultar: ${JSON.stringify(credentialData?.hiddenFields || [])}`;
        break;

      case 'audit_trail':
        systemPrompt = `Eres un sistema de auditoría de credenciales con trazabilidad inmutable.

FORMATO DE RESPUESTA (JSON estricto):
{
  "auditTrail": [
    {
      "timestamp": "ISO-8601",
      "action": "issued" | "verified" | "shared" | "revoked",
      "actor": "...",
      "details": "...",
      "ipAddress": "...",
      "txHash": "..."
    }
  ],
  "integrity": {
    "verified": true,
    "hashChain": "valid",
    "lastVerified": "ISO-8601"
  },
  "statistics": {
    "totalVerifications": number,
    "lastVerification": "ISO-8601",
    "verifierLocations": ["..."]
  }
}`;
        userPrompt = `Genera el historial de auditoría para la credencial ${credentialId}.
Incluye todas las operaciones registradas en blockchain.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-credentials-agent] Processing: ${action}`);

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
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded' 
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
    } catch (parseError) {
      console.error('[erp-hr-credentials-agent] Parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-credentials-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-credentials-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
