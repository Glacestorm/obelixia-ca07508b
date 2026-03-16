/**
 * @migration Sprint 3 — Moved to src/engines/erp/hr/documentStatusEngine.ts
 * This file is a compatibility re-export. Import from '@/engines/erp/hr/documentStatusEngine' instead.
 */
export { computeDocStatus, computeDocAlertSummary, getDocsNeedingAttention } from '@/engines/erp/hr/documentStatusEngine';
export type { DocTrafficLight, DocOperationalStatus, DocStatusResult, DocAlertSummary } from '@/engines/erp/hr/documentStatusEngine';
