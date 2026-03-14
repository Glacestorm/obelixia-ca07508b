/**
 * sandboxEligibilityEngine.ts — Motor de elegibilidad sandbox por dominio
 * V2-ES.8 T8 P3: Checklist/gate con 4 niveles de elegibilidad
 * 
 * Reutiliza: readiness, certificados, aprobación pre-real, alertas
 * INVARIANTE: producción siempre bloqueada
 */

import type { SandboxDomain, ConnectorEnvironment, GateEvaluationResult } from './sandboxEnvironmentEngine';
import { isRealSubmissionBlocked } from './sandboxEnvironmentEngine';

// ======================== TYPES ========================

export type SandboxEligibility = 'not_eligible' | 'partially_eligible' | 'eligible_for_sandbox' | 'sandbox_enabled';

export interface EligibilityCheckItem {
  id: string;
  label: string;
  description: string;
  category: 'configuration' | 'readiness' | 'certificate' | 'approval' | 'disclaimer' | 'domain' | 'environment' | 'safety';
  passed: boolean;
  blocking: boolean;
  detail: string;
}

export interface SandboxEligibilityResult {
  domain: SandboxDomain;
  environment: ConnectorEnvironment;
  eligibility: SandboxEligibility;
  checks: EligibilityCheckItem[];
  blockers: EligibilityCheckItem[];
  warnings: EligibilityCheckItem[];
  passedCount: number;
  totalCount: number;
  percentage: number;
  productionBlocked: true;
  evaluatedAt: string;
  summary: string;
}

export interface EligibilityContext {
  // Configuration
  adapterConfigured: boolean;
  adapterActive: boolean;
  domainSupported: boolean;
  // Readiness
  readinessScore: number; // 0-100
  readinessLevel: string;
  hasBlockers: boolean;
  // Certificate
  hasCertificate: boolean;
  certificateExpired: boolean;
  certificateCompatibleWithSandbox: boolean;
  // Approval
  hasPreRealApproval: boolean;
  approvalStatus: string | null;
  // Environment
  sandboxExplicitlyEnabled: boolean;
  currentEnvironment: ConnectorEnvironment;
  // Execution history
  sandboxSuccessCount: number;
  lastSandboxExecution: string | null;
  // Disclaimers
  disclaimersAccepted: boolean;
}

// ======================== GATE DEFINITIONS ========================

const SANDBOX_ELIGIBILITY_CHECKS: Omit<EligibilityCheckItem, 'passed' | 'detail'>[] = [
  {
    id: 'config_sufficient',
    label: 'Configuración suficiente',
    description: 'El conector tiene configuración mínima para operar',
    category: 'configuration',
    blocking: true,
  },
  {
    id: 'adapter_active',
    label: 'Conector activo',
    description: 'El conector está habilitado y activo',
    category: 'configuration',
    blocking: true,
  },
  {
    id: 'domain_supported',
    label: 'Dominio soportado',
    description: 'El dominio regulatorio está soportado en sandbox',
    category: 'domain',
    blocking: true,
  },
  {
    id: 'readiness_minimum',
    label: 'Readiness mínimo (≥40%)',
    description: 'El score de readiness alcanza el mínimo para sandbox',
    category: 'readiness',
    blocking: true,
  },
  {
    id: 'no_critical_blockers',
    label: 'Sin blockers críticos',
    description: 'No existen errores de validación que impidan la simulación',
    category: 'readiness',
    blocking: true,
  },
  {
    id: 'certificate_compatible',
    label: 'Certificado compatible con sandbox',
    description: 'Si hay certificado configurado, es compatible con el entorno sandbox',
    category: 'certificate',
    blocking: false,
  },
  {
    id: 'certificate_not_expired',
    label: 'Certificado vigente',
    description: 'El certificado digital no está expirado',
    category: 'certificate',
    blocking: false,
  },
  {
    id: 'pre_real_approval',
    label: 'Aprobación pre-real (si aplica)',
    description: 'Existe aprobación pre-real para el dominio (recomendado, no bloqueante en sandbox)',
    category: 'approval',
    blocking: false,
  },
  {
    id: 'disclaimers_visible',
    label: 'Disclaimers visibles',
    description: 'Los disclaimers de entorno sandbox están visibles y aceptados',
    category: 'disclaimer',
    blocking: true,
  },
  {
    id: 'sandbox_explicitly_enabled',
    label: 'Sandbox explícitamente habilitado',
    description: 'El entorno sandbox ha sido activado de forma explícita',
    category: 'environment',
    blocking: true,
  },
  {
    id: 'prod_blocked',
    label: 'Producción bloqueada',
    description: 'isRealSubmissionBlocked() === true',
    category: 'safety',
    blocking: true,
  },
];

// ======================== EVALUATOR ========================

