/**
 * useLegalEntityManagement Hook
 * Fase 8: Legal Entity & IP Management
 * Sistema de gestión de entidades legales, gobierno corporativo y propiedad intelectual
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES: Legal Entity ===
export interface LegalEntity {
  id: string;
  name: string;
  type: 'holding' | 'subsidiary' | 'branch' | 'joint_venture' | 'spe';
  jurisdiction: string;
  ownership_percentage: number;
  parent_entity: string | null;
  capital_structure: {
    share_capital: number;
    currency: string;
    shares_issued: number;
  };
  key_officers: string[];
  regulatory_status: 'active' | 'dormant' | 'in_liquidation';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface EntityStructureAnalysis {
  entities: LegalEntity[];
  structure_analysis: {
    complexity_score: number;
    tax_efficiency: number;
    regulatory_risk: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  consolidation_requirements: {
    consolidation_method: 'full' | 'equity' | 'proportional';
    reporting_obligations: string[];
  };
}

// === INTERFACES: Corporate Governance ===
export interface GovernanceAssessment {
  governance_score: number;
  board_composition: {
    total_members: number;
    independent_members: number;
    gender_diversity: number;
    expertise_coverage: string[];
  };
  committees: Array<{
    name: string;
    members: number;
    meets_requirements: boolean;
    recommendations: string[];
  }>;
  compliance_status: {
    articles_of_association: 'compliant' | 'needs_update';
    board_regulations: 'compliant' | 'missing' | 'outdated';
    general_meeting_regulations: 'compliant' | 'missing' | 'outdated';
    code_of_conduct: 'compliant' | 'missing' | 'outdated';
  };
  pending_actions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string;
    legal_basis: string;
  }>;
  improvement_areas: string[];
  best_practices_adopted: string[];
}

// === INTERFACES: Powers of Attorney ===
export interface PowerOfAttorney {
  id: string;
  type: 'general' | 'special' | 'banking' | 'judicial' | 'tax';
  grantor: string;
  attorney: string;
  granted_date: string;
  expiry_date: string | null;
  notary_protocol: string;
  faculties: Array<{
    category: 'banking' | 'contracts' | 'litigation' | 'tax' | 'corporate';
    description: string;
    limits: string;
    requires_joint_action: boolean;
  }>;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  registration_status: {
    commercial_registry: 'registered' | 'pending' | 'not_required';
    property_registry: 'registered' | 'pending' | 'not_required';
  };
  risk_assessment: 'low' | 'medium' | 'high';
}

export interface PowersAnalysis {
  powers_analysis: PowerOfAttorney[];
  expiring_soon: Array<{
    power_id: string;
    expires_in_days: number;
    renewal_recommendation: 'renew' | 'revoke' | 'modify';
  }>;
  faculty_gaps: Array<{
    needed_faculty: string;
    reason: string;
    recommended_action: string;
  }>;
  compliance_check: {
    all_powers_registered: boolean;
    no_expired_powers_in_use: boolean;
    proper_segregation: boolean;
  };
}

// === INTERFACES: IP Portfolio ===
export interface IPAsset {
  id: string;
  type: 'trademark' | 'patent' | 'design' | 'domain' | 'copyright' | 'trade_secret';
  name: string;
  registration_number: string;
  status: 'registered' | 'pending' | 'expired' | 'abandoned';
  jurisdictions: string[];
  filing_date: string;
  registration_date: string;
  expiry_date: string;
  renewal_due: string;
  classes: number[];
  owner_entity: string;
  annual_cost: number;
  valuation: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface IPPortfolioAnalysis {
  portfolio_summary: {
    total_assets: number;
    trademarks: number;
    patents: number;
    designs: number;
    domains: number;
    copyrights: number;
    estimated_value: number;
    currency: string;
  };
  assets: IPAsset[];
  renewal_calendar: Array<{
    asset_id: string;
    asset_name: string;
    renewal_date: string;
    renewal_cost: number;
    action_required_by: string;
  }>;
  risk_alerts: Array<{
    type: 'expiration' | 'infringement' | 'opposition' | 'cancellation';
    asset_id: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommended_action: string;
  }>;
  strategic_recommendations: Array<{
    category: 'expansion' | 'consolidation' | 'licensing' | 'divestment';
    recommendation: string;
    potential_value: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// === INTERFACES: Trademark Monitoring ===
export interface TrademarkAlert {
  id: string;
  type: 'similar_filing' | 'possible_infringement' | 'opposition_deadline' | 'domain_squatting';
  severity: 'low' | 'medium' | 'high' | 'critical';
  our_trademark: string;
  conflicting_mark: string;
  applicant: string;
  jurisdiction: string;
  filing_date: string;
  classes: number[];
  similarity_score: number;
  analysis: string;
  recommended_action: 'opposition' | 'vigilancia' | 'contacto' | 'none';
  action_deadline: string;
}

export interface TrademarkMonitoring {
  monitored_trademarks: number;
  alerts: TrademarkAlert[];
  market_intelligence: {
    competitor_filings: number;
    industry_trends: string[];
    emerging_threats: string[];
  };
  enforcement_recommendations: Array<{
    target: string;
    evidence_strength: 'strong' | 'moderate' | 'weak';
    recommended_approach: 'cease_desist' | 'negotiation' | 'litigation';
    estimated_cost: number;
    success_probability: number;
  }>;
}

// === INTERFACES: eDiscovery ===
export interface DiscoveryDocument {
  id: string;
  title: string;
  type: 'email' | 'contract' | 'memo' | 'report' | 'other';
  date: string;
  author: string;
  recipients: string[];
  relevance_score: number;
  privilege_status: 'privileged' | 'work_product' | 'not_privileged' | 'review_needed';
  key_terms_found: string[];
  summary: string;
  location: string;
}

export interface EDiscoveryResults {
  search_results: {
    total_documents: number;
    relevant_documents: number;
    privileged_documents: number;
    review_required: number;
  };
  documents: DiscoveryDocument[];
  timeline: Array<{
    date: string;
    event: string;
    related_documents: number;
    significance: 'high' | 'medium' | 'low';
  }>;
  custodians: Array<{
    name: string;
    role: string;
    documents_held: number;
    preservation_status: 'complete' | 'partial' | 'pending';
  }>;
  review_workflow: {
    first_pass_review: number;
    second_pass_review: number;
    final_review: number;
    estimated_hours: number;
  };
}

// === INTERFACES: Litigation Hold ===
export interface LitigationHold {
  id: string;
  matter_name: string;
  matter_type: 'litigation' | 'regulatory' | 'internal_investigation';
  status: 'active' | 'released' | 'pending';
  created_date: string;
  created_by: string;
  legal_counsel: string;
  description: string;
  scope: {
    date_range_start: string;
    date_range_end: string;
    document_types: string[];
    data_sources: string[];
    keywords: string[];
  };
  custodians: Array<{
    name: string;
    email: string;
    department: string;
    notification_sent: string;
    acknowledged: boolean;
    acknowledged_date: string | null;
    compliance_status: 'compliant' | 'non_compliant' | 'pending';
  }>;
  preserved_data: {
    total_items: number;
    total_size_gb: number;
    last_collection_date: string;
  };
}

export interface LitigationHoldManagement {
  active_holds: LitigationHold[];
  compliance_summary: {
    total_custodians: number;
    acknowledged: number;
    pending_acknowledgment: number;
    non_compliant: number;
  };
  risk_alerts: Array<{
    hold_id: string;
    alert_type: 'non_acknowledgment' | 'data_deletion_attempt' | 'scope_expansion_needed';
    severity: 'high' | 'medium' | 'low';
    description: string;
    recommended_action: string;
  }>;
  audit_trail: Array<{
    date: string;
    action: string;
    performed_by: string;
    details: string;
  }>;
}

// === INTERFACES: Corporate Calendar ===
export interface CorporateEvent {
  id: string;
  type: 'agm' | 'board_meeting' | 'filing_deadline' | 'renewal' | 'power_expiry' | 'tax_deadline';
  entity: string;
  title: string;
  date: string;
  deadline: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  legal_basis: string;
  responsible_person: string;
  status: 'scheduled' | 'pending' | 'completed' | 'overdue';
  reminders: Array<{
    days_before: number;
    sent: boolean;
  }>;
  required_actions: string[];
  related_documents: string[];
}

export interface CorporateCalendar {
  upcoming_events: CorporateEvent[];
  calendar_summary: {
    next_7_days: number;
    next_30_days: number;
    next_90_days: number;
    overdue: number;
  };
  recurring_obligations: Array<{
    obligation: string;
    frequency: 'annual' | 'quarterly' | 'monthly';
    next_occurrence: string;
    entity: string;
  }>;
  board_terms: Array<{
    member_name: string;
    position: string;
    entity: string;
    term_start: string;
    term_end: string;
    renewal_required: boolean;
  }>;
}

// === INTERFACES: Entity Risk Assessment ===
export interface EntityRiskAssessment {
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_categories: Array<{
    category: 'governance' | 'regulatory' | 'financial' | 'operational' | 'legal' | 'reputational';
    score: number;
    key_risks: Array<{
      risk_id: string;
      title: string;
      description: string;
      likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
      impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
      current_controls: string[];
      residual_risk: 'low' | 'medium' | 'high' | 'critical';
      mitigation_actions: Array<{
        action: string;
        owner: string;
        deadline: string;
        status: 'not_started' | 'in_progress' | 'completed';
      }>;
    }>;
  }>;
  compliance_gaps: Array<{
    regulation: string;
    gap_description: string;
    severity: 'high' | 'medium' | 'low';
    remediation_cost: number;
  }>;
  entity_specific_risks: Array<{
    entity: string;
    risk_score: number;
    primary_concerns: string[];
  }>;
  recommendations: Array<{
    priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    recommendation: string;
    expected_risk_reduction: number;
    estimated_cost: number;
  }>;
}

// === HOOK ===
export function useLegalEntityManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // State for different analyses
  const [entityStructure, setEntityStructure] = useState<EntityStructureAnalysis | null>(null);
  const [governance, setGovernance] = useState<GovernanceAssessment | null>(null);
  const [powers, setPowers] = useState<PowersAnalysis | null>(null);
  const [ipPortfolio, setIPPortfolio] = useState<IPPortfolioAnalysis | null>(null);
  const [trademarkMonitoring, setTrademarkMonitoring] = useState<TrademarkMonitoring | null>(null);
  const [eDiscovery, setEDiscovery] = useState<EDiscoveryResults | null>(null);
  const [litigationHolds, setLitigationHolds] = useState<LitigationHoldManagement | null>(null);
  const [corporateCalendar, setCorporateCalendar] = useState<CorporateCalendar | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<EntityRiskAssessment | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === Generic AI Action ===
  const performAction = useCallback(async <T>(
    action: string,
    context?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-entity-management',
        {
          body: { action, context, params }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setLastRefresh(new Date());
        return data.data as T;
      }

      throw new Error('Invalid response from AI');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error(`[useLegalEntityManagement] ${action} error:`, err);
      toast.error(`Error: ${message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === Specific Actions ===
  const analyzeEntityStructure = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<EntityStructureAnalysis>('analyze_entity_structure', context);
    if (result) setEntityStructure(result);
    return result;
  }, [performAction]);

  const assessGovernance = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<GovernanceAssessment>('corporate_governance_assessment', context);
    if (result) setGovernance(result);
    return result;
  }, [performAction]);

  const managePowers = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<PowersAnalysis>('powers_of_attorney_management', context);
    if (result) setPowers(result);
    return result;
  }, [performAction]);

  const analyzeIPPortfolio = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<IPPortfolioAnalysis>('ip_portfolio_analysis', context);
    if (result) setIPPortfolio(result);
    return result;
  }, [performAction]);

  const monitorTrademarks = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<TrademarkMonitoring>('trademark_monitoring', context);
    if (result) setTrademarkMonitoring(result);
    return result;
  }, [performAction]);

  const searchEDiscovery = useCallback(async (params: Record<string, unknown>) => {
    const result = await performAction<EDiscoveryResults>('ediscovery_search', undefined, params);
    if (result) setEDiscovery(result);
    return result;
  }, [performAction]);

  const manageLitigationHolds = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<LitigationHoldManagement>('litigation_hold_management', context);
    if (result) setLitigationHolds(result);
    return result;
  }, [performAction]);

  const checkEntityCompliance = useCallback(async (context: Record<string, unknown>) => {
    return await performAction('entity_compliance_check', context);
  }, [performAction]);

  const getCorporateCalendar = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<CorporateCalendar>('corporate_calendar', context);
    if (result) setCorporateCalendar(result);
    return result;
  }, [performAction]);

  const assessEntityRisk = useCallback(async (context: Record<string, unknown>) => {
    const result = await performAction<EntityRiskAssessment>('entity_risk_assessment', context);
    if (result) setRiskAssessment(result);
    return result;
  }, [performAction]);

  // === Auto-refresh ===
  const startAutoRefresh = useCallback((context: Record<string, unknown>, intervalMs = 300000) => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    
    getCorporateCalendar(context);
    
    autoRefreshInterval.current = setInterval(() => {
      getCorporateCalendar(context);
    }, intervalMs);
  }, [getCorporateCalendar]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    error,
    lastRefresh,
    entityStructure,
    governance,
    powers,
    ipPortfolio,
    trademarkMonitoring,
    eDiscovery,
    litigationHolds,
    corporateCalendar,
    riskAssessment,
    
    // Actions
    analyzeEntityStructure,
    assessGovernance,
    managePowers,
    analyzeIPPortfolio,
    monitorTrademarks,
    searchEDiscovery,
    manageLitigationHolds,
    checkEntityCompliance,
    getCorporateCalendar,
    assessEntityRisk,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useLegalEntityManagement;
