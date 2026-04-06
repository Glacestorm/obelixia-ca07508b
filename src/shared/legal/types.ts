/**
 * Shared Legal Core — Base Types
 * @shared-legal-core
 * 
 * Single source of truth para tipos del dominio legal reutilizables
 * across todos los módulos del ERP (HR, Fiscal, Treasury, Legal UI, Agents).
 * 
 * F1: Additive-only. Los consumidores existentes NO se modifican en esta fase.
 * F2+: Migración incremental de imports con re-exports en ubicaciones originales.
 */

// ============================================================================
// RISK LEVEL
// Repetido 12+ veces como inline literal en: useLegalValidationGateway,
// useLegalValidationGatewayEnhanced, usePredictiveLegalAnalytics,
// useSettlements, useChurnPrediction, useSupportTickets, bridgeEngine, etc.
// ============================================================================

/** @shared-legal-core — Nivel de riesgo legal canónico */
export type LegalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// VALIDATION STATUS
// 3 variantes existentes unificadas en un superset:
// - Gateway: 'pending' | 'approved' | 'rejected' | 'blocked'
// - Enhanced: añade 'review_required'
// - Settlements: 'pending_validation' | 'validated' | 'rejected'
// ============================================================================

/** @shared-legal-core — Estado de validación legal canónico (superset) */
export type LegalValidationStatus =
  | 'pending'
  | 'pending_validation'
  | 'pending_approval'
  | 'review_required'
  | 'approved'
  | 'auto_approved'
  | 'validated'
  | 'rejected'
  | 'blocked'
  | 'escalated';

// ============================================================================
// MODULE TYPE
// Repetido en: useLegalValidationGateway, Enhanced, useCrossModuleOrchestrator
// ============================================================================

/** @shared-legal-core — Módulos ERP que interactúan con el sistema legal */
export type LegalModuleType =
  | 'hr'
  | 'fiscal'
  | 'treasury'
  | 'accounting'
  | 'payroll'
  | 'contracts'
  | 'compliance'
  | 'legal'
  | 'erp';

// ============================================================================
// JURISDICTION
// Definido en useLegalAdvisor como interfaz; universal para todo el dominio.
// ============================================================================

/** @shared-legal-core — Jurisdicción legal base */
export interface LegalJurisdictionInfo {
  /** Código ISO o interno (e.g. 'ES', 'ES-CT', 'EU') */
  code: string;
  /** Nombre legible (e.g. 'España', 'Cataluña') */
  name: string;
  /** País ISO 3166-1 alpha-2 */
  country: string;
  /** Subdivisión regional opcional */
  region?: string;
}

// ============================================================================
// LEGAL REFERENCE
// Usado en: legalReferenceResolver, bridgeEngine, useLegalAdvisor,
// useLegalKnowledge, legal-action-router edge function
// ============================================================================

/** @shared-legal-core — Referencia a artículo, ley o normativa */
export interface LegalReference {
  /** Identificador de la norma (e.g. 'ET', 'LGSS', 'RIRPF') */
  norm: string;
  /** Artículo específico (e.g. 'Art. 15.5', 'DA 7ª') */
  article: string;
  /** Descripción breve del contenido */
  description: string;
  /** URL oficial o de referencia (opcional) */
  url?: string;
  /** Fecha de última actualización conocida */
  lastUpdated?: string;
}

// ============================================================================
// LEGAL CONTEXT
// 2 variantes existentes (useLegalAdvisor, useLegalMatters) unificadas.
// ============================================================================

/** @shared-legal-core — Contexto mínimo compartido para operaciones legales */
export interface LegalContext {
  /** ID de la entidad sobre la que se opera */
  entityId: string;
  /** Tipo de entidad (employee, company, contract, etc.) */
  entityType: string;
  /** Nombre legible de la entidad */
  entityName?: string;
  /** Jurisdicciones aplicables */
  jurisdictions: string[];
  /** Especialidad legal (laboral, fiscal, mercantil, etc.) */
  specialty?: string;
  /** Datos adicionales específicos del módulo */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION RESULT
// Resultado genérico de validación legal, usado por Gateway, AI validator,
// HR compliance checks, y bridgeEngine.
// ============================================================================

/** @shared-legal-core — Resultado de una validación legal */
export interface LegalValidationResult {
  /** Estado resultante de la validación */
  status: LegalValidationStatus;
  /** Nivel de riesgo evaluado */
  riskLevel: LegalRiskLevel;
  /** Puntuación 0-100 */
  score: number;
  /** Resumen legible */
  summary: string;
  /** Referencias legales aplicadas */
  references: LegalReference[];
  /** Problemas identificados */
  issues: LegalValidationIssue[];
  /** Timestamp de la validación */
  validatedAt: string;
  /** Módulo que solicitó la validación */
  requestedBy?: LegalModuleType;
}

/** @shared-legal-core — Issue individual de validación */
export interface LegalValidationIssue {
  /** Severidad del issue */
  severity: LegalRiskLevel;
  /** Código de la regla violada */
  ruleCode: string;
  /** Descripción del problema */
  message: string;
  /** Referencia legal asociada */
  reference?: LegalReference;
  /** Acción sugerida para resolverlo */
  suggestedAction?: string;
}
