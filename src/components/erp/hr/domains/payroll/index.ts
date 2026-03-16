/**
 * Domain D3: Payroll
 * Payroll engine, runs, periods, recalculation, total rewards
 * 
 * V2-RRHH-FASE-1 Sprint 2: Added benefits panel
 * V2-RRHH-FASE-1 Sprint 3: Added TotalRewardsDashboardPanel, settlements
 */

// ── Panels ──
export { HRPayrollPanel } from '../../HRPayrollPanel';
export { HRPayrollRecalculationPanel } from '../../HRPayrollRecalculationPanel';
export { HRSocialBenefitsPanel } from '../../HRSocialBenefitsPanel';
export { HRSettlementsPanel } from '../../HRSettlementsPanel';

// ── Total Rewards (Sprint 3: assigned to D3 — compensation + benefits + recognition) ──
export { TotalRewardsDashboardPanel } from '../../TotalRewardsDashboardPanel';

// ── Dialogs ──
export { HRPayrollEntryDialog } from '../../HRPayrollEntryDialog';

// ── Engine ──
export { HRPayrollEngine } from '../../payroll-engine';
