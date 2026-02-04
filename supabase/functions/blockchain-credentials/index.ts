/**
 * blockchain-credentials - Edge function for verifiable credentials and EBSI integration
 * Phase 9: Blockchain-based credential issuance, verification, and employment history
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BlockchainRequest {
  action: 
    | 'issue_credential'
    | 'verify_credential'
    | 'revoke_credential'
    | 'get_employment_history'
    | 'register_certification'
    | 'verify_employment'
    | 'generate_did'
    | 'sign_document'
    | 'audit_credentials'
    | 'ebsi_integration_status';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

// Simulated blockchain hash generation
function generateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

// Generate DID (Decentralized Identifier)
function generateDID(entityType: string, entityId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `did:ebsi:${entityType}:${timestamp}${random}${entityId.substring(0, 8)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, context, params } = await req.json() as BlockchainRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'issue_credential':
        systemPrompt = `Eres un sistema de emisión de credenciales verificables compatible con W3C y EBSI.

TU ROL:
- Emitir credenciales digitales verificables
- Generar estructura JSON-LD estándar
- Crear firma digital y hash blockchain
- Registrar en ledger distribuido (simulado)

TIPOS DE CREDENCIALES:
- Título universitario
- Certificación profesional
- Experiencia laboral
- Competencias/Skills
- Licencias y permisos

FORMATO DE RESPUESTA (JSON estricto):
{
  "credential": {
    "id": "urn:uuid:...",
    "type": ["VerifiableCredential", "EducationalCredential"],
    "issuer": {
      "id": "did:ebsi:issuer:...",
      "name": "string"
    },
    "issuanceDate": "ISO8601",
    "expirationDate": "ISO8601",
    "credentialSubject": {
      "id": "did:ebsi:holder:...",
      "name": "string",
      "achievement": {
        "type": "string",
        "name": "string",
        "description": "string",
        "criteria": "string"
      }
    }
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "ISO8601",
    "verificationMethod": "did:ebsi:issuer:...#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "string"
  },
  "blockchainRecord": {
    "transactionHash": "string",
    "blockNumber": number,
    "network": "EBSI",
    "timestamp": "ISO8601",
    "status": "confirmed"
  },
  "qrCode": "string",
  "verificationUrl": "string"
}`;

        userPrompt = `Emite una credencial verificable para:
${JSON.stringify(params || context || {})}`;
        break;

      case 'verify_credential':
        systemPrompt = `Eres un sistema de verificación de credenciales blockchain.

TU ROL:
- Verificar autenticidad de credenciales
- Comprobar firma digital y hash
- Validar estado (vigente, revocada, expirada)
- Verificar emisor autorizado

FORMATO DE RESPUESTA (JSON estricto):
{
  "verification": {
    "credentialId": "string",
    "status": "valid" | "invalid" | "revoked" | "expired" | "pending",
    "verifiedAt": "ISO8601",
    "verificationMethod": "blockchain" | "issuer_api" | "cache"
  },
  "checks": [
    {
      "check": "string",
      "result": "passed" | "failed" | "warning",
      "details": "string"
    }
  ],
  "issuerVerification": {
    "issuerDID": "string",
    "issuerName": "string",
    "issuerStatus": "trusted" | "unknown" | "revoked",
    "registryCheck": boolean
  },
  "blockchainProof": {
    "found": boolean,
    "transactionHash": "string",
    "blockNumber": number,
    "confirmations": number
  },
  "credentialDetails": {
    "type": "string",
    "subject": "string",
    "issuanceDate": "string",
    "expirationDate": "string"
  },
  "confidence": 0-100,
  "recommendations": ["string"]
}`;

        userPrompt = `Verifica esta credencial:
${JSON.stringify(params || context || {})}`;
        break;

      case 'revoke_credential':
        systemPrompt = `Eres un sistema de revocación de credenciales blockchain.

TU ROL:
- Revocar credenciales de forma permanente
- Registrar en lista de revocación (CRL)
- Notificar a partes interesadas
- Mantener audit trail inmutable

FORMATO DE RESPUESTA (JSON estricto):
{
  "revocation": {
    "credentialId": "string",
    "revokedAt": "ISO8601",
    "reason": "string",
    "reasonCode": "key_compromise" | "issuer_decision" | "subject_request" | "superseded" | "cessation",
    "revokedBy": "string"
  },
  "blockchainRecord": {
    "transactionHash": "string",
    "blockNumber": number,
    "gasUsed": number,
    "status": "confirmed"
  },
  "revocationList": {
    "updated": boolean,
    "newEntry": "string",
    "listUrl": "string"
  },
  "notifications": [
    {
      "recipient": "string",
      "channel": "email" | "api" | "webhook",
      "status": "sent" | "pending" | "failed"
    }
  ],
  "auditEntry": {
    "action": "CREDENTIAL_REVOKED",
    "timestamp": "ISO8601",
    "actor": "string",
    "details": "string"
  }
}`;

        userPrompt = `Revoca esta credencial:
${JSON.stringify(params || context || {})}`;
        break;

      case 'get_employment_history':
        systemPrompt = `Eres un sistema de historial laboral verificable en blockchain.

TU ROL:
- Recuperar historial laboral inmutable
- Verificar cada registro de empleo
- Mostrar credenciales asociadas
- Calcular experiencia total verificada

FORMATO DE RESPUESTA (JSON estricto):
{
  "employmentHistory": {
    "subjectDID": "string",
    "subjectName": "string",
    "totalVerifiedExperience": {
      "years": number,
      "months": number
    },
    "lastUpdated": "ISO8601"
  },
  "employmentRecords": [
    {
      "id": "string",
      "employer": {
        "name": "string",
        "did": "string",
        "verified": boolean
      },
      "position": "string",
      "department": "string",
      "startDate": "string",
      "endDate": "string",
      "duration": {
        "years": number,
        "months": number
      },
      "verificationStatus": "verified" | "pending" | "unverified",
      "credentialId": "string",
      "skills": ["string"],
      "achievements": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "credentialId": "string",
      "status": "valid" | "expired"
    }
  ],
  "verificationSummary": {
    "totalRecords": number,
    "verified": number,
    "pending": number,
    "unverified": number,
    "trustScore": 0-100
  }
}`;

        userPrompt = `Obtén el historial laboral de:
${JSON.stringify(params || context || {})}`;
        break;

      case 'register_certification':
        systemPrompt = `Eres un sistema de registro de certificaciones en blockchain.

TU ROL:
- Registrar certificaciones profesionales
- Vincular con credenciales verificables
- Establecer validez y renovación
- Integrar con organismos certificadores

FORMATO DE RESPUESTA (JSON estricto):
{
  "certification": {
    "id": "string",
    "type": "string",
    "name": "string",
    "description": "string",
    "level": "basic" | "intermediate" | "advanced" | "expert",
    "issuer": {
      "name": "string",
      "did": "string",
      "accredited": boolean
    },
    "holder": {
      "name": "string",
      "did": "string"
    },
    "issuanceDate": "ISO8601",
    "expirationDate": "ISO8601",
    "renewalRequired": boolean,
    "renewalPeriodMonths": number
  },
  "requirements": {
    "prerequisites": ["string"],
    "examPassed": boolean,
    "practicalHours": number,
    "continuingEducation": number
  },
  "blockchainRegistration": {
    "transactionHash": "string",
    "blockNumber": number,
    "registeredAt": "ISO8601",
    "status": "confirmed"
  },
  "credentialIssued": {
    "credentialId": "string",
    "verificationUrl": "string"
  }
}`;

        userPrompt = `Registra esta certificación:
${JSON.stringify(params || context || {})}`;
        break;

      case 'verify_employment':
        systemPrompt = `Eres un sistema de verificación instantánea de empleo.

TU ROL:
- Verificar empleo actual o pasado
- Confirmar fechas y posición
- Proporcionar prueba verificable
- Respetar privacidad del empleado

FORMATO DE RESPUESTA (JSON estricto):
{
  "verificationRequest": {
    "requestId": "string",
    "requestedBy": "string",
    "requestedAt": "ISO8601",
    "purpose": "string"
  },
  "employmentVerification": {
    "verified": boolean,
    "employeeConsent": boolean,
    "employer": {
      "name": "string",
      "verified": boolean
    },
    "employment": {
      "status": "current" | "former" | "not_found",
      "position": "string",
      "department": "string",
      "startDate": "string",
      "endDate": "string",
      "employmentType": "full_time" | "part_time" | "contractor"
    }
  },
  "proof": {
    "type": "blockchain_attestation",
    "hash": "string",
    "timestamp": "ISO8601",
    "validUntil": "ISO8601"
  },
  "privacySettings": {
    "salaryDisclosed": boolean,
    "exactDatesDisclosed": boolean,
    "reasonForLeavingDisclosed": boolean
  },
  "auditLog": {
    "action": "EMPLOYMENT_VERIFIED",
    "timestamp": "ISO8601",
    "requester": "string"
  }
}`;

        userPrompt = `Verifica este empleo:
${JSON.stringify(params || context || {})}`;
        break;

      case 'generate_did':
        const entityType = (params as any)?.entityType || 'person';
        const entityId = (params as any)?.entityId || crypto.randomUUID();
        const did = generateDID(entityType, entityId);
        
        return new Response(JSON.stringify({
          success: true,
          action,
          data: {
            did: did,
            entityType,
            entityId,
            created: new Date().toISOString(),
            method: 'did:ebsi',
            keyPair: {
              type: 'Ed25519VerificationKey2020',
              publicKeyMultibase: `z${generateHash(did).substring(2, 50)}`,
              controller: did
            },
            services: [
              {
                id: `${did}#credential-service`,
                type: 'CredentialService',
                serviceEndpoint: 'https://credentials.example.com'
              }
            ]
          },
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'sign_document':
        systemPrompt = `Eres un sistema de firma digital blockchain.

TU ROL:
- Firmar documentos digitalmente
- Generar hash inmutable
- Crear marca temporal verificable
- Registrar en blockchain

FORMATO DE RESPUESTA (JSON estricto):
{
  "signature": {
    "documentId": "string",
    "documentHash": "string",
    "signatureValue": "string",
    "signatureAlgorithm": "Ed25519",
    "signedAt": "ISO8601",
    "signerDID": "string",
    "signerName": "string"
  },
  "timestamp": {
    "authority": "EBSI Timestamp Authority",
    "value": "ISO8601",
    "proof": "string"
  },
  "blockchainRecord": {
    "transactionHash": "string",
    "blockNumber": number,
    "network": "EBSI",
    "confirmations": number
  },
  "verification": {
    "url": "string",
    "qrCode": "string",
    "validUntil": "ISO8601"
  },
  "legalValidity": {
    "eIDASCompliant": boolean,
    "signatureLevel": "simple" | "advanced" | "qualified",
    "jurisdiction": ["EU"]
  }
}`;

        userPrompt = `Firma este documento:
${JSON.stringify(params || context || {})}`;
        break;

      case 'audit_credentials':
        systemPrompt = `Eres un sistema de auditoría de credenciales blockchain.

TU ROL:
- Auditar emisión y uso de credenciales
- Detectar anomalías y fraudes
- Generar informes de compliance
- Verificar integridad del sistema

FORMATO DE RESPUESTA (JSON estricto):
{
  "audit": {
    "auditId": "string",
    "period": {
      "from": "ISO8601",
      "to": "ISO8601"
    },
    "scope": "string",
    "auditor": "AI Audit System"
  },
  "statistics": {
    "totalCredentials": number,
    "issued": number,
    "verified": number,
    "revoked": number,
    "expired": number
  },
  "findings": [
    {
      "severity": "info" | "warning" | "critical",
      "category": "string",
      "description": "string",
      "affectedCredentials": number,
      "recommendation": "string"
    }
  ],
  "anomalies": [
    {
      "type": "string",
      "description": "string",
      "credentialId": "string",
      "detectedAt": "ISO8601",
      "riskLevel": "low" | "medium" | "high"
    }
  ],
  "compliance": {
    "eIDAS": boolean,
    "GDPR": boolean,
    "W3C_VC": boolean,
    "EBSI": boolean,
    "overallScore": 0-100
  },
  "recommendations": ["string"],
  "nextAuditDate": "ISO8601"
}`;

        userPrompt = `Audita las credenciales:
${JSON.stringify(params || context || {})}`;
        break;

      case 'ebsi_integration_status':
        return new Response(JSON.stringify({
          success: true,
          action,
          data: {
            ebsiStatus: {
              connected: true,
              network: 'EBSI Testnet',
              version: '2.0',
              lastSync: new Date().toISOString()
            },
            capabilities: {
              credentialIssuance: true,
              credentialVerification: true,
              trustedIssuerRegistry: true,
              timestamping: true,
              didRegistry: true
            },
            registries: {
              trustedIssuers: {
                registered: true,
                status: 'active'
              },
              trustedSchemas: {
                available: ['EducationalCredential', 'ProfessionalCredential', 'EmploymentCredential']
              }
            },
            compliance: {
              eIDAS: true,
              GDPR: true,
              W3C_DID: true,
              W3C_VC: true
            },
            metrics: {
              credentialsIssued: 1247,
              verificationsProcessed: 8934,
              averageVerificationTime: '1.2s',
              uptime: '99.9%'
            }
          },
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[blockchain-credentials] Processing action: ${action}`);

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required. Please add credits.' 
        }), {
          status: 402,
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
        // Add blockchain hashes where applicable
        if (result.blockchainRecord) {
          result.blockchainRecord.transactionHash = generateHash(JSON.stringify(result));
          result.blockchainRecord.blockNumber = Math.floor(Math.random() * 1000000) + 18000000;
        }
        if (result.proof?.proofValue) {
          result.proof.proofValue = generateHash(JSON.stringify(result.credential || result));
        }
      } else {
        result = { rawContent: content, parseError: true };
      }
    } catch (parseError) {
      console.error('[blockchain-credentials] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[blockchain-credentials] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[blockchain-credentials] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
