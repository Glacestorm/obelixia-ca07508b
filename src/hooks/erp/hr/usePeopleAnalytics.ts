/**
 * People Analytics + IA — Hook Unificado
 * Queries agregadas sobre tablas HR existentes + IA via edge function
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TYPES ============

export type PADomain = 'hr' | 'payroll' | 'compliance' | 'wellbeing' | 'equity';
export type PARoleView = 'director' | 'hr_manager' | 'payroll' | 'compliance';

export interface PAFilters {
  period?: string; // YYYY-MM
  departmentId?: string;
  workCenterId?: string;
  legalEntityId?: string;
  countryCode?: string;
}

export interface PAKpi {
  label: string;
  value: number;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  severity?: 'success' | 'warning' | 'danger' | 'info';
}

export interface PAHROverview {
  headcount: number;
  activeEmployees: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  absenteeismRate: number;
  avgTenure: number;
  genderDistribution: { male: number; female: number; other: number };
  byDepartment: Array<{ department: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  headcountTrend: Array<{ month: string; count: number }>;
}

export interface PAPayrollAnalytics {
  totalGrossCost: number;
  totalEmployerCost: number;
  avgSalary: number;
  medianSalary: number;
  deviationVsPrevious: number;
  anomaliesCount: number;
  anomalies: Array<{
    employeeId: string;
    employeeName: string;
    concept: string;
    amount: number;
    expectedRange: [number, number];
    deviation: number;
  }>;
  costTrend: Array<{ month: string; gross: number; employer: number }>;
  byConcept: Array<{ concept: string; total: number; percentage: number }>;
}

export interface PAAbsenteeismAnalytics {
  rate: number;
  avgBradfordFactor: number;
  totalDaysLost: number;
  byType: Array<{ type: string; days: number; count: number }>;
  byDepartment: Array<{ department: string; rate: number; days: number }>;
  monthlyTrend: Array<{ month: string; rate: number; days: number }>;
  byWeekday: Array<{ day: string; count: number }>;
  highBradford: Array<{ employeeId: string; employeeName: string; factor: number; episodes: number }>;
}

export interface PAComplianceRisks {
  expiredDocuments: number;
  pendingConsents: number;
  rejectedSubmissions: number;
  slaBreach: number;
  overdueTasks: number;
  riskScore: number;
  items: Array<{
    type: 'document' | 'consent' | 'submission' | 'task' | 'contract';
    title: string;
    severity: 'high' | 'medium' | 'low';
    dueDate?: string;
    entityId?: string;
  }>;
  upcomingDeadlines: Array<{ title: string; dueDate: string; type: string }>;
}

export interface PAEquityMetrics {
  genderPayGap: number;
  genderPayGapByDept: Array<{ department: string; gap: number; maleAvg: number; femaleAvg: number }>;
  compaRatioDistribution: Array<{ range: string; count: number }>;
  outliers: Array<{
    employeeId: string;
    employeeName: string;
    salary: number;
    bandMin: number;
    bandMax: number;
    compaRatio: number;
    direction: 'below' | 'above';
  }>;
}

export interface PAAlert {
  id: string;
  domain: PADomain;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: string;
  entityId?: string;
  createdAt: string;
}

export interface PAInsight {
  id: string;
  domain: PADomain;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion?: string;
  taskCategory?: string;
  confidence: number;
}

export interface PACopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============ HOOK ============

export function usePeopleAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [hrOverview, setHrOverview] = useState<PAHROverview | null>(null);
  const [payrollAnalytics, setPayrollAnalytics] = useState<PAPayrollAnalytics | null>(null);
  const [absenteeism, setAbsenteeism] = useState<PAAbsenteeismAnalytics | null>(null);
  const [complianceRisks, setComplianceRisks] = useState<PAComplianceRisks | null>(null);
  const [equityMetrics, setEquityMetrics] = useState<PAEquityMetrics | null>(null);
  const [alerts, setAlerts] = useState<PAAlert[]>([]);
  const [aiInsights, setAiInsights] = useState<PAInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // ---- HR Overview ----
  const fetchHROverview = useCallback(async (companyId: string, filters?: PAFilters) => {
    try {
      let query = supabase.from('erp_hr_employees').select('id, status, gender, hire_date, termination_date, department_id, base_salary').eq('company_id', companyId);
      if (filters?.legalEntityId) query = query.eq('legal_entity_id', filters.legalEntityId);
      if (filters?.countryCode) query = query.eq('country_code', filters.countryCode);

      const { data: employees, error: empErr } = await query;
      if (empErr) throw empErr;

      const all = employees || [];
      const active = all.filter(e => e.status === 'active');
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const newHires = all.filter(e => e.hire_date && new Date(e.hire_date) > yearAgo);
      const terms = all.filter(e => e.termination_date && new Date(e.termination_date) > yearAgo);

      const genderDist = { male: 0, female: 0, other: 0 };
      active.forEach(e => {
        if (e.gender === 'male' || e.gender === 'M') genderDist.male++;
        else if (e.gender === 'female' || e.gender === 'F') genderDist.female++;
        else genderDist.other++;
      });

      // By department — get dept names
      const deptMap: Record<string, number> = {};
      active.forEach(e => {
        const key = e.department_id || 'Sin departamento';
        deptMap[key] = (deptMap[key] || 0) + 1;
      });

      const statusMap: Record<string, number> = {};
      all.forEach(e => {
        const s = e.status || 'unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });

      const avgTenure = active.length > 0
        ? active.reduce((acc, e) => {
            const years = (now.getTime() - new Date(e.hire_date).getTime()) / (365.25 * 86400000);
            return acc + years;
          }, 0) / active.length
        : 0;

      const turnoverRate = active.length > 0 ? (terms.length / active.length) * 100 : 0;

      const overview: PAHROverview = {
        headcount: all.length,
        activeEmployees: active.length,
        newHires: newHires.length,
        terminations: terms.length,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        absenteeismRate: 0,
        avgTenure: Math.round(avgTenure * 10) / 10,
        genderDistribution: genderDist,
        byDepartment: Object.entries(deptMap).map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count),
        byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        headcountTrend: [],
      };

      setHrOverview(overview);
      return overview;
    } catch (err) {
      console.error('[usePeopleAnalytics] fetchHROverview:', err);
      return null;
    }
  }, []);

  // ---- Payroll Analytics ----
  const fetchPayrollAnalytics = useCallback(async (companyId: string, filters?: PAFilters) => {
    try {
      const { data: records, error: recErr } = await supabase
        .from('erp_hr_payroll_records')
        .select('id, employee_id, period_id, status, gross_salary, net_salary, total_deductions, employer_cost')
        .eq('company_id', companyId)
        .limit(500);
      if (recErr) throw recErr;

      const all = records || [];
      const totalGross = all.reduce((s, r) => s + (r.gross_salary || 0), 0);
      const totalEmployer = all.reduce((s, r) => s + (r.employer_cost || 0), 0);
      const salaries = all.map(r => r.gross_salary || 0).filter(s => s > 0);
      const avgSalary = salaries.length > 0 ? totalGross / salaries.length : 0;
      const sorted = [...salaries].sort((a, b) => a - b);
      const medianSalary = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

      const analytics: PAPayrollAnalytics = {
        totalGrossCost: totalGross,
        totalEmployerCost: totalEmployer,
        avgSalary: Math.round(avgSalary),
        medianSalary: Math.round(medianSalary),
        deviationVsPrevious: 0,
        anomaliesCount: 0,
        anomalies: [],
        costTrend: [],
        byConcept: [],
      };

      setPayrollAnalytics(analytics);
      return analytics;
    } catch (err) {
      console.error('[usePeopleAnalytics] fetchPayrollAnalytics:', err);
      return null;
    }
  }, []);

  // ---- Absenteeism ----
  const fetchAbsenteeismAnalytics = useCallback(async (companyId: string, _filters?: PAFilters) => {
    try {
      const { data: absences, error: absErr } = await supabase
        .from('erp_hr_absences')
        .select('id, employee_id, absence_type, start_date, end_date, calendar_days, business_days, status')
        .eq('company_id', companyId)
        .limit(500);
      if (absErr) throw absErr;

      const all = absences || [];
      const totalDays = all.reduce((s, a) => s + (a.calendar_days || a.business_days || 0), 0);

      const typeMap: Record<string, { days: number; count: number }> = {};
      all.forEach(a => {
        const t = a.absence_type || 'other';
        if (!typeMap[t]) typeMap[t] = { days: 0, count: 0 };
        typeMap[t].days += (a.calendar_days || a.business_days || 0);
        typeMap[t].count += 1;
      });

      // Bradford factor per employee: S² × D
      const empAbsences: Record<string, { episodes: number; days: number }> = {};
      all.forEach(a => {
        const eid = a.employee_id;
        if (!empAbsences[eid]) empAbsences[eid] = { episodes: 0, days: 0 };
        empAbsences[eid].episodes += 1;
        empAbsences[eid].days += (a.calendar_days || a.business_days || 0);
      });

      const highBradford = Object.entries(empAbsences)
        .map(([employeeId, { episodes, days }]) => ({
          employeeId,
          employeeName: employeeId.slice(0, 8),
          factor: episodes * episodes * days,
          episodes,
        }))
        .filter(e => e.factor > 100)
        .sort((a, b) => b.factor - a.factor)
        .slice(0, 10);

      const avgBradford = Object.values(empAbsences).length > 0
        ? Object.values(empAbsences).reduce((s, { episodes, days }) => s + episodes * episodes * days, 0) / Object.values(empAbsences).length
        : 0;

      const analytics: PAAbsenteeismAnalytics = {
        rate: 0,
        avgBradfordFactor: Math.round(avgBradford),
        totalDaysLost: totalDays,
        byType: Object.entries(typeMap).map(([type, v]) => ({ type, ...v })),
        byDepartment: [],
        monthlyTrend: [],
        byWeekday: [],
        highBradford,
      };

      setAbsenteeism(analytics);
      return analytics;
    } catch (err) {
      console.error('[usePeopleAnalytics] fetchAbsenteeismAnalytics:', err);
      return null;
    }
  }, []);

  // ---- Compliance Risks ----
  const fetchComplianceRisks = useCallback(async (companyId: string, _filters?: PAFilters) => {
    try {
      const [docsRes, tasksRes] = await Promise.all([
        supabase.from('erp_hr_employee_documents').select('id, status, expiry_date').eq('company_id', companyId).limit(200),
        supabase.from('hr_tasks').select('id, title, status, sla_breached, due_date, category').eq('company_id', companyId).in('status', ['pending', 'in_progress']).limit(200),
      ]);

      const docs = docsRes.data || [];
      const tasks = tasksRes.data || [];
      const now = new Date().toISOString();
      const expiredDocs = docs.filter(d => d.expiry_date && d.expiry_date < now);
      const slaBreach = tasks.filter(t => t.sla_breached === true);
      const overdue = tasks.filter(t => t.due_date && t.due_date < now && t.status !== 'completed');

      const items: PAComplianceRisks['items'] = [
        ...expiredDocs.slice(0, 5).map(d => ({
          type: 'document' as const,
          title: `Documento expirado: ${d.id.slice(0, 8)}`,
          severity: 'high' as const,
          entityId: d.id,
        })),
        ...slaBreach.slice(0, 5).map(t => ({
          type: 'task' as const,
          title: `SLA incumplido: ${t.title || t.id.slice(0, 8)}`,
          severity: 'high' as const,
          entityId: t.id,
        })),
      ];

      const risks: PAComplianceRisks = {
        expiredDocuments: expiredDocs.length,
        pendingConsents: 0,
        rejectedSubmissions: 0,
        slaBreach: slaBreach.length,
        overdueTasks: overdue.length,
        riskScore: Math.min(100, expiredDocs.length * 10 + slaBreach.length * 15 + overdue.length * 5),
        items,
        upcomingDeadlines: [],
      };

      setComplianceRisks(risks);
      return risks;
    } catch (err) {
      console.error('[usePeopleAnalytics] fetchComplianceRisks:', err);
      return null;
    }
  }, []);

  // ---- Equity Metrics ----
  const fetchEquityMetrics = useCallback(async (companyId: string, _filters?: PAFilters) => {
    try {
      const { data: employees, error: empErr } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, gender, base_salary, department_id, job_title')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('base_salary', 'is', null);
      if (empErr) throw empErr;

      const all = employees || [];
      const males = all.filter(e => e.gender === 'male' || e.gender === 'M');
      const females = all.filter(e => e.gender === 'female' || e.gender === 'F');
      const maleAvg = males.length > 0 ? males.reduce((s, e) => s + (e.base_salary || 0), 0) / males.length : 0;
      const femaleAvg = females.length > 0 ? females.reduce((s, e) => s + (e.base_salary || 0), 0) / females.length : 0;
      const gap = maleAvg > 0 ? ((maleAvg - femaleAvg) / maleAvg) * 100 : 0;

      const metrics: PAEquityMetrics = {
        genderPayGap: Math.round(gap * 10) / 10,
        genderPayGapByDept: [],
        compaRatioDistribution: [],
        outliers: [],
      };

      setEquityMetrics(metrics);
      return metrics;
    } catch (err) {
      console.error('[usePeopleAnalytics] fetchEquityMetrics:', err);
      return null;
    }
  }, []);

  // ---- Fetch All ----
  const fetchAll = useCallback(async (companyId: string, filters?: PAFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchHROverview(companyId, filters),
        fetchPayrollAnalytics(companyId, filters),
        fetchAbsenteeismAnalytics(companyId, filters),
        fetchComplianceRisks(companyId, filters),
        fetchEquityMetrics(companyId, filters),
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando analytics';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchHROverview, fetchPayrollAnalytics, fetchAbsenteeismAnalytics, fetchComplianceRisks, fetchEquityMetrics]);

  // ---- AI: Insights ----
  const getAIInsights = useCallback(async (companyId: string, domain: PADomain, context?: Record<string, unknown>) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('erp-hr-people-analytics-ai', {
        body: { action: 'insights', companyId, domain, context }
      });
      if (fnErr) throw fnErr;
      if (data?.success && data?.data?.insights) {
        setAiInsights(data.data.insights);
        return data.data.insights as PAInsight[];
      }
      return [];
    } catch (err) {
      console.error('[usePeopleAnalytics] getAIInsights:', err);
      return [];
    }
  }, []);

  // ---- AI: Explain Anomaly ----
  const explainAnomaly = useCallback(async (anomalyData: Record<string, unknown>) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('erp-hr-people-analytics-ai', {
        body: { action: 'explain', anomalyData }
      });
      if (fnErr) throw fnErr;
      return data?.data?.explanation as string || 'Sin explicación disponible';
    } catch (err) {
      console.error('[usePeopleAnalytics] explainAnomaly:', err);
      return 'Error al obtener explicación';
    }
  }, []);

  // ---- AI: Suggestions ----
  const getActionableSuggestions = useCallback(async (companyId: string, metricsContext: Record<string, unknown>) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('erp-hr-people-analytics-ai', {
        body: { action: 'suggest', companyId, context: metricsContext }
      });
      if (fnErr) throw fnErr;
      return data?.data?.suggestions || [];
    } catch (err) {
      console.error('[usePeopleAnalytics] getActionableSuggestions:', err);
      return [];
    }
  }, []);

  // ---- Build Alerts from Data ----
  const buildAlerts = useCallback(() => {
    const newAlerts: PAAlert[] = [];
    const now = new Date().toISOString();

    if (complianceRisks) {
      if (complianceRisks.expiredDocuments > 0) {
        newAlerts.push({
          id: 'alert-expired-docs',
          domain: 'compliance',
          severity: 'critical',
          title: `${complianceRisks.expiredDocuments} documentos expirados`,
          description: 'Existen documentos de empleado que han superado su fecha de vigencia.',
          actionLabel: 'Ver documentos',
          actionType: 'navigate',
          createdAt: now,
        });
      }
      if (complianceRisks.slaBreach > 0) {
        newAlerts.push({
          id: 'alert-sla-breach',
          domain: 'compliance',
          severity: 'high',
          title: `${complianceRisks.slaBreach} tareas con SLA incumplido`,
          description: 'Existen tareas que han superado el plazo de resolución comprometido.',
          actionLabel: 'Ver tareas',
          actionType: 'navigate',
          createdAt: now,
        });
      }
    }

    if (hrOverview) {
      if (hrOverview.turnoverRate > 15) {
        newAlerts.push({
          id: 'alert-high-turnover',
          domain: 'hr',
          severity: 'high',
          title: `Rotación elevada: ${hrOverview.turnoverRate}%`,
          description: 'La tasa de rotación supera el umbral recomendado del 15%.',
          createdAt: now,
        });
      }
    }

    if (absenteeism && absenteeism.highBradford.length > 0) {
      newAlerts.push({
        id: 'alert-bradford',
        domain: 'hr',
        severity: 'medium',
        title: `${absenteeism.highBradford.length} empleados con Bradford Factor alto`,
        description: 'Empleados con patrones de absentismo repetitivo que requieren seguimiento.',
        createdAt: now,
      });
    }

    if (equityMetrics && Math.abs(equityMetrics.genderPayGap) > 10) {
      newAlerts.push({
        id: 'alert-pay-gap',
        domain: 'equity',
        severity: 'high',
        title: `Brecha salarial de género: ${equityMetrics.genderPayGap}%`,
        description: 'La brecha salarial supera el umbral recomendado del 10%.',
        createdAt: now,
      });
    }

    setAlerts(newAlerts.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return sev[a.severity] - sev[b.severity];
    }));
  }, [complianceRisks, hrOverview, absenteeism, equityMetrics]);

  // Build alerts when data changes
  useEffect(() => {
    if (hrOverview || complianceRisks || absenteeism || equityMetrics) {
      buildAlerts();
    }
  }, [hrOverview, complianceRisks, absenteeism, equityMetrics, buildAlerts]);

  // ---- Auto-refresh ----
  const startAutoRefresh = useCallback((companyId: string, filters?: PAFilters, intervalMs = 120000) => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    fetchAll(companyId, filters);
    autoRefreshRef.current = setInterval(() => fetchAll(companyId, filters), intervalMs);
  }, [fetchAll]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return {
    // State
    isLoading, error, lastRefresh,
    hrOverview, payrollAnalytics, absenteeism, complianceRisks, equityMetrics,
    alerts, aiInsights,
    // Data fetchers
    fetchAll, fetchHROverview, fetchPayrollAnalytics, fetchAbsenteeismAnalytics, fetchComplianceRisks, fetchEquityMetrics,
    // AI
    getAIInsights, explainAnomaly, getActionableSuggestions,
    // Auto
    startAutoRefresh, stopAutoRefresh,
  };
}

export default usePeopleAnalytics;
