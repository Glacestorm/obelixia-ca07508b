/**
 * useEmployeePortal — Hook principal del Portal del Empleado
 * V2-ES.9: Obtiene datos del empleado autenticado via user_id mapping
 * V2-ES.9.2: Añade datos de dashboard (nóminas, solicitudes, documentos)
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department_id: string | null;
  company_id: string;
  employee_code: string | null;
  employee_number: string | null;
  hire_date: string;
  status: string | null;
  category: string | null;
  contract_type: string | null;
  national_id: string | null;
  base_salary: number | null;
}

export interface RecentPayslip {
  id: string;
  period_label: string;
  gross_salary: number;
  net_salary: number;
  status: string;
  created_at: string;
}

export interface EmployeeRequest {
  id: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  subject?: string;
}

export interface DashboardSummary {
  pendingRequests: number;
  activeIncidents: number;
  documentsWithAlerts: number;
  totalDocuments: number;
  recentPayslips: RecentPayslip[];
  activeRequests: EmployeeRequest[];
  lastActivity: Array<{ label: string; date: string; type: string }>;
}

export interface EmployeePortalState {
  employee: EmployeeProfile | null;
  isLoading: boolean;
  error: string | null;
  isLinked: boolean;
  dashboard: DashboardSummary | null;
  isDashboardLoading: boolean;
}

export function useEmployeePortal() {
  const { user } = useAuth();
  const [state, setState] = useState<EmployeePortalState>({
    employee: null,
    isLoading: true,
    error: null,
    isLinked: false,
    dashboard: null,
    isDashboardLoading: false,
  });

  const fetchEmployee = useCallback(async () => {
    if (!user?.id) {
      setState({ employee: null, isLoading: false, error: null, isLinked: false, dashboard: null, isDashboardLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, email, phone, job_title, department_id, company_id, employee_code, employee_number, hire_date, status, category, contract_type, national_id, base_salary')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        employee: data as EmployeeProfile | null,
        isLoading: false,
        error: null,
        isLinked: !!data,
      }));

      // Auto-fetch dashboard if employee found
      if (data) {
        fetchDashboard((data as EmployeeProfile).id, (data as EmployeeProfile).company_id);
      }
    } catch (err) {
      console.error('[useEmployeePortal] Error:', err);
      setState(prev => ({
        ...prev,
        employee: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
        isLinked: false,
      }));
    }
  }, [user?.id]);

  const fetchDashboard = useCallback(async (employeeId: string, companyId: string) => {
    setState(prev => ({ ...prev, isDashboardLoading: true }));

    try {
      // Parallel fetches: payslips, requests, documents
      const [payslipsRes, requestsRes, docsRes] = await Promise.all([
        supabase
          .from('hr_payroll_records')
          .select('id, gross_salary, net_salary, status, created_at, payroll_period_id')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('hr_admin_requests')
          .select('id, request_type, status, priority, created_at')
          .eq('employee_id', employeeId)
          .in('status', ['submitted', 'in_progress', 'pending_info', 'approved'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('erp_hr_employee_documents')
          .select('id, document_type, document_status, expiry_date, document_name')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false }),
      ]);

      // Process payslips
      const recentPayslips: RecentPayslip[] = (payslipsRes.data || []).map((r: any) => ({
        id: r.id,
        period_label: r.payroll_period_id || 'N/A',
        gross_salary: Number(r.gross_salary || 0),
        net_salary: Number(r.net_salary || 0),
        status: r.status || 'draft',
        created_at: r.created_at,
      }));

      // Process requests
      const activeRequests: EmployeeRequest[] = (requestsRes.data || []).map((r: any) => ({
        id: r.id,
        request_type: r.request_type,
        status: r.status,
        priority: r.priority || 'normal',
        created_at: r.created_at,
      }));

      // Process documents — count alerts
      const docs = docsRes.data || [];
      const now = new Date();
      let alertCount = 0;
      for (const d of docs as any[]) {
        if (d.document_status === 'rejected' || d.document_status === 'expired') alertCount++;
        else if (d.expiry_date) {
          const diff = new Date(d.expiry_date).getTime() - now.getTime();
          if (diff < 0) alertCount++;
          else if (diff < 30 * 24 * 60 * 60 * 1000) alertCount++;
        }
      }

      // Build last activity from combined data
      const lastActivity: Array<{ label: string; date: string; type: string }> = [];
      for (const p of recentPayslips.slice(0, 2)) {
        lastActivity.push({ label: 'Nómina generada', date: p.created_at, type: 'payslip' });
      }
      for (const r of activeRequests.slice(0, 3)) {
        lastActivity.push({ label: `Solicitud: ${r.request_type}`, date: r.created_at, type: 'request' });
      }
      lastActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setState(prev => ({
        ...prev,
        isDashboardLoading: false,
        dashboard: {
          pendingRequests: activeRequests.length,
          activeIncidents: activeRequests.filter(r => r.priority === 'urgent' || r.priority === 'high').length,
          documentsWithAlerts: alertCount,
          totalDocuments: docs.length,
          recentPayslips,
          activeRequests,
          lastActivity: lastActivity.slice(0, 5),
        },
      }));
    } catch (err) {
      console.error('[useEmployeePortal] dashboard error:', err);
      setState(prev => ({ ...prev, isDashboardLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  return {
    ...state,
    refresh: fetchEmployee,
  };
}
