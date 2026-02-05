/**
 * Audit PDF Generator - Shared Types
 * Auto-updating module inventory system
 */

// ============================================
// CORE TYPES
// ============================================

export type AuditScope = 'erp' | 'crm' | 'combined';
export type DetailLevel = 'executive' | 'detailed' | 'complete';

export interface AuditConfig {
  scope: AuditScope;
  detailLevel: DetailLevel;
  includeCharts: boolean;
  includeCompetitorAnalysis: boolean;
  includeRoadmap: boolean;
  includeTechnicalDetails: boolean;
}

export interface ModuleFeature {
  name: string;
  description: string;
  status: 'complete' | 'partial' | 'pending' | 'innovation' | 'advantage';
  category: string;
  subCategory?: string;
  edgeFunctions?: string[];
  hooks?: string[];
  panels?: string[];
  components?: string[];
}

export interface ModuleInventory {
  name: string;
  code: string;
  description: string;
  version: string;
  features: ModuleFeature[];
  edgeFunctions: string[];
  hooks: string[];
  panels: string[];
  totalFeatures: number;
  completedFeatures: number;
  innovationFeatures: number;
}

export interface CompetitorFeature {
  feature: string;
  competitor1: 'yes' | 'partial' | 'no';
  competitor2: 'yes' | 'partial' | 'no';
  competitor3: 'yes' | 'partial' | 'no';
  competitor4?: 'yes' | 'partial' | 'no';
  obelixia: 'yes' | 'partial' | 'no';
  status: 'complete' | 'advantage' | 'innovation' | 'pending';
}

export interface CompetitorProfile {
  name: string;
  fullName: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ModuleAuditData {
  inventory: ModuleInventory;
  competitors: CompetitorProfile[];
  competitorFeatures: CompetitorFeature[];
  strengths: string[];
  gaps: string[];
  innovations: string[];
  position: string;
  ranking: string;
}

export interface CombinedAuditData {
  erp: ModuleAuditData[];
  crm: ModuleAuditData[];
  crossModuleFeatures: ModuleFeature[];
  integrationScore: number;
  overallPosition: string;
}

// ============================================
// MODULE STATS FOR UI
// ============================================

export interface ModuleStats {
  name: string;
  code: string;
  features: number;
  edgeFunctions: number;
  status: 'complete' | 'advanced' | 'innovation';
  highlights: string[];
}
