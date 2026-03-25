/**
 * useAIGovernance Hook
 * Phase 5 — GDPR / EU AI Act Governance
 * Tracks compliance status, risk classification, and audit readiness
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentRegistryItem } from './useAICommandCenter';

// EU AI Act risk classification
export type AIRiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal';

export interface GovernanceCheck {
  id: string;
  category: 'gdpr' | 'eu_ai_act' | 'lopdgdd' | 'ethics';
  requirement: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  evidence?: string;
  lastAudit?: string;
}

export interface AgentGovernanceProfile {
  agentCode: string;
  agentName: string;
  domain: string;
  riskLevel: AIRiskLevel;
  requiresHumanReview: boolean;
  hasExplainability: boolean;
  hasAuditTrail: boolean;
  dataProcessed: string[];
  complianceScore: number;
  checks: GovernanceCheck[];
}

export interface GovernanceKPIs {
  totalAgents: number;
  highRiskAgents: number;
  compliantAgents: number;
  partialAgents: number;
  nonCompliantAgents: number;
  overallScore: number;
  auditReadiness: number;
  humanInLoopCoverage: number;
  explainabilityCoverage: number;
  auditTrailCoverage: number;
}

// Static compliance framework based on GDPR + EU AI Act
const GOVERNANCE_CHECKS: Omit<GovernanceCheck, 'id' | 'status' | 'evidence' | 'lastAudit'>[] = [
  // GDPR
  { category: 'gdpr', requirement: 'Art. 22 — Decisiones automatizadas', description: 'Derecho a no ser objeto de decisiones basadas únicamente en tratamiento automatizado' },
  { category: 'gdpr', requirement: 'Art. 13/14 — Transparencia', description: 'Información sobre la lógica aplicada y consecuencias previstas del tratamiento' },
  { category: 'gdpr', requirement: 'Art. 25 — Privacidad por diseño', description: 'Protección de datos desde el diseño y por defecto' },
  { category: 'gdpr', requirement: 'Art. 35 — DPIA', description: 'Evaluación de impacto relativa a la protección de datos' },
  { category: 'gdpr', requirement: 'Art. 30 — Registro de actividades', description: 'Registro de actividades de tratamiento documentado' },
  // EU AI Act
  { category: 'eu_ai_act', requirement: 'Art. 6 — Clasificación de riesgo', description: 'Sistema clasificado según nivel de riesgo (inaceptable/alto/limitado/mínimo)' },
  { category: 'eu_ai_act', requirement: 'Art. 9 — Gestión de riesgos', description: 'Sistema de gestión de riesgos establecido y mantenido' },
  { category: 'eu_ai_act', requirement: 'Art. 11 — Documentación técnica', description: 'Documentación técnica completa antes de comercialización' },
  { category: 'eu_ai_act', requirement: 'Art. 13 — Transparencia IA', description: 'Diseñado para permitir interpretación adecuada del output' },
  { category: 'eu_ai_act', requirement: 'Art. 14 — Supervisión humana', description: 'Medidas de supervisión humana apropiadas' },
  { category: 'eu_ai_act', requirement: 'Art. 15 — Precisión y robustez', description: 'Niveles apropiados de precisión, robustez y ciberseguridad' },
  // LOPDGDD
  { category: 'lopdgdd', requirement: 'Art. 28 — DPO obligatorio', description: 'Designación de Delegado de Protección de Datos cuando aplique' },
  { category: 'lopdgdd', requirement: 'Art. 36 — Tratamiento datos sensibles', description: 'Garantías adicionales para datos especialmente protegidos' },
  // Ethics
  { category: 'ethics', requirement: 'Sesgo y equidad', description: 'Monitorización y mitigación de sesgos algorítmicos' },
  { category: 'ethics', requirement: 'Explicabilidad (XAI)', description: 'Capacidad de explicar decisiones de forma comprensible' },
  { category: 'ethics', requirement: 'Trazabilidad completa', description: 'Registro inmutable de todas las decisiones y razonamientos' },
];

function classifyRisk(agent: AgentRegistryItem): AIRiskLevel {
  // Agents in HR dealing with people decisions are high risk
  if (agent.module_domain === 'hr') return 'high';
  // Legal agents dealing with compliance
  if (agent.module_domain === 'legal') return 'high';
  // Supervisors that orchestrate are limited risk
  if (agent.agent_type === 'supervisor') return 'limited';
  // CRM/ERP specialists are limited
  if (['crm', 'erp'].includes(agent.module_domain)) return 'limited';
  return 'minimal';
}

function assessCompliance(agent: AgentRegistryItem): GovernanceCheck[] {
  return GOVERNANCE_CHECKS.map((check, idx) => {
    let status: GovernanceCheck['status'] = 'not_assessed';

    // Auto-assess based on agent configuration
    if (check.category === 'gdpr') {
      if (check.requirement.includes('Art. 22')) {
        status = agent.requires_human_review ? 'compliant' : 'partial';
      } else if (check.requirement.includes('Art. 30')) {
        // We have audit trail via invocations table
        status = 'compliant';
      } else if (check.requirement.includes('Art. 25')) {
        status = agent.confidence_threshold >= 70 ? 'compliant' : 'partial';
      } else {
        status = 'partial';
      }
    } else if (check.category === 'eu_ai_act') {
      if (check.requirement.includes('Art. 14')) {
        status = agent.requires_human_review ? 'compliant' : 'non_compliant';
      } else if (check.requirement.includes('Art. 6')) {
        status = 'compliant'; // We classify all agents
      } else if (check.requirement.includes('Art. 13')) {
        status = agent.confidence_threshold > 0 ? 'partial' : 'non_compliant';
      } else {
        status = 'partial';
      }
    } else if (check.category === 'lopdgdd') {
      status = 'partial';
    } else if (check.category === 'ethics') {
      if (check.requirement.includes('Trazabilidad')) {
        status = 'compliant'; // invocations table provides this
      } else if (check.requirement.includes('Explicabilidad')) {
        status = agent.confidence_threshold >= 70 ? 'partial' : 'non_compliant';
      } else {
        status = 'partial';
      }
    }

    return {
      ...check,
      id: `${agent.code}-${idx}`,
      status,
      lastAudit: new Date().toISOString(),
    };
  });
}

export function useAIGovernance(agents: AgentRegistryItem[]) {
  const [profiles, setProfiles] = useState<AgentGovernanceProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const buildProfiles = useCallback(() => {
    setLoading(true);
    const result: AgentGovernanceProfile[] = agents.map(agent => {
      const checks = assessCompliance(agent);
      const compliantCount = checks.filter(c => c.status === 'compliant').length;
      const score = checks.length > 0 ? Math.round((compliantCount / checks.length) * 100) : 0;

      return {
        agentCode: agent.code,
        agentName: agent.name,
        domain: agent.module_domain,
        riskLevel: classifyRisk(agent),
        requiresHumanReview: agent.requires_human_review,
        hasExplainability: agent.confidence_threshold >= 70,
        hasAuditTrail: true, // All agents log to invocations
        dataProcessed: [agent.module_domain],
        complianceScore: score,
        checks,
      };
    });
    setProfiles(result);
    setLoading(false);
  }, [agents]);

  useEffect(() => {
    if (agents.length > 0) buildProfiles();
  }, [agents, buildProfiles]);

  const kpis = useMemo<GovernanceKPIs>(() => {
    if (profiles.length === 0) {
      return {
        totalAgents: 0, highRiskAgents: 0, compliantAgents: 0,
        partialAgents: 0, nonCompliantAgents: 0, overallScore: 0,
        auditReadiness: 0, humanInLoopCoverage: 0,
        explainabilityCoverage: 0, auditTrailCoverage: 0,
      };
    }

    const highRisk = profiles.filter(p => p.riskLevel === 'high' || p.riskLevel === 'unacceptable').length;
    const scores = profiles.map(p => p.complianceScore);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const compliant = profiles.filter(p => p.complianceScore >= 80).length;
    const partial = profiles.filter(p => p.complianceScore >= 50 && p.complianceScore < 80).length;
    const nonCompliant = profiles.filter(p => p.complianceScore < 50).length;
    const humanLoop = profiles.filter(p => p.requiresHumanReview).length;
    const explainable = profiles.filter(p => p.hasExplainability).length;
    const auditable = profiles.filter(p => p.hasAuditTrail).length;

    return {
      totalAgents: profiles.length,
      highRiskAgents: highRisk,
      compliantAgents: compliant,
      partialAgents: partial,
      nonCompliantAgents: nonCompliant,
      overallScore: avgScore,
      auditReadiness: Math.round((auditable / profiles.length) * 100),
      humanInLoopCoverage: Math.round((humanLoop / profiles.length) * 100),
      explainabilityCoverage: Math.round((explainable / profiles.length) * 100),
      auditTrailCoverage: Math.round((auditable / profiles.length) * 100),
    };
  }, [profiles]);

  return { profiles, kpis, loading, refresh: buildProfiles };
}
