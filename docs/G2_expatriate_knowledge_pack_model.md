# G2.0 — Expatriate Knowledge Pack Model

## 1. Propósito

Este documento define la estructura, versionado, políticas de frescura y plantillas del modelo de **Knowledge Pack** para el sistema de Expatriate AI & Jurisdiction Intelligence.

Un knowledge pack encapsula todo el conocimiento jurisdiccional necesario para clasificar, evaluar y gestionar un caso de expatriación hacia un país o corredor específico.

### Principio de diseño

> El conocimiento jurisdiccional NO se inventa ni se extrapola. Cada campo tiene una fuente legal identificada, un nivel de confianza, y una fecha de última revisión. Cuando no hay fuente fiable, el campo se marca como `requires_verification` y el pack reduce su confidence score.

---

## 2. Estructura del Knowledge Pack

### 2.1 Country Knowledge Pack

```typescript
interface CountryKnowledgePack {
  // ── Identificación ──
  id: string;                          // "CKP-FR-v2.1.0"
  country_code: string;                // ISO 3166-1 alpha-2: "FR"
  country_name: string;                // "Francia"
  pack_type: 'country';
  version: string;                     // Semver: "2.1.0"
  status: 'current' | 'stale' | 'expired' | 'draft';

  // ── Seguridad Social ──
  ss_regime: {
    classification: 'eu_eea_ch' | 'bilateral_agreement' | 'no_agreement';
    framework: string;                 // "CE 883/2004" | "Bilateral" | "None"
    framework_details: string;         // Descripción del marco aplicable
    max_posting_months: number | null; // 24 para UE (extensible Art. 16)
    certificate_type: string;          // "A1" | "Bilateral cert" | "None"
    issuing_authority: string;         // "TGSS"
    dual_coverage_risk: boolean;
    voluntary_coverage_option: boolean;
    notes: string[];
    sources: LegalSource[];
  };

  // ── Convenio Doble Imposición ──
  cdi_status: {
    has_cdi: boolean;
    treaty_name: string | null;        // "CDI España-Francia"
    signed_date: string | null;        // "1995-06-10"
    in_force_date: string | null;      // "1997-01-01"
    key_articles: CDIArticle[];
    withholding_rates: {
      dividends: string;               // "0/5/15%"
      interest: string;                // "0/10%"
      royalties: string;               // "0/5%"
      employment_income: string;       // "Art. 15 standard"
    };
    info_exchange: boolean;            // Intercambio automático de información
    notes: string[];
    sources: LegalSource[];
  };

  // ── Residencia Fiscal ──
  tax_residence_rules: {
    days_threshold: number;            // 183 para la mayoría
    center_vital_interests_rule: boolean;
    tie_breaker_rules: string[];       // Reglas de desempate del CDI
    beckham_equivalent: string | null; // Régimen especial impatriados local
    exit_tax: boolean;
    notes: string[];
    sources: LegalSource[];
  };

  // ── Art. 7.p Aplicabilidad ──
  art7p_applicability: {
    effective_work_requirement: 'standard' | 'special_rules';
    beneficiary_requirement: 'standard' | 'special_rules';
    tax_haven_status: 'not_tax_haven' | 'tax_haven' | 'requires_verification';
    info_exchange_agreement: boolean;
    max_exemption_eur: number;         // 60100
    proration_method: 'daily' | 'monthly';
    incompatible_regimes: string[];    // ["régimen de excesos"]
    notes: string[];
    sources: LegalSource[];
  };

  // ── Impacto Payroll ──
  payroll_impact_flags: {
    split_payroll_common: boolean;
    shadow_payroll_recommended: boolean;
    tax_equalization_typical: boolean;
    hypothetical_tax_needed: boolean;
    local_payroll_registration_required: boolean;
    local_withholding_obligations: string[];
    social_charges_host: string[];     // Cotizaciones locales si aplica
    notes: string[];
    sources: LegalSource[];
  };

  // ── Inmigración / Permisos ──
  immigration_notes: {
    work_permit_required: boolean;     // false para UE, true para terceros países
    visa_required: boolean;
    residence_permit_required: boolean;
    free_movement: boolean;            // true para UE/EEE/CH
    permit_processing_days: number | null;
    permit_types: string[];            // ["EU Blue Card", "National visa D"]
    notes: string[];
    sources: LegalSource[];
  };

  // ── Documentación Requerida ──
  required_documents: RequiredDocument[];

  // ── Review Triggers ──
  review_triggers: PackReviewTrigger[];

  // ── Confianza y Frescura ──
  confidence: {
    score: number;                     // 0-100
    factors: ConfidenceFactor[];
    overall_reliability: 'high' | 'medium' | 'low';
  };

  // ── Metadatos ──
  metadata: {
    created_at: string;                // ISO 8601
    last_reviewed_at: string;          // ISO 8601
    next_review_due: string;           // ISO 8601
    reviewed_by: string;               // "system" | "specialist:name"
    change_log: ChangeLogEntry[];
    tags: string[];                    // ["eu", "phase_1", "high_volume"]
  };
}
```

### 2.2 Corridor Knowledge Pack

```typescript
interface CorridorKnowledgePack {
  // ── Identificación ──
  id: string;                          // "CRP-ES-FR-v1.0.0"
  origin_country_code: string;         // "ES"
  destination_country_code: string;    // "FR"
  corridor_name: string;              // "España → Francia"
  pack_type: 'corridor';
  version: string;
  status: 'current' | 'stale' | 'expired' | 'draft';

  // ── Reglas específicas del corredor ──
  corridor_specific_rules: {
    ss_posting_rules: string[];        // Reglas específicas de desplazamiento
    cdi_application_notes: string[];   // Notas sobre aplicación del CDI específico
    common_assignment_types: string[]; // Tipos comunes en este corredor
    typical_duration_months: number;   // Duración típica
    volume_indicator: 'high' | 'medium' | 'low'; // Volumen de casos
  };

  // ── Escenarios frecuentes ──
  common_scenarios: CorridorScenario[];

  // ── Riesgos específicos del corredor ──
  corridor_risks: {
    pe_risk_factors: string[];
    residency_conflict_factors: string[];
    payroll_complexity_factors: string[];
    immigration_complexity: 'low' | 'medium' | 'high';
    overall_risk_level: 'low' | 'medium' | 'high';
    notes: string[];
  };

  // ── Checklist documental específico ──
  corridor_documents: RequiredDocument[];

  // ── Confianza y metadatos ──
  confidence: {
    score: number;
    overall_reliability: 'high' | 'medium' | 'low';
  };
  metadata: {
    created_at: string;
    last_reviewed_at: string;
    next_review_due: string;
    reviewed_by: string;
    change_log: ChangeLogEntry[];
  };
}
```

### 2.3 Tipos auxiliares

```typescript
interface LegalSource {
  id: string;
  type: 'official_gazette' | 'legislation' | 'treaty' | 'regulation' | 'administrative_doctrine' | 'case_law' | 'secondary' | 'ai_derived';
  title: string;
  reference: string;                   // "BOE-A-1997-1234" | "CE 883/2004 Art. 12"
  url?: string;
  publication_date: string;
  confidence_level: 'high' | 'medium' | 'low';
  notes?: string;
}

interface RequiredDocument {
  id: string;
  document_type: string;               // "a1_certificate" | "work_permit" | etc.
  label: string;
  required: boolean;
  conditional_on?: string;             // "duration > 90 days"
  issuing_authority: string;
  typical_processing_days: number;
  description: string;
  regime_applicable: 'eu_eea_ch' | 'bilateral_agreement' | 'no_agreement' | 'all';
}

interface PackReviewTrigger {
  id: string;
  condition: string;                   // "duration_months > 24"
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ss' | 'tax' | 'legal' | 'payroll' | 'compliance' | 'immigration';
  label: string;
  description: string;
  action_required: string;
  owner_domain: string;                // "hr" | "fiscal" | "legal"
}

interface ConfidenceFactor {
  factor: string;                      // "official_sources_count"
  value: number;
  weight: number;
  contribution: number;               // value * weight
}

interface ChangeLogEntry {
  version: string;
  date: string;
  author: string;
  changes: string[];
}

interface CDIArticle {
  article: string;                     // "Art. 15"
  title: string;                       // "Rentas del trabajo dependiente"
  summary: string;
  relevance: 'primary' | 'secondary';
}

interface CorridorScenario {
  id: string;
  name: string;                        // "Desplazamiento temporal <24m"
  description: string;
  typical_support_level: 'supported_production' | 'supported_with_review' | 'out_of_scope';
  key_considerations: string[];
  documents_required: string[];        // IDs de RequiredDocument
}
```

