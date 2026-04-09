-- S6.1A: RLS Hotfix for erp_hr_doc_action_queue
-- Drop dangerous open policies

DROP POLICY "Authenticated users can read action queue" ON erp_hr_doc_action_queue;
DROP POLICY "Authenticated users can insert action queue" ON erp_hr_doc_action_queue;
DROP POLICY "Authenticated users can update action queue" ON erp_hr_doc_action_queue;

-- Create tenant-isolated policies via indirect employee lookup

CREATE POLICY "Tenant isolation select on erp_hr_doc_action_queue"
  ON erp_hr_doc_action_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_employees e
      WHERE e.id = erp_hr_doc_action_queue.employee_id
        AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "Tenant isolation insert on erp_hr_doc_action_queue"
  ON erp_hr_doc_action_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM erp_hr_employees e
      WHERE e.id = erp_hr_doc_action_queue.employee_id
        AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "Tenant isolation update on erp_hr_doc_action_queue"
  ON erp_hr_doc_action_queue
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_employees e
      WHERE e.id = erp_hr_doc_action_queue.employee_id
        AND user_has_erp_company_access(e.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM erp_hr_employees e
      WHERE e.id = erp_hr_doc_action_queue.employee_id
        AND user_has_erp_company_access(e.company_id)
    )
  );

CREATE POLICY "Tenant isolation delete on erp_hr_doc_action_queue"
  ON erp_hr_doc_action_queue
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM erp_hr_employees e
      WHERE e.id = erp_hr_doc_action_queue.employee_id
        AND user_has_erp_company_access(e.company_id)
    )
  );