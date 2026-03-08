-- Seed role experience profiles for all 8 organizational roles
-- Uses a representative company_id from erp_companies

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Get first active company
  SELECT id INTO v_company_id FROM public.erp_companies WHERE is_active = true LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No active company found, skipping seed';
    RETURN;
  END IF;

  -- CEO / Dirección General
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'ceo', 'CEO / Dirección General', 'Visión ejecutiva global de RRHH con foco en riesgo, headcount y equidad',
    '["executive_dashboard","fairness_engine","workforce_planning","compliance","analytics_bi","security_governance","digital_twin","orchestration"]'::jsonb,
    '[{"id":"qa_ceo_1","label":"Riesgo Global HR","icon":"shield","module":"security_governance","color":"red"},{"id":"qa_ceo_2","label":"Fairness Summary","icon":"scale","module":"fairness_engine","color":"violet"},{"id":"qa_ceo_3","label":"Headcount Real","icon":"users","module":"workforce_planning","color":"blue"},{"id":"qa_ceo_4","label":"Compliance","icon":"file-text","module":"compliance","color":"green"}]'::jsonb,
    '[{"id":"kpi_ceo_1","label":"Headcount Real","metric_key":"headcount","format":"number","color":"text-primary"},{"id":"kpi_ceo_2","label":"Brecha Salarial M/F","metric_key":"gender_gap","format":"percentage","color":"text-violet-500"},{"id":"kpi_ceo_3","label":"Compliance Score","metric_key":"compliance_score","format":"percentage","color":"text-emerald-500"},{"id":"kpi_ceo_4","label":"Contrataciones Críticas","metric_key":"critical_hires","format":"number","color":"text-destructive"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- Director/a RRHH
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'hr_director', 'Director/a RRHH', 'Gestión estratégica del capital humano con visibilidad completa',
    '["employees","departments","payroll","contracts","fairness_engine","workforce_planning","legal_engine","compliance","analytics_bi","talent","training","performance","digital_twin","cnae_intelligence","role_experience"]'::jsonb,
    '[{"id":"qa_hrd_1","label":"Brecha Salarial","icon":"dollar","module":"fairness_engine","color":"violet"},{"id":"qa_hrd_2","label":"Gaps Plantilla","icon":"target","module":"workforce_planning","color":"blue"},{"id":"qa_hrd_3","label":"Alertas Activas","icon":"zap","module":"compliance","color":"amber"},{"id":"qa_hrd_4","label":"Contratos Críticos","icon":"file-text","module":"legal_engine","color":"red"}]'::jsonb,
    '[{"id":"kpi_hrd_1","label":"Headcount","metric_key":"headcount","format":"number"},{"id":"kpi_hrd_2","label":"Salario Medio","metric_key":"avg_salary","format":"currency"},{"id":"kpi_hrd_3","label":"Brecha M/F","metric_key":"gender_gap","format":"percentage","color":"text-violet-500"},{"id":"kpi_hrd_4","label":"Casos Abiertos","metric_key":"open_cases","format":"number","color":"text-amber-500"},{"id":"kpi_hrd_5","label":"Contratos Activos","metric_key":"active_contracts","format":"number"},{"id":"kpi_hrd_6","label":"Skills Críticos","metric_key":"skill_gaps","format":"number","color":"text-orange-500"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- HR Operations / Admin
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'admin', 'HR Operations', 'Administración y operaciones diarias de RRHH',
    '["employees","departments","payroll","contracts","vacations","time_clock","onboarding","offboarding","documents","social_security","settlements","benefits"]'::jsonb,
    '[{"id":"qa_ops_1","label":"Nueva Alta","icon":"users","module":"employees","color":"blue"},{"id":"qa_ops_2","label":"Nóminas","icon":"dollar","module":"payroll","color":"green"},{"id":"qa_ops_3","label":"Contratos","icon":"file-text","module":"contracts","color":"indigo"},{"id":"qa_ops_4","label":"Vacaciones","icon":"activity","module":"vacations","color":"teal"}]'::jsonb,
    '[{"id":"kpi_ops_1","label":"Empleados Activos","metric_key":"headcount","format":"number"},{"id":"kpi_ops_2","label":"Contratos Activos","metric_key":"active_contracts","format":"number"},{"id":"kpi_ops_3","label":"Salario Medio","metric_key":"avg_salary","format":"currency"},{"id":"kpi_ops_4","label":"Incidencias","metric_key":"open_cases","format":"number","color":"text-amber-500"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- Manager / Responsable
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'manager', 'Manager / Responsable', 'Gestión operativa de equipo directo',
    '["employees","vacations","time_clock","performance","training"]'::jsonb,
    '[{"id":"qa_mgr_1","label":"Mi Equipo","icon":"users","module":"employees","color":"blue"},{"id":"qa_mgr_2","label":"Vacaciones","icon":"activity","module":"vacations","color":"teal"},{"id":"qa_mgr_3","label":"Evaluaciones","icon":"bar-chart","module":"performance","color":"violet"}]'::jsonb,
    '[{"id":"kpi_mgr_1","label":"Headcount Equipo","metric_key":"headcount","format":"number"},{"id":"kpi_mgr_2","label":"Skills Gaps","metric_key":"skill_gaps","format":"number","color":"text-orange-500"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- Auditor
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'auditor', 'Auditor/a', 'Control, compliance y fiscalización de procesos HR',
    '["compliance","security_governance","fairness_engine","analytics_bi","legal_engine"]'::jsonb,
    '[{"id":"qa_aud_1","label":"Compliance","icon":"shield","module":"compliance","color":"red"},{"id":"qa_aud_2","label":"Equidad","icon":"scale","module":"fairness_engine","color":"violet"},{"id":"qa_aud_3","label":"Seguridad","icon":"shield","module":"security_governance","color":"amber"}]'::jsonb,
    '[{"id":"kpi_aud_1","label":"Compliance Score","metric_key":"compliance_score","format":"percentage","color":"text-emerald-500"},{"id":"kpi_aud_2","label":"Casos Abiertos","metric_key":"open_cases","format":"number","color":"text-destructive"},{"id":"kpi_aud_3","label":"Brecha M/F","metric_key":"gender_gap","format":"percentage","color":"text-violet-500"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- Employee
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'employee', 'Empleado/a', 'Mi espacio personal de RRHH',
    '["vacations","time_clock","documents","training","benefits"]'::jsonb,
    '[{"id":"qa_emp_1","label":"Mis Vacaciones","icon":"activity","module":"vacations","color":"teal"},{"id":"qa_emp_2","label":"Fichaje","icon":"clock","module":"time_clock","color":"blue"},{"id":"qa_emp_3","label":"Formación","icon":"brain","module":"training","color":"violet"}]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  -- CFO / Payroll & Compensation
  INSERT INTO public.erp_hr_role_experience_profiles (company_id, role_key, role_label, description, visible_modules, quick_actions, kpi_widgets, dashboard_layout, notification_preferences, theme_overrides, is_active)
  VALUES (v_company_id, 'cfo', 'Payroll & Compensation', 'Métricas salariales, anomalías y equidad retributiva',
    '["payroll","fairness_engine","workforce_planning","analytics_bi","compensation","settlements","social_security"]'::jsonb,
    '[{"id":"qa_cfo_1","label":"Nóminas","icon":"dollar","module":"payroll","color":"green"},{"id":"qa_cfo_2","label":"Equidad Salarial","icon":"scale","module":"fairness_engine","color":"violet"},{"id":"qa_cfo_3","label":"Coste Plantilla","icon":"bar-chart","module":"workforce_planning","color":"blue"}]'::jsonb,
    '[{"id":"kpi_cfo_1","label":"Salario Medio","metric_key":"avg_salary","format":"currency"},{"id":"kpi_cfo_2","label":"Brecha M/F","metric_key":"gender_gap","format":"percentage","color":"text-violet-500"},{"id":"kpi_cfo_3","label":"Headcount","metric_key":"headcount","format":"number"},{"id":"kpi_cfo_4","label":"Contrataciones Críticas","metric_key":"critical_hires","format":"number","color":"text-destructive"}]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded role experience profiles for company %', v_company_id;
END $$;
