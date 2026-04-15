
ALTER TABLE erp_hr_employees DROP CONSTRAINT IF EXISTS erp_hr_employees_status_check;

ALTER TABLE erp_hr_employees ADD CONSTRAINT erp_hr_employees_status_check
  CHECK (status = ANY (ARRAY[
    'candidate','onboarding','active','inactive',
    'on_leave','temporary_leave','excedencia',
    'offboarding','terminated'
  ]));
