/**
 * documentCatalogES — Catálogo documental operativo para RRHH España
 * V2-ES.4 Paso 1: Tipos documentales con base legal, retención y vencimientos
 *
 * REGLAS:
 * - Cada entrada define un tipo documental reconocido en el ámbito laboral español
 * - `retentionYears` sigue Art. 21 LPRL, Art. 66 LGSS, y normativa fiscal (4-6 años)
 * - `renewable` indica si el documento puede/debe renovarse periódicamente
 * - `defaultExpiryMonths` es orientativo; null = sin vencimiento natural
 * - Este catálogo es informativo y no bloquea workflows
 */

import type { DocumentCategory } from '@/hooks/erp/hr/useHRDocumentExpedient';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DocumentCatalogEntry {
  /** Clave normalizada (lowercase, sin tildes) — coincide con document_type en BD */
  key: string;
  /** Nombre legible para UI */
  label: string;
  /** Categoría del expediente */
  category: DocumentCategory;
  /** Base legal española (artículo o norma de referencia) */
  legalBasis: string | null;
  /** Años de retención obligatoria según normativa */
  retentionYears: number;
  /** ¿Es un documento renovable o con vigencia limitada? */
  renewable: boolean;
  /** Meses de vigencia por defecto (null = indefinido) */
  defaultExpiryMonths: number | null;
  /** Días de aviso antes de vencimiento */
  alertBeforeDays: number;
  /** ¿Es obligatorio para el alta de un empleado? */
  requiredForOnboarding: boolean;
  /** Descripción breve */
  description: string;
}

// ─── Catálogo ────────────────────────────────────────────────────────────────

