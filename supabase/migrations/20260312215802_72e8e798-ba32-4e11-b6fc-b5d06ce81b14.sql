
-- WT1: Extend hr_tasks for unified workflow & task orchestration

-- Add new columns to hr_tasks
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS workflow_instance_id UUID REFERENCES erp_hr_workflow_instances(id) ON DELETE SET NULL;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS payroll_record_id UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS submission_id UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS assignment_id UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS assigned_role TEXT;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS sla_hours INT;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS sla_breached BOOL DEFAULT false;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS escalation_to TEXT;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS escalation_at TIMESTAMPTZ;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS escalated BOOL DEFAULT false;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS is_bulk BOOL DEFAULT false;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE hr_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_hr_tasks_category ON hr_tasks(category);
CREATE INDEX IF NOT EXISTS idx_hr_tasks_assigned_role ON hr_tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_hr_tasks_sla_breached ON hr_tasks(sla_breached) WHERE sla_breached = true;
CREATE INDEX IF NOT EXISTS idx_hr_tasks_status_priority ON hr_tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_hr_tasks_workflow ON hr_tasks(workflow_instance_id) WHERE workflow_instance_id IS NOT NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hr_tasks;
