/**
 * Domain D8: Workflows & Approvals
 * Admin requests, tasks, approvals, time management, leave, alerts
 * 
 * V2-RRHH-FASE-1 Sprint 2: Added incident dialog from root
 * V2-RRHH-FASE-1 Sprint 3: Added HRAlertsPanel (multicanal alerts = workflow domain)
 */

// ── Time & Leave ──
export { HRVacationsPanel } from '../../HRVacationsPanel';
export { HRTimeClockPanel } from '../../HRTimeClockPanel';

// ── Alerts (Sprint 3: assigned to D8 — alert workflows, notifications, escalation) ──
export { HRAlertsPanel } from '../../HRAlertsPanel';

// ── Dialogs ──
export { HRVacationRequestDialog } from '../../HRVacationRequestDialog';
export { HRIncidentFormDialog } from '../../HRIncidentFormDialog';

// ── Admin portal & tasks ──
export { HRAdminPortal } from '../../admin-portal';
export { HRTasksModule } from '../../tasks';

// ── Enterprise workflows ──
export { HRApprovalInbox } from '../../enterprise/HRApprovalInbox';
export { HRWorkflowDesigner } from '../../enterprise/HRWorkflowDesigner';

// ── Global panels ──
export { HRLeaveIncidentsPanel } from '../../global';
