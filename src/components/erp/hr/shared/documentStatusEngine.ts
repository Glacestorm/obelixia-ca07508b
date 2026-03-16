/**
 * @migration Sprint 3 — Moved to src/engines/erp/hr/documentStatusEngine.ts
 * This file is a compatibility re-export. Import from '@/engines/erp/hr/documentStatusEngine' instead.
 */
export { computeDocStatus, getTrafficLightColor, getStatusLabel, isDocExpired, isDocExpiringSoon } from '@/engines/erp/hr/documentStatusEngine';
export type { DocStatusResult, TrafficLightColor } from '@/engines/erp/hr/documentStatusEngine';
