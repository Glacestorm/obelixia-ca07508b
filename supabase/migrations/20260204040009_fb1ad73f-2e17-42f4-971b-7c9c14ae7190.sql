-- =====================================================
-- Fase 4 & 7: Sistema de Alertas y Cron Jobs
-- Triggers automáticos y tareas programadas
-- =====================================================

-- Función para generar alertas automáticas basadas en vencimientos
CREATE OR REPLACE FUNCTION generate_compliance_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deadline_rec RECORD;
  days_remaining INTEGER;
  alert_level TEXT;
  existing_alert_id UUID;
BEGIN
  -- Iterar sobre vencimientos pendientes
  FOR deadline_rec IN 
    SELECT 
      od.id,
      od.company_id,
      od.deadline_date,
      od.status,
      ao.obligation_name,
      ao.organism,
      ao.sanction_min,
      ao.sanction_max
    FROM erp_hr_obligation_deadlines od
    JOIN erp_hr_admin_obligations ao ON od.obligation_id = ao.id
    WHERE od.status IN ('pending', 'in_progress')
      AND od.deadline_date >= CURRENT_DATE - INTERVAL '7 days'
      AND od.deadline_date <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    -- Calcular días restantes
    days_remaining := (deadline_rec.deadline_date - CURRENT_DATE)::INTEGER;
    
    -- Determinar nivel de alerta
    IF days_remaining <= 0 THEN
      alert_level := 'critical';
    ELSIF days_remaining <= 3 THEN
      alert_level := 'critical';
    ELSIF days_remaining <= 7 THEN
      alert_level := 'urgent';
    ELSIF days_remaining <= 15 THEN
      alert_level := 'alert';
    ELSE
      alert_level := 'prealert';
    END IF;
    
    -- Verificar si ya existe una alerta no resuelta
    SELECT id INTO existing_alert_id
    FROM erp_hr_sanction_alerts
    WHERE company_id = deadline_rec.company_id
      AND obligation_deadline_id = deadline_rec.id
      AND is_resolved = false
    LIMIT 1;
    
    IF existing_alert_id IS NOT NULL THEN
      -- Actualizar alerta existente
      UPDATE erp_hr_sanction_alerts
      SET 
        alert_level = alert_level,
        days_remaining = days_remaining,
        updated_at = now()
      WHERE id = existing_alert_id;
    ELSE
      -- Crear nueva alerta
      INSERT INTO erp_hr_sanction_alerts (
        company_id,
        obligation_deadline_id,
        alert_level,
        days_remaining,
        potential_sanction_min,
        potential_sanction_max,
        title,
        description,
        recommended_actions
      ) VALUES (
        deadline_rec.company_id,
        deadline_rec.id,
        alert_level,
        days_remaining,
        deadline_rec.sanction_min,
        deadline_rec.sanction_max,
        'Vencimiento próximo: ' || deadline_rec.obligation_name,
        'El plazo para ' || deadline_rec.obligation_name || ' (' || deadline_rec.organism || ') vence en ' || days_remaining || ' días.',
        ARRAY['Revisar documentación', 'Preparar presentación', 'Verificar datos']
      );
    END IF;
  END LOOP;
END;
$$;

-- Función para escalar alertas críticas al módulo jurídico
CREATE OR REPLACE FUNCTION escalate_critical_alerts_to_legal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE erp_hr_sanction_alerts
  SET 
    legal_agent_notified = true,
    legal_agent_notified_at = now(),
    updated_at = now()
  WHERE alert_level IN ('critical', 'urgent')
    AND is_resolved = false
    AND legal_agent_notified = false
    AND days_remaining <= 7;
END;
$$;

-- Función para marcar vencimientos como atrasados
CREATE OR REPLACE FUNCTION mark_overdue_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE erp_hr_obligation_deadlines
  SET 
    status = 'overdue',
    updated_at = now()
  WHERE status IN ('pending', 'in_progress')
    AND deadline_date < CURRENT_DATE;
END;
$$;

-- Trigger para actualizar alertas cuando cambia un deadline
CREATE OR REPLACE FUNCTION trigger_update_alert_on_deadline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si se completa el deadline, resolver alertas relacionadas
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE erp_hr_sanction_alerts
    SET 
      is_resolved = true,
      resolved_at = now(),
      resolution_notes = 'Obligación completada',
      updated_at = now()
    WHERE obligation_deadline_id = NEW.id
      AND is_resolved = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trg_update_alert_on_deadline_change ON erp_hr_obligation_deadlines;
CREATE TRIGGER trg_update_alert_on_deadline_change
  AFTER UPDATE ON erp_hr_obligation_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_alert_on_deadline_change();

-- Trigger para notificar al agente de RRHH cuando se crea una alerta crítica
CREATE OR REPLACE FUNCTION trigger_notify_hr_on_critical_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar como notificado al agente RRHH
  IF NEW.alert_level IN ('critical', 'urgent') AND NEW.hr_agent_notified = false THEN
    NEW.hr_agent_notified := true;
    NEW.hr_agent_notified_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para notificación automática
DROP TRIGGER IF EXISTS trg_notify_hr_on_critical_alert ON erp_hr_sanction_alerts;
CREATE TRIGGER trg_notify_hr_on_critical_alert
  BEFORE INSERT ON erp_hr_sanction_alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_hr_on_critical_alert();

-- Función wrapper para cron job diario
CREATE OR REPLACE FUNCTION run_daily_compliance_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Marcar vencimientos atrasados
  PERFORM mark_overdue_deadlines();
  
  -- 2. Generar alertas de cumplimiento
  PERFORM generate_compliance_alerts();
  
  -- 3. Escalar alertas críticas
  PERFORM escalate_critical_alerts_to_legal();
  
  RAISE NOTICE 'Daily compliance check completed at %', now();
END;
$$;

-- Función para obtener resumen de cumplimiento semanal
CREATE OR REPLACE FUNCTION get_weekly_compliance_summary(p_company_id UUID)
RETURNS TABLE (
  total_pending INTEGER,
  total_completed INTEGER,
  total_overdue INTEGER,
  critical_alerts INTEGER,
  urgent_alerts INTEGER,
  resolved_this_week INTEGER,
  upcoming_7_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM erp_hr_obligation_deadlines 
     WHERE company_id = p_company_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_obligation_deadlines 
     WHERE company_id = p_company_id AND status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_obligation_deadlines 
     WHERE company_id = p_company_id AND status = 'overdue'),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts 
     WHERE company_id = p_company_id AND alert_level = 'critical' AND is_resolved = false),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts 
     WHERE company_id = p_company_id AND alert_level = 'urgent' AND is_resolved = false),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_sanction_alerts 
     WHERE company_id = p_company_id 
       AND is_resolved = true 
       AND resolved_at >= CURRENT_DATE - INTERVAL '7 days'),
    (SELECT COUNT(*)::INTEGER FROM erp_hr_obligation_deadlines 
     WHERE company_id = p_company_id 
       AND status IN ('pending', 'in_progress')
       AND deadline_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days');
END;
$$;