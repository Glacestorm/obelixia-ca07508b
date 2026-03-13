ALTER TABLE hr_payroll_records
ADD CONSTRAINT uq_payroll_period_employee UNIQUE (payroll_period_id, employee_id);