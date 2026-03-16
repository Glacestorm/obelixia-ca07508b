/**
 * HR Domains — Barrel re-exports
 * V2-RRHH-FASE-1: Architectural consolidation
 * 
 * 12 functional domains providing clean import paths.
 * No files were moved — these are pure re-exports.
 * 
 * Usage:
 *   import { HREmployeesPanel } from '@/components/erp/hr/domains/people';
 *   import { HRPayrollPanel } from '@/components/erp/hr/domains/payroll';
 */

export * from './people';
export * from './contracts';
export * from './payroll';
export * from './social-fiscal';
export * from './compliance';
export * from './documents';
export * from './portal';
export * from './workflows';
export * from './integrations';
export * from './talent';
export * from './analytics';
export * from './ai-tower';