---

## 3. Campos Obligatorios

Todo knowledge pack (country o corridor) DEBE tener:

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| `id` | string | ✅ | Formato: CKP-{CC}-v{version} o CRP-{OO}-{DD}-v{version} |
| `version` | string | ✅ | Semver |
| `status` | enum | ✅ | current/stale/expired/draft |
| `ss_regime.classification` | enum | ✅ | Tipo de régimen SS |
| `cdi_status.has_cdi` | boolean | ✅ | Existencia de CDI |
| `confidence.score` | number | ✅ | 0-100 |
| `metadata.last_reviewed_at` | ISO date | ✅ | Última revisión |
| `metadata.next_review_due` | ISO date | ✅ | Próxima revisión |

**Campos que pueden ser `null` con justificación:**
- `cdi_status.signed_date` — si no se ha podido verificar
- `ss_regime.max_posting_months` — para regímenes sin límite definido
- `immigration_notes.permit_processing_days` — si varía significativamente

---

## 4. Política de Versionado

### 4.1 Semver

| Componente | Cuándo incrementa |
|-----------|-------------------|
| **MAJOR** (X.0.0) | Cambio de régimen SS, nuevo CDI, cambio fundamental de reglas |
| **MINOR** (0.X.0) | Actualización de provisiones, nuevos documentos requeridos, cambio de umbrales |
| **PATCH** (0.0.X) | Corrección de errores, actualización de notas, mejora de fuentes |

### 4.2 Inmutabilidad

Cada versión es un **snapshot inmutable**. Cuando se actualiza un pack, se crea una nueva versión. Las versiones anteriores se mantienen para auditoría.

```
CKP-FR-v1.0.0  →  CKP-FR-v1.1.0  →  CKP-FR-v2.0.0
     │                   │                   │
  (original)     (minor update)     (CDI update)
```

### 4.3 Referencia en clasificaciones

Cada clasificación de caso DEBE registrar qué versión del knowledge pack se usó:

```typescript
interface CaseClassificationAudit {
  case_id: string;
  country_pack_id: string;     // "CKP-FR-v2.1.0"
  corridor_pack_id?: string;   // "CRP-ES-FR-v1.0.0"
  classification_timestamp: string;
  // ... resultado de clasificación
}
```

---

## 5. Política de Frescura

### 5.1 Estados de frescura

| Estado | Ventana temporal | Comportamiento del sistema |
|--------|-----------------|---------------------------|
| `current` | 0-90 días desde `last_reviewed_at` | Uso automático. Sin advertencias. |
| `stale` | 91-180 días desde `last_reviewed_at` | Uso con advertencia visual. Flag en IA Center. Support level NO escala automáticamente pero se muestra badge "⚠️ Conocimiento pendiente de revisión". |
| `expired` | >180 días desde `last_reviewed_at` | No se usa automáticamente. Requiere revisión manual antes de clasificar. Si se fuerza el uso, support level escala a `supported_with_review` como mínimo. |
| `draft` | Pack no validado | No disponible para uso automático. Solo visible en modo administración. |

### 5.2 Confidence decay

```
confidence_effective = max(30, base_confidence - decay)

donde:
  decay = max(0, (days_since_review - 90) / 10)
```

**Ejemplo:**
- Pack con `base_confidence = 85`, última revisión hace 120 días
- `decay = (120 - 90) / 10 = 3`
- `confidence_effective = max(30, 85 - 3) = 82`

**Ejemplo extremo:**
- Pack con `base_confidence = 60`, última revisión hace 400 días
- `decay = (400 - 90) / 10 = 31`
- `confidence_effective = max(30, 60 - 31) = 30` (mínimo)

### 5.3 Ciclo de revisión

```
Creación → current (90d) → stale (90d) → expired
                ↑                              │
                └──────── revisión ─────────────┘
```

**Responsable de revisión:** Configurado por pack. Default: "system" (revisión automatizada contra fuentes oficiales). Para packs de alta complejidad: "specialist:{nombre}".

---

## 6. Fuentes Legales y Niveles de Confianza

### 6.1 Niveles de confianza por tipo de fuente

| Tipo de fuente | Confidence level | Peso en score | Ejemplos |
|---------------|-----------------|---------------|----------|
| `official_gazette` | `high` | 1.0 | BOE, DOUE, Journal Officiel |
| `legislation` | `high` | 1.0 | LIRPF, CE 883/2004 |
| `treaty` | `high` | 1.0 | CDI España-Francia |
| `regulation` | `high` | 0.9 | RIRPF, reglamentos de desarrollo |
| `administrative_doctrine` | `medium` | 0.7 | Consultas vinculantes DGT, INSS |
| `case_law` | `medium` | 0.6 | Sentencias TS, TJUE |
| `secondary` | `medium` | 0.5 | Manuales AEAT, guías TGSS |
| `ai_derived` | `low` | 0.3 | Información derivada por IA sin verificación |

### 6.2 Cálculo de confidence score

```
confidence_score = Σ(source_weight × source_count) / max_possible × 100

donde:
  max_possible = número_total_de_campos_con_fuente × 1.0
```

**Ejemplo para CKP-FR:**
- 5 campos con fuente `official_gazette` (peso 1.0): 5.0
- 3 campos con fuente `administrative_doctrine` (peso 0.7): 2.1
- 1 campo con fuente `ai_derived` (peso 0.3): 0.3
- Total: 7.4 / 9.0 × 100 = **82**

### 6.3 Regla de confianza mínima

Un pack NO puede tener status `current` si:
- `confidence_score < 40`
- Tiene algún campo crítico (ss_regime, cdi_status) con fuente `ai_derived` sin verificación
- No tiene al menos 1 fuente `official_gazette` o `legislation`

---

## 7. Plantilla: Country Pack — Francia (ES↔FR)

```json
{
  "id": "CKP-FR-v1.0.0",
  "country_code": "FR",
  "country_name": "Francia",
  "pack_type": "country",
  "version": "1.0.0",
  "status": "current",

  "ss_regime": {
    "classification": "eu_eea_ch",
    "framework": "CE 883/2004",
    "framework_details": "Reglamento CE 883/2004 de coordinación de sistemas de Seguridad Social. Aplicable a nacionales UE/EEE/CH que se desplazan entre Estados miembros.",
    "max_posting_months": 24,
    "certificate_type": "A1",
    "issuing_authority": "TGSS (Tesorería General de la Seguridad Social)",
    "dual_coverage_risk": false,
    "voluntary_coverage_option": false,
    "notes": [
      "A1 válido hasta 24 meses. Extensión posible vía Art. 16 CE 883/2004 (acuerdo entre instituciones).",
      "Libre circulación de trabajadores (Art. 45 TFUE).",
      "CPAM (Caisse Primaire d'Assurance Maladie) como institución competente en Francia."
    ],
    "sources": [
      {
        "id": "src-fr-ss-1",
        "type": "legislation",
        "title": "Reglamento (CE) 883/2004",
        "reference": "CE 883/2004 Art. 12",
        "publication_date": "2004-04-29",
        "confidence_level": "high"
      },
      {
        "id": "src-fr-ss-2",
        "type": "regulation",
        "title": "Reglamento de aplicación (CE) 987/2009",
        "reference": "CE 987/2009 Art. 15",
        "publication_date": "2009-09-16",
        "confidence_level": "high"
      }
    ]
  },

  "cdi_status": {
    "has_cdi": true,
    "treaty_name": "Convenio entre el Reino de España y la República Francesa para evitar la doble imposición",
    "signed_date": "1995-06-10",
    "in_force_date": "1997-01-01",
    "key_articles": [
      {
        "article": "Art. 15",
        "title": "Rentas del trabajo dependiente",
        "summary": "Las rentas del trabajo solo tributan en el Estado de residencia salvo que el empleo se ejerza en el otro Estado. Excepción de 183 días para desplazamientos temporales.",
        "relevance": "primary"
      },
      {
        "article": "Art. 24",
        "title": "Eliminación de la doble imposición",
        "summary": "España aplica método de crédito fiscal: deduce del impuesto español el impuesto pagado en Francia.",
        "relevance": "primary"
      }
    ],
    "withholding_rates": {
      "dividends": "0/15%",
      "interest": "0/10%",
      "royalties": "0/5%",
      "employment_income": "Art. 15 standard"
    },
    "info_exchange": true,
    "notes": [
      "CDI en vigor desde 1997. Protocolo adicional firmado.",
      "Intercambio automático de información fiscal (CRS)."
    ],
    "sources": [
      {
        "id": "src-fr-cdi-1",
        "type": "treaty",
        "title": "CDI España-Francia",
        "reference": "BOE-A-1997-1234",
        "publication_date": "1997-01-15",
        "confidence_level": "high"
      }
    ]
  },

  "tax_residence_rules": {
    "days_threshold": 183,
    "center_vital_interests_rule": true,
    "tie_breaker_rules": [
      "Art. 4.2 CDI: Vivienda permanente → Centro de intereses vitales → Estancia habitual → Nacionalidad → Acuerdo mutuo"
    ],
    "beckham_equivalent": "Régime des impatriés (Art. 155 B CGI) — Exención parcial de prima de impatriación durante 8 años",
    "exit_tax": true,
    "notes": [
      "Francia aplica regla de 183 días + domicilio fiscal (foyer fiscal) + actividad profesional principal.",
      "Exit tax francés sobre plusvalías latentes si >800.000€ en valores."
    ],
    "sources": [
      {
        "id": "src-fr-tax-1",
        "type": "legislation",
        "title": "Code Général des Impôts Art. 4 B",
        "reference": "CGI Art. 4 B",
        "publication_date": "2024-01-01",
        "confidence_level": "high"
      }
    ]
  },

  "art7p_applicability": {
    "effective_work_requirement": "standard",
    "beneficiary_requirement": "standard",
    "tax_haven_status": "not_tax_haven",
    "info_exchange_agreement": true,
    "max_exemption_eur": 60100,
    "proration_method": "daily",
    "incompatible_regimes": ["régimen de excesos (Art. 9.A.3.b RIRPF)"],
    "notes": [
      "Francia cumple todos los requisitos para Art. 7.p: CDI, intercambio de información, no paraíso fiscal.",
      "El contribuyente debe elegir entre Art. 7.p y régimen de excesos."
    ],
    "sources": [
      {
        "id": "src-fr-7p-1",
        "type": "legislation",
        "title": "LIRPF Art. 7.p",
        "reference": "Ley 35/2006 Art. 7.p",
        "publication_date": "2006-11-28",
        "confidence_level": "high"
      }
    ]
  },

  "payroll_impact_flags": {
    "split_payroll_common": false,
    "shadow_payroll_recommended": false,
    "tax_equalization_typical": false,
    "hypothetical_tax_needed": false,
    "local_payroll_registration_required": false,
    "local_withholding_obligations": [
      "Si el empleado se convierte en residente fiscal francés, obligación de retención por el empleador francés (prélèvement à la source)"
    ],
    "social_charges_host": [
      "Si se pierde cobertura A1, cotizaciones al régime général (URSSAF): ~45% sobre salario bruto"
    ],
    "notes": [
      "Para desplazamientos <24 meses con A1, no hay obligación de payroll local.",
      "Si >24 meses sin extensión Art. 16, considerar split payroll."
    ],
    "sources": []
  },

  "immigration_notes": {
    "work_permit_required": false,
    "visa_required": false,
    "residence_permit_required": false,
    "free_movement": true,
    "permit_processing_days": null,
    "permit_types": [],
    "notes": [
      "Libre circulación UE (Art. 45 TFUE). No requiere permiso de trabajo ni visa.",
      "Registro en mairie si >3 meses (attestation d'enregistrement). No es permiso, es declaración."
    ],
    "sources": [
      {
        "id": "src-fr-imm-1",
        "type": "legislation",
        "title": "Directiva 2004/38/CE — Libre circulación",
        "reference": "Dir. 2004/38/CE",
        "publication_date": "2004-04-29",
        "confidence_level": "high"
      }
    ]
  },

  "required_documents": [
    {
      "id": "doc-fr-1",
      "document_type": "a1_certificate",
      "label": "Certificado A1 (PD A1)",
      "required": true,
      "issuing_authority": "TGSS",
      "typical_processing_days": 15,
      "description": "Certificado de legislación SS aplicable según CE 883/2004",
      "regime_applicable": "eu_eea_ch"
    },
    {
      "id": "doc-fr-2",
      "document_type": "assignment_letter",
      "label": "Carta de asignación internacional",
      "required": true,
      "issuing_authority": "Empresa",
      "typical_processing_days": 5,
      "description": "Documento formal de asignación con condiciones",
      "regime_applicable": "all"
    },
    {
      "id": "doc-fr-3",
      "document_type": "social_security_cert",
      "label": "Tarjeta Sanitaria Europea (TSE)",
      "required": true,
      "issuing_authority": "INSS",
      "typical_processing_days": 10,
      "description": "Cobertura sanitaria temporal en UE/EEE",
      "regime_applicable": "eu_eea_ch"
    },
    {
      "id": "doc-fr-4",
      "document_type": "tax_residency_cert",
      "label": "Certificado de residencia fiscal",
      "required": false,
      "conditional_on": "Si se aplica Art. 7.p o CDI",
      "issuing_authority": "AEAT",
      "typical_processing_days": 15,
      "description": "Para acreditar residencia fiscal española ante autoridades francesas",
      "regime_applicable": "all"
    }
  ],

  "review_triggers": [
    {
      "id": "rt-fr-1",
      "condition": "duration_months > 24",
      "severity": "medium",
      "category": "ss",
      "label": "Duración >24 meses — Revisar A1",
      "description": "El certificado A1 estándar cubre hasta 24 meses. Si la asignación supera este período, se necesita extensión vía Art. 16 CE 883/2004.",
      "action_required": "Solicitar extensión A1 ante TGSS e institución francesa",
      "owner_domain": "hr"
    },
    {
      "id": "rt-fr-2",
      "condition": "days_in_host > 183",
      "severity": "high",
      "category": "tax",
      "label": "Riesgo de residencia fiscal francesa",
      "description": "Más de 183 días en Francia puede activar residencia fiscal francesa (CGI Art. 4 B).",
      "action_required": "Análisis de residencia fiscal con asesor especializado",
      "owner_domain": "fiscal"
    }
  ],

  "confidence": {
    "score": 88,
    "factors": [
      { "factor": "official_sources_count", "value": 6, "weight": 5, "contribution": 30 },
      { "factor": "cdi_documented", "value": 1, "weight": 20, "contribution": 20 },
      { "factor": "ss_framework_clear", "value": 1, "weight": 20, "contribution": 20 },
      { "factor": "immigration_clear", "value": 1, "weight": 10, "contribution": 10 },
      { "factor": "all_fields_populated", "value": 0.8, "weight": 10, "contribution": 8 }
    ],
    "overall_reliability": "high"
  },

  "metadata": {
    "created_at": "2026-04-11T00:00:00Z",
    "last_reviewed_at": "2026-04-11T00:00:00Z",
    "next_review_due": "2026-07-10T00:00:00Z",
    "reviewed_by": "system",
    "change_log": [
      {
        "version": "1.0.0",
        "date": "2026-04-11",
        "author": "G2.0 baseline",
        "changes": ["Versión inicial del knowledge pack Francia"]
      }
    ],
    "tags": ["eu", "phase_1", "high_volume", "ce_883_2004"]
  }
}
```