export const DOCUMENT_CATALOG_ES: DocumentCatalogEntry[] = [
  // === PERSONAL ===
  {
    key: 'dni',
    label: 'DNI / NIE',
    category: 'personal',
    legalBasis: 'RD 1553/2005 — Documento Nacional de Identidad',
    retentionYears: 4,
    renewable: true,
    defaultExpiryMonths: 120, // 10 años (permanente para >70)
    alertBeforeDays: 90,
    requiredForOnboarding: true,
    description: 'Documento de identidad del trabajador',
  },
  {
    key: 'ss',
    label: 'Número Seguridad Social (NAF)',
    category: 'personal',
    legalBasis: 'Art. 42 LGSS — Afiliación al Sistema',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: true,
    description: 'Documento de afiliación a la Seguridad Social',
  },
  {
    key: 'cuenta_bancaria',
    label: 'Certificado cuenta bancaria',
    category: 'personal',
    legalBasis: null,
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: true,
    description: 'Certificado de titularidad bancaria para nómina',
  },
  {
    key: 'foto',
    label: 'Fotografía del empleado',
    category: 'personal',
    legalBasis: 'RGPD Art. 6.1.b — Ejecución del contrato',
    retentionYears: 1,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Fotografía para ficha de empleado y credencial',
  },
  {
    key: 'curriculum',
    label: 'Currículum Vitae',
    category: 'personal',
    legalBasis: null,
    retentionYears: 2,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'CV del empleado para expediente de selección',
  },
  {
    key: 'titulacion',
    label: 'Título académico / Certificación profesional',
    category: 'personal',
    legalBasis: null,
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Título o certificación profesional acreditativa',
  },

  // === CONTRATOS ===
  {
    key: 'contrato',
    label: 'Contrato de trabajo',
    category: 'contract',
    legalBasis: 'Art. 8 ET — Forma del contrato',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 30,
    requiredForOnboarding: true,
    description: 'Contrato de trabajo firmado por ambas partes',
  },
  {
    key: 'anexo_contrato',
    label: 'Anexo / Modificación contractual',
    category: 'contract',
    legalBasis: 'Art. 41 ET — Modificación sustancial',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Anexo o novación del contrato de trabajo',
  },
  {
    key: 'prorroga',
    label: 'Prórroga de contrato temporal',
    category: 'contract',
    legalBasis: 'Art. 15 ET — Duración del contrato',
    retentionYears: 6,
    renewable: true,
    defaultExpiryMonths: null,
    alertBeforeDays: 30,
    requiredForOnboarding: false,
    description: 'Documento de prórroga de contrato temporal',
  },
  {
    key: 'periodo_prueba',
    label: 'Pacto de período de prueba',
    category: 'contract',
    legalBasis: 'Art. 14 ET — Período de prueba',
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 15,
    requiredForOnboarding: false,
    description: 'Documento de pacto del período de prueba',
  },
  {
    key: 'no_competencia',
    label: 'Pacto de no competencia',
    category: 'contract',
    legalBasis: 'Art. 21 ET — Pacto de no competencia',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: 24,
    alertBeforeDays: 60,
    requiredForOnboarding: false,
    description: 'Pacto de no competencia post-contractual',
  },

  // === NÓMINA ===
  {
    key: 'nomina',
    label: 'Recibo de salarios (nómina)',
    category: 'payroll',
    legalBasis: 'Art. 29 ET — Liquidación y pago',
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Recibo individual de salarios',
  },
  {
    key: 'irpf',
    label: 'Modelo IRPF (145/190)',
    category: 'payroll',
    legalBasis: 'Art. 88 RIRPF — Comunicación de datos',
    retentionYears: 5,
    renewable: true,
    defaultExpiryMonths: 12,
    alertBeforeDays: 30,
    requiredForOnboarding: true,
    description: 'Comunicación de datos al pagador (Modelo 145)',
  },
  {
    key: 'certificado_retenciones',
    label: 'Certificado de retenciones',
    category: 'payroll',
    legalBasis: 'Art. 108 RIRPF',
    retentionYears: 5,
    renewable: true,
    defaultExpiryMonths: 12,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Certificado anual de retenciones e ingresos a cuenta',
  },
  {
    key: 'finiquito',
    label: 'Documento de finiquito / liquidación',
    category: 'payroll',
    legalBasis: 'Art. 49.2 ET — Finiquito',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Documento de saldo y finiquito',
  },

  // === COMPLIANCE ===
  {
    key: 'lopd_consentimiento',
    label: 'Consentimiento LOPD/RGPD',
    category: 'compliance',
    legalBasis: 'RGPD Art. 7 — Condiciones del consentimiento',
    retentionYears: 6,
    renewable: true,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: true,
    description: 'Consentimiento para tratamiento de datos personales',
  },
  {
    key: 'prl_formacion',
    label: 'Certificado formación PRL',
    category: 'compliance',
    legalBasis: 'Art. 19 LPRL — Formación de los trabajadores',
    retentionYears: 5,
    renewable: true,
    defaultExpiryMonths: 12,
    alertBeforeDays: 60,
    requiredForOnboarding: false,
    description: 'Acreditación de formación en prevención de riesgos',
  },
  {
    key: 'reconocimiento_medico',
    label: 'Reconocimiento médico (apto)',
    category: 'medical',
    legalBasis: 'Art. 22 LPRL — Vigilancia de la salud',
    retentionYears: 5,
    renewable: true,
    defaultExpiryMonths: 12,
    alertBeforeDays: 60,
    requiredForOnboarding: false,
    description: 'Certificado de aptitud médica laboral',
  },
  {
    key: 'epi_entrega',
    label: 'Acuse entrega EPI',
    category: 'compliance',
    legalBasis: 'RD 773/1997 — Equipos de protección individual',
    retentionYears: 5,
    renewable: true,
    defaultExpiryMonths: 12,
    alertBeforeDays: 30,
    requiredForOnboarding: false,
    description: 'Registro de entrega de equipos de protección individual',
  },
  {
    key: 'canal_denuncias',
    label: 'Acuse política canal denuncias',
    category: 'compliance',
    legalBasis: 'Ley 2/2023 — Canal de denuncias',
    retentionYears: 5,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Acuse de recibo de la política del canal de denuncias',
  },

  // === MÉDICOS ===
  {
    key: 'justificante',
    label: 'Justificante / Parte de baja IT',
    category: 'medical',
    legalBasis: 'RD 625/2014 — Gestión de la IT',
    retentionYears: 5,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Parte de baja, confirmación o alta de incapacidad temporal',
  },
  {
    key: 'medico',
    label: 'Informe médico',
    category: 'medical',
    legalBasis: 'Art. 22 LPRL',
    retentionYears: 5,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Informe o dictamen médico relevante para la relación laboral',
  },

  // === LEGAL (baja/despido) ===
  {
    key: 'carta_despido',
    label: 'Carta de despido',
    category: 'legal',
    legalBasis: 'Art. 55 ET — Forma y efectos del despido',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Comunicación formal de despido disciplinario u objetivo',
  },
  {
    key: 'baja_voluntaria',
    label: 'Carta de baja voluntaria',
    category: 'legal',
    legalBasis: 'Art. 49.1.d ET — Dimisión del trabajador',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Comunicación de dimisión voluntaria del trabajador',
  },
  {
    key: 'certificado',
    label: 'Certificado de empresa',
    category: 'legal',
    legalBasis: 'Art. 14 RD 625/1985 — Prestaciones por desempleo',
    retentionYears: 6,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Certificado de empresa para prestaciones por desempleo',
  },

  // === FORMACIÓN ===
  {
    key: 'formacion',
    label: 'Certificado de formación',
    category: 'training',
    legalBasis: 'Art. 23 ET — Promoción y formación profesional',
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Certificado de formación interna o externa',
  },

  // === GENÉRICO ===
  {
    key: 'evidencia',
    label: 'Evidencia / Documento adjunto',
    category: 'compliance',
    legalBasis: null,
    retentionYears: 4,
    renewable: false,
    defaultExpiryMonths: null,
    alertBeforeDays: 0,
    requiredForOnboarding: false,
    description: 'Documento genérico adjuntado como evidencia documental',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lookup rápido por key normalizada */
const _catalogIndex = new Map<string, DocumentCatalogEntry>();
for (const entry of DOCUMENT_CATALOG_ES) {
  _catalogIndex.set(entry.key, entry);
}

/**
 * Busca una entrada del catálogo por key.
 * Usa normalización para matching robusto.
 */
export function getCatalogEntry(docType: string): DocumentCatalogEntry | null {
  const normalized = docType
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return _catalogIndex.get(normalized) ?? null;
}

/**
 * Devuelve las entradas del catálogo requeridas para onboarding.
 */
export function getOnboardingRequiredDocs(): DocumentCatalogEntry[] {
  return DOCUMENT_CATALOG_ES.filter(e => e.requiredForOnboarding);
}

/**
 * Devuelve las entradas del catálogo que son renovables.
 */
export function getRenewableDocs(): DocumentCatalogEntry[] {
  return DOCUMENT_CATALOG_ES.filter(e => e.renewable);
}

/**
 * Devuelve las entradas del catálogo por categoría.
 */
export function getCatalogByCategory(category: DocumentCategory): DocumentCatalogEntry[] {
  return DOCUMENT_CATALOG_ES.filter(e => e.category === category);
}