export function evaluateSandboxEligibility(
  domain: SandboxDomain,
  env: ConnectorEnvironment,
  ctx: EligibilityContext
): SandboxEligibilityResult {
  const now = new Date().toISOString();

  // Production is ALWAYS blocked
  if (env === 'production') {
    return {
      domain,
      environment: env,
      eligibility: 'not_eligible',
      checks: [{
        id: 'prod_blocked',
        label: 'Producción bloqueada',
        description: 'No disponible en esta fase',
        category: 'safety',
        passed: false,
        blocking: true,
        detail: 'Producción bloqueada por invariante de seguridad del sistema',
      }],
      blockers: [{
        id: 'prod_blocked',
        label: 'Producción bloqueada',
        description: 'No disponible',
        category: 'safety',
        passed: false,
        blocking: true,
        detail: 'isRealSubmissionBlocked() === true',
      }],
      warnings: [],
      passedCount: 0,
      totalCount: 1,
      percentage: 0,
      productionBlocked: true,
      evaluatedAt: now,
      summary: 'Producción no disponible en esta fase del sistema.',
    };
  }

  const checks: EligibilityCheckItem[] = SANDBOX_ELIGIBILITY_CHECKS.map(check => {
    let passed = false;
    let detail = '';

    switch (check.id) {
      case 'config_sufficient':
        passed = ctx.adapterConfigured;
        detail = passed ? 'Conector configurado correctamente' : 'Falta configuración mínima del conector';
        break;
      case 'adapter_active':
        passed = ctx.adapterActive;
        detail = passed ? 'Conector activo' : 'El conector no está activo';
        break;
      case 'domain_supported':
        passed = ctx.domainSupported;
        detail = passed ? `Dominio ${domain} soportado` : `Dominio ${domain} no soportado en sandbox`;
        break;
      case 'readiness_minimum':
        passed = ctx.readinessScore >= 40;
        detail = `Readiness: ${ctx.readinessScore}% (mínimo 40%)`;
        break;
      case 'no_critical_blockers':
        passed = !ctx.hasBlockers;
        detail = passed ? 'Sin blockers críticos' : 'Existen blockers que deben resolverse';
        break;
      case 'certificate_compatible':
        passed = !ctx.hasCertificate || ctx.certificateCompatibleWithSandbox;
        detail = !ctx.hasCertificate
          ? 'Sin certificado (no requerido en sandbox)'
          : passed ? 'Certificado compatible con sandbox' : 'Certificado no compatible con sandbox';
        break;
      case 'certificate_not_expired':
        passed = !ctx.hasCertificate || !ctx.certificateExpired;
        detail = !ctx.hasCertificate
          ? 'Sin certificado configurado'
          : passed ? 'Certificado vigente' : 'Certificado expirado';
        break;
      case 'pre_real_approval':
        passed = ctx.hasPreRealApproval;
        detail = passed
          ? `Aprobación pre-real: ${ctx.approvalStatus}`
          : 'Sin aprobación pre-real (recomendado pero no bloqueante en sandbox)';
        break;
      case 'disclaimers_visible':
        passed = ctx.disclaimersAccepted;
        detail = passed ? 'Disclaimers aceptados' : 'Debe aceptar los disclaimers de entorno sandbox';
        break;
      case 'sandbox_explicitly_enabled':
        passed = ctx.sandboxExplicitlyEnabled;
        detail = passed ? 'Sandbox habilitado explícitamente' : 'Sandbox no ha sido habilitado';
        break;
      case 'prod_blocked':
        passed = isRealSubmissionBlocked();
        detail = 'isRealSubmissionBlocked() === true';
        break;
    }

    return { ...check, passed, detail };
  });

  const blockers = checks.filter(c => c.blocking && !c.passed);
  const warnings = checks.filter(c => !c.blocking && !c.passed);
  const passedCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const percentage = Math.round((passedCount / totalCount) * 100);

  // Determine eligibility level
  let eligibility: SandboxEligibility;
  if (blockers.length > 0) {
    // Check if at least some non-blocking checks pass
    const blockingPassed = checks.filter(c => c.blocking && c.passed).length;
    const blockingTotal = checks.filter(c => c.blocking).length;
    eligibility = blockingPassed > 0 ? 'partially_eligible' : 'not_eligible';
  } else if (ctx.sandboxExplicitlyEnabled && ctx.sandboxSuccessCount > 0) {
    eligibility = 'sandbox_enabled';
  } else {
    eligibility = 'eligible_for_sandbox';
  }

  // Build summary
  const summaryParts: string[] = [];
  if (eligibility === 'not_eligible') {
    summaryParts.push(`No elegible: ${blockers.length} requisito(s) bloqueante(s) pendiente(s).`);
  } else if (eligibility === 'partially_eligible') {
    summaryParts.push(`Parcialmente elegible: ${blockers.length} gate(s) pendiente(s).`);
  } else if (eligibility === 'eligible_for_sandbox') {
    summaryParts.push('Elegible para sandbox. Todos los gates cumplidos.');
  } else {
    summaryParts.push(`Sandbox activo. ${ctx.sandboxSuccessCount} ejecución(es) realizadas.`);
  }
  if (warnings.length > 0) {
    summaryParts.push(`${warnings.length} aviso(s) no bloqueante(s).`);
  }

  return {
    domain,
    environment: env,
    eligibility,
    checks,
    blockers,
    warnings,
    passedCount,
    totalCount,
    percentage,
    productionBlocked: true,
    evaluatedAt: now,
    summary: summaryParts.join(' '),
  };
}

// ======================== ELIGIBILITY LABELS ========================

export const ELIGIBILITY_LABELS: Record<SandboxEligibility, {
  label: string;
  color: string;
  icon: string;
}> = {
  not_eligible: { label: 'No elegible', color: 'text-destructive', icon: '🚫' },
  partially_eligible: { label: 'Parcialmente elegible', color: 'text-amber-600', icon: '⚠️' },
  eligible_for_sandbox: { label: 'Elegible', color: 'text-emerald-600', icon: '✅' },
  sandbox_enabled: { label: 'Sandbox activo', color: 'text-emerald-700', icon: '🧪' },
};