---

## 8. Plantilla: Corridor Pack — ES↔US

```json
{
  "id": "CRP-ES-US-v1.0.0",
  "origin_country_code": "ES",
  "destination_country_code": "US",
  "corridor_name": "España → Estados Unidos",
  "pack_type": "corridor",
  "version": "1.0.0",
  "status": "current",

  "corridor_specific_rules": {
    "ss_posting_rules": [
      "Convenio bilateral SS España-EEUU: desplazamiento temporal hasta 5 años con certificado de cobertura.",
      "Certificate of Coverage emitido por TGSS (España) o SSA (EEUU).",
      "Totalización de períodos cotizados para prestaciones."
    ],
    "cdi_application_notes": [
      "CDI España-EEUU: Art. 15 servicios personales dependientes.",
      "Regla de 183 días del Art. 15.2: si <183 días y pagado por empleador no-residente, solo tributa en Estado de residencia.",
      "EEUU grava a sus ciudadanos/green card holders por renta mundial independientemente de la residencia.",
      "Posible crédito fiscal en EEUU por impuestos pagados en España (Foreign Tax Credit)."
    ],
    "common_assignment_types": [
      "Desplazamiento temporal tecnológico (1-3 años)",
      "Rotación ejecutiva",
      "Transferencia intra-grupo (L-1 visa)"
    ],
    "typical_duration_months": 24,
    "volume_indicator": "medium"
  },

  "common_scenarios": [
    {
      "id": "scn-es-us-1",
      "name": "Desplazamiento temporal <5 años",
      "description": "Empleado español desplazado a EEUU con mantenimiento de SS española vía convenio bilateral.",
      "typical_support_level": "supported_with_review",
      "key_considerations": [
        "Obtener Certificate of Coverage de TGSS antes del desplazamiento",
        "Verificar tipo de visa (L-1, E-1/E-2, H-1B)",
        "Evaluar Art. 7.p LIRPF si mantiene residencia fiscal española",
        "EEUU requiere filing de Form 1040 si presencia sustancial (Substantial Presence Test)"
      ],
      "documents_required": ["bilateral_cert", "work_permit", "visa", "tax_residency_cert"]
    },
    {
      "id": "scn-es-us-2",
      "name": "Short-term business travel (<183 días)",
      "description": "Viajes de negocio frecuentes sin cambio de base.",
      "typical_support_level": "supported_with_review",
      "key_considerations": [
        "Verificar Substantial Presence Test (SPT) acumulativo",
        "Si <183 días y empleador no-US, posible exención Art. 15.2 CDI",
        "Tracking de días obligatorio para compliance"
      ],
      "documents_required": ["assignment_letter", "tax_residency_cert"]
    }
  ],

  "corridor_risks": {
    "pe_risk_factors": [
      "Fixed place of business en EEUU puede crear PE",
      "Empleado con autoridad para contratar puede crear PE del agente dependiente",
      "Subsidiaria US puede mitigar riesgo PE si estructura correcta"
    ],
    "residency_conflict_factors": [
      "EEUU usa Substantial Presence Test (183 días ponderados en 3 años)",
      "España usa regla 183 días + centro vital + presunciones Art. 9",
      "Posible doble residencia resuelta por tie-breaker CDI Art. 4"
    ],
    "payroll_complexity_factors": [
      "EEUU tiene withholding federal + estatal + local (varía por estado)",
      "FICA taxes (Social Security + Medicare) si no hay Certificate of Coverage",
      "State income tax varía: 0% (TX, FL) a 13.3% (CA)"
    ],
    "immigration_complexity": "high",
    "overall_risk_level": "medium",
    "notes": [
      "Corredor de complejidad media-alta por sistema fiscal EEUU (federal + estatal) y proceso migratorio.",
      "Requiere revisión obligatoria en todos los casos."
    ]
  },

  "corridor_documents": [
    {
      "id": "cdoc-es-us-1",
      "document_type": "social_security_cert",
      "label": "Certificate of Coverage (convenio bilateral ES-US)",
      "required": true,
      "issuing_authority": "TGSS / SSA",
      "typical_processing_days": 20,
      "description": "Certificado de cobertura SS según convenio bilateral España-EEUU",
      "regime_applicable": "bilateral_agreement"
    },
    {
      "id": "cdoc-es-us-2",
      "document_type": "work_permit",
      "label": "Visa de trabajo (L-1 / H-1B / E-1/E-2)",
      "required": true,
      "issuing_authority": "USCIS / Consulado US",
      "typical_processing_days": 90,
      "description": "Autorización de trabajo en EEUU. Tipo depende de la relación laboral.",
      "regime_applicable": "all"
    }
  ],

  "confidence": {
    "score": 75,
    "overall_reliability": "medium"
  },

  "metadata": {
    "created_at": "2026-04-11T00:00:00Z",
    "last_reviewed_at": "2026-04-11T00:00:00Z",
    "next_review_due": "2026-07-10T00:00:00Z",
    "reviewed_by": "system",
    "change_log": [
      {
        "version": "1.0.0",
        "date": "2026-04-11",
        "author": "G2.0 baseline",
        "changes": ["Versión inicial del corridor pack ES→US"]
      }
    ]
  }
}
```

---

## 9. Corredores por Fase

### 9.1 Fase 1 — G2.1

| Corredor | Régimen | CDI | Confidence estimado | Complejidad |
|----------|---------|-----|---------------------|-------------|
| ES ↔ FR | UE (CE 883/2004) | ✅ | 85-90 | Baja |
| ES ↔ PT | UE (CE 883/2004) | ✅ | 85-90 | Baja |
| ES ↔ DE | UE (CE 883/2004) | ✅ | 85-90 | Baja |
| ES ↔ IT | UE (CE 883/2004) | ✅ | 85-90 | Baja |
| ES ↔ AD | Bilateral | ✅ | 80-85 | Baja-Media |
| ES ↔ GB | Bilateral post-Brexit | ✅ | 75-80 | Media |
| ES ↔ CH | UE-extensión | ✅ | 80-85 | Baja-Media |
| ES ↔ US | Bilateral | ✅ | 70-75 | Media-Alta |
| ES ↔ MX | Bilateral | ✅ | 70-75 | Media |

### 9.2 Fase 2

Resto de bilaterales: CA, CL, CO, AR, UY, BR, PE, JP, KR, AU, CN, IN, MA, y otros con CDI pero sin convenio SS (AE, SA, SG, TH, ZA, IL, TR, EG).

### 9.3 Fuera de alcance

Países sin CDI ni convenio SS con España → `out_of_scope`, derivar a especialista externo.

---

## 10. Implementación Técnica (G2.1)

### 10.1 Fase 1: Constants en TypeScript

En G2.1, los knowledge packs se implementarán como **constantes TypeScript** en:

```
src/engines/erp/hr/knowledgePacks/
  ├── index.ts                    // barrel exports
  ├── types.ts                    // interfaces
  ├── countryPacks/
  │   ├── FR.ts
  │   ├── PT.ts
  │   ├── DE.ts
  │   ├── IT.ts
  │   ├── AD.ts
  │   ├── GB.ts
  │   ├── CH.ts
  │   ├── US.ts
  │   └── MX.ts
  └── corridorPacks/
      ├── ES_FR.ts
      ├── ES_PT.ts
      ├── ES_DE.ts
      ├── ES_IT.ts
      ├── ES_AD.ts
      ├── ES_GB.ts
      ├── ES_CH.ts
      ├── ES_US.ts
      └── ES_MX.ts
```

### 10.2 Fase 2: Tabla en DB (G2.2+)

Si el volumen de packs crece y se necesita actualización sin deploy, migrar a tabla `erp_knowledge_packs` con:
- `id`, `pack_type`, `country_code`, `version`, `status`, `data` (JSONB), `confidence_score`, `last_reviewed_at`, `next_review_due`

**Decisión diferida a G2.2** — en G2.1 las constants son suficientes y más seguras.

---

*Documento generado: G2.0 — Expatriate Knowledge Pack Model*
*Fecha: 2026-04-11*
*Compatible con: P1.7B-RA engines, G1.x agent patterns*
