-- V2-ES.1 Block A: D1 + D2 — ALTER hr_payroll_record_lines

ALTER TABLE hr_payroll_record_lines 
  ADD COLUMN IF NOT EXISTS calculation_trace JSONB DEFAULT '{}'::jsonb;

ALTER TABLE hr_payroll_record_lines 
  ADD COLUMN IF NOT EXISTS incident_ref TEXT NULL;