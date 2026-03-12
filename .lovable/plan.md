

# HR Workflows & Tasks System — Unified Orchestration Layer

## Current State

**Already exists:**
- **`hr_tasks` table**: Basic tasks with `task_type`, `priority`, `status`, `assigned_to`, `employee_id`, `related_entity_type/id`, `parent_task_id`, `due_date`, `metadata`. RLS enabled.
- **Workflow engine tables** (`erp_hr_workflow_definitions`, `steps`, `instances`, `decisions`, `delegations`, `sla_tracking`): Full approval workflow with SLA and escalation.
- **`useHRWorkflowEngine` hook**: `startWorkflow`, `decideStep`, `fetchInbox`, `fetchSLAStatus`, `fetchStats`, `seedWorkflows` — all via `erp-hr-workflow-engine` edge function.
- **`HRApprovalInbox`**: Functional approval inbox with SLA indicators.
- **`HRSLADashboard`**: SLA breach tracking.
- **`HRWorkflowDesigner`**: No-code workflow definition editor.
- **`HRTasksPanel`**: Static demo data only (4 hardcoded tasks).
- **`useAdminPortal`**: Already creates `hr_tasks` rows when admin requests are processed.

**Missing:**
- No hook for CRUD on `hr_tasks` (only insert from admin portal)
- No functional task panel (current one is demo-only)
- No unified task dashboard connecting workflows + tasks + documents + submissions + mobility
- No assignment rules, reminders, escalation on tasks
- No bulk actions
- No role-based views
- `hr_tasks` lacks fields for SLA, reminders, source tracking, workflow linkage

## Design

### 1. Migration — Extend `hr_tasks`

**ALTER `hr_tasks`:**
- `category` TEXT — `admin_request`, `payroll`, `mobility`, `document`, `compliance`, `integration`, `onboarding`, `offboarding`, `general`
- `source_type` TEXT nullable — `manual`, `workflow`, `admin_request`, `system`, `scheduled`
- `source_id` UUID nullable — ID of originating entity
- `workflow_instance_id` UUID nullable FK → `erp_hr_workflow_instances(id)`
- `contract_id` UUID nullable
- `payroll_record_id` UUID nullable
- `submission_id` UUID nullable
- `assignment_id` UUID nullable (mobility)
- `assigned_role` TEXT nullable — role-based assignment (vs specific user)
- `sla_hours` INT nullable — SLA deadline in hours from creation
- `sla_deadline` TIMESTAMPTZ nullable — computed deadline
- `sla_breached` BOOL DEFAULT false
- `reminder_at` TIMESTAMPTZ nullable
- `escalation_to` TEXT nullable — role to escalate to
- `escalation_at` TIMESTAMPTZ nullable
- `escalated` BOOL DEFAULT false
- `tags` TEXT[] nullable
- `is_bulk` BOOL DEFAULT false — part of bulk action
- `created_by` UUID nullable

Enable realtime on `hr_tasks`.

### 2. Hook: `useHRTasksEngine`

New hook at `src/hooks/erp/hr/useHRTasksEngine.ts`:

**Task CRUD:**
- `fetchTasks(filters)` — filters: category, status, priority, assigned_to, assigned_role, employee_id, source_type, sla_breached, dateRange
- `getTask(id)` — full detail with related entities
- `createTask(data)` — manual or system-generated
- `updateTask(id, data)`
- `completeTask(id)` — mark done with timestamp
- `reassignTask(id, assignee)` — reassign to user or role
- `bulkAction(taskIds, action)` — complete, reassign, change priority, cancel

**SLA & Escalation:**
- `checkSLABreaches()` — flag overdue tasks
- `escalateTask(id)` — escalate to next role
- `getOverdueTasks()` — SLA breached list
- `getUpcomingDeadlines(hours)` — tasks nearing SLA

**Stats:**
- `getTaskStats(filters?)` — by status, category, assignee, SLA compliance
- `getMyTasks(userId)` — personal task list

**Auto-generation rules (in hook logic):**
- When admin request created → generate task
- When document expires → generate review task
- When submission rejected → generate correction task
- When mobility document expiring → generate renewal task
- When payroll period opens → generate review tasks

### 3. Components

All under `src/components/erp/hr/tasks/`:

**`HRTasksModule`** — Main panel (replaces `HRTasksPanel` placeholder)
- Tabs: Mi Bandeja | Por Equipo | Por Expediente | SLA | Configuración

**`TasksDashboard`** — KPIs
- Stats: pending, overdue, completed today, SLA compliance %, by category
- Charts: tasks by category, trend, SLA breaches
- Alert cards: overdue tasks requiring immediate action

**`TasksList`** — Unified task list with filters
- Filters: category, status, priority, assignee/role, employee, source, SLA status
- Columns: title, category, employee, assignee, priority, due date, SLA indicator, status
- Inline actions: complete, reassign, escalate
- Bulk selection + bulk actions bar

**`TaskForm`** — Create/edit task
- Category selection → contextual fields
- Link to: employee, contract, payroll, submission, mobility assignment
- Assignment: specific user OR role
- SLA: hours, reminder, escalation config
- Parent task (subtasks support)

**`TaskDetail`** — Slide-over detail
- Header: title, status, priority, category badge
- Related entity links (clickable → navigate to employee/payroll/submission)
- Assignment info + reassign action
- SLA timeline (created → reminder → deadline → escalation)
- Activity log (status changes, reassignments)
- Subtasks list
- Comments (reuse `erp_hr_document_comments` pattern)

**`TasksByExpedient`** — View tasks grouped by employee expedient
- Select employee → see all related tasks across categories
- Timeline view of task lifecycle per employee

**`TaskAssignmentRules`** — Configuration panel
- Rules: when category X → assign to role Y
- Auto-escalation: after N hours → escalate to role Z
- SLA defaults per category

### 4. Integration

| Point | Change |
|---|---|
| `HRModule.tsx` | `hr-tasks` → `HRTasksModule` (replaces demo panel) |
| `HRNavigationMenu` | Keep existing entry, update description |
| `useAdminPortal` | Already creates tasks — add category + source fields |
| `useOfficialIntegrationsHub` | On rejection → auto-create correction task |
| `useGlobalMobility` | On document expiry → auto-create renewal task |
| `useHRDocumentExpedient` | On document expiry → auto-create review task |
| `HRApprovalInbox` | Add link to related tasks |
| Barrel exports | `src/components/erp/hr/tasks/index.ts` |

### 5. Implementation Order

| Phase | Content |
|---|---|
| **WT1** | Migration: ALTER `hr_tasks` + realtime |
| **WT2** | `useHRTasksEngine` hook (CRUD, SLA, bulk, stats) |
| **WT3** | `HRTasksModule` + `TasksDashboard` + `TasksList` |
| **WT4** | `TaskForm` + `TaskDetail` + `TasksByExpedient` |
| **WT5** | `TaskAssignmentRules` + integration (HRModule, auto-generation from other modules) |

