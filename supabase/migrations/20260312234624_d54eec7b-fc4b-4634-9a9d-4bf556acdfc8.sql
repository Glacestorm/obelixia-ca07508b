-- V2-ES.1 Block B: D3-D7 — ALTER hr_payroll_records

ALTER TABLE hr_payroll_records 
  ADD COLUMN IF NOT EXISTS diff_vs_previous JSONB NULL;

ALTER TABLE hr_payroll_records 
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE hr_payroll_records 
  ADD CONSTRAINT hr_payroll_records_review_status_check 
  CHECK (review_status IN ('pending', 'reviewed', 'approved', 'flagged'));

ALTER TABLE hr_payroll_records 
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL;

ALTER TABLE hr_payroll_records 
  ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL;

ALTER TABLE hr_payroll_records 
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;