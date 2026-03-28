/**
 * ERP Legal Hooks - Barrel Export
 */

export { useLegalMatters } from './useLegalMatters';
export type {
  LegalMatter,
  TimeEntry,
  LegalExpense,
  LegalInvoice,
  SpendAnalytics,
  LegalContext
} from './useLegalMatters';

export { useLegalProcedures } from './useLegalProcedures';
export type {
  LegalProcedure,
  IntentClassification
} from './useLegalProcedures';
