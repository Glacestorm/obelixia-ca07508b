-- S5.5 Tanda 2A Fix: Eliminar policies peligrosas residuales

DROP POLICY "Authenticated users can manage labor observations" ON erp_hr_labor_observations;
DROP POLICY "Authenticated users can manage multi employment" ON erp_hr_multi_employment;