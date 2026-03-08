/**
 * useHRReportingEngine — Advanced Reporting Engine hook
 * Templates, generation, scheduling, history, PDF/Excel export
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// === TYPES ===
export interface ReportTemplate {
  id: string;
  company_id: string | null;
  template_key: string;
  template_name: string;
  description: string | null;
  category: string;
  target_role: string | null;
  target_module: string | null;
  sections: string[];
  kpi_definitions: string[];
  supported_formats: string[];
  is_active: boolean;
  version: number;
  created_at: string;
}

export interface GeneratedReport {
  id: string;
  company_id: string;
  template_id: string | null;
  report_name: string;
  report_type: string;
  format: string;
  status: string;
  generated_by: string;
  filters_applied: Record<string, unknown>;
  modules_included: string[];
  data_sources: Record<string, { source: string; count: number; timestamp: string }>;
  content_snapshot: Record<string, unknown> | null;
  generation_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReportSchedule {
  id: string;
  company_id: string;
  template_id: string;
  schedule_name: string;
  frequency: string;
  format: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  template?: { template_name: string; category: string };
}

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export function useHRReportingEngine(companyId?: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('hr-reporting-engine', {
      body: { action, company_id: companyId, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data.data;
  }, [companyId]);

  // === TEMPLATES ===
  const fetchTemplates = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await invoke('list_templates');
      setTemplates(data || []);
    } catch (e) {
      console.error('fetchTemplates error:', e);
    } finally { setLoading(false); }
  }, [invoke, companyId]);

  // === SEED TEMPLATES ===
  const seedTemplates = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      await invoke('seed_templates');
      toast.success('Plantillas de reporte creadas');
      await fetchTemplates();
    } catch (e) {
      console.error('seedTemplates error:', e);
      toast.error('Error creando plantillas');
    } finally { setLoading(false); }
  }, [invoke, companyId, fetchTemplates]);

  // === GENERATE REPORT ===
  const generateReport = useCallback(async (
    templateId: string,
    reportName: string,
    format: ExportFormat = 'pdf',
    filters: Record<string, unknown> = {},
    modules: string[] = []
  ) => {
    if (!companyId) return null;
    setGenerating(true);
    try {
      const data = await invoke('generate_report', {
        template_id: templateId,
        report_name: reportName,
        format,
        filters,
        modules,
      });
      toast.success(`Reporte "${reportName}" generado`);
      await fetchReports();
      return data;
    } catch (e) {
      console.error('generateReport error:', e);
      toast.error('Error generando reporte');
      return null;
    } finally { setGenerating(false); }
  }, [invoke, companyId]);

  // === LIST REPORTS ===
  const fetchReports = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await invoke('list_reports');
      setReports(data || []);
    } catch (e) {
      console.error('fetchReports error:', e);
    }
  }, [invoke, companyId]);

  // === GET REPORT DETAIL ===
  const fetchReportDetail = useCallback(async (reportId: string) => {
    try {
      const data = await invoke('get_report', { report_id: reportId });
      setSelectedReport(data as GeneratedReport);
      return data;
    } catch (e) {
      console.error('fetchReportDetail error:', e);
      return null;
    }
  }, [invoke]);

  // === SCHEDULES ===
  const fetchSchedules = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await invoke('list_schedules');
      setSchedules(data || []);
    } catch (e) {
      console.error('fetchSchedules error:', e);
    }
  }, [invoke, companyId]);

  const createSchedule = useCallback(async (params: Record<string, unknown>) => {
    try {
      await invoke('create_schedule', params);
      toast.success('Reporte programado creado');
      await fetchSchedules();
    } catch (e) {
      console.error('createSchedule error:', e);
      toast.error('Error creando programación');
    }
  }, [invoke, fetchSchedules]);

  const toggleSchedule = useCallback(async (scheduleId: string, isActive: boolean) => {
    try {
      await invoke('toggle_schedule', { schedule_id: scheduleId, is_active: isActive });
      toast.success(isActive ? 'Programación activada' : 'Programación pausada');
      await fetchSchedules();
    } catch (e) {
      console.error('toggleSchedule error:', e);
    }
  }, [invoke, fetchSchedules]);

  // === EXPORT TO PDF ===
  const exportToPDF = useCallback((report: GeneratedReport) => {
    const doc = new jsPDF();
    const content = report.content_snapshot || {};

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 100);
    doc.text(report.report_name, 14, 22);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date(report.created_at).toLocaleString('es-ES')} | Formato: PDF`, 14, 30);
    doc.text(`Módulos: ${report.modules_included.join(', ') || 'Todos'}`, 14, 35);

    // Data sources
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const dsEntries = Object.entries(report.data_sources || {});
    if (dsEntries.length > 0) {
      doc.text('Origen de datos:', 14, 44);
      autoTable(doc, {
        startY: 48,
        head: [['Módulo', 'Origen', 'Registros', 'Timestamp']],
        body: dsEntries.map(([mod, ds]) => [mod, ds.source, String(ds.count), new Date(ds.timestamp).toLocaleDateString('es-ES')]),
        theme: 'grid',
        headStyles: { fillColor: [75, 45, 130] },
        styles: { fontSize: 8 },
      });
    }

    // Executive summary
    const summary = (content as any)?.executive_summary;
    if (summary) {
      const currentY = (doc as any).lastAutoTable?.finalY || 70;
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 100);
      doc.text('Resumen Ejecutivo', 14, currentY + 10);
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(summary, 180);
      doc.text(lines, 14, currentY + 18);
    }

    // Data tables per module
    let yPos = (doc as any).lastAutoTable?.finalY || 120;

    if ((content as any)?.real_headcount?.employees?.length > 0) {
      const emps = (content as any).real_headcount.employees.slice(0, 20);
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 100);
      doc.text('Plantilla Real', 14, yPos + 10);
      autoTable(doc, {
        startY: yPos + 14,
        head: [['Departamento', 'Puesto', 'Salario Base', 'Estado']],
        body: emps.map((e: any) => [e.department || '—', e.job_title || '—', `€${Number(e.base_salary || 0).toLocaleString()}`, e.employment_status || '—']),
        theme: 'striped',
        headStyles: { fillColor: [45, 120, 80] },
        styles: { fontSize: 7 },
      });
    }

    doc.save(`${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exportado');
  }, []);

  // === EXPORT TO EXCEL ===
  const exportToExcel = useCallback((report: GeneratedReport) => {
    const content = report.content_snapshot || {};
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Reporte', report.report_name],
      ['Generado', new Date(report.created_at).toLocaleString('es-ES')],
      ['Módulos', (report.modules_included || []).join(', ')],
      ['Estado', report.status],
      ['Tiempo de generación', `${report.generation_time_ms || 0}ms`],
      [],
      ['Origen de Datos'],
      ['Módulo', 'Origen', 'Registros', 'Timestamp'],
      ...Object.entries(report.data_sources || {}).map(([mod, ds]) => [mod, ds.source, ds.count, ds.timestamp]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Real headcount sheet
    if ((content as any)?.real_headcount?.employees?.length > 0) {
      const empSheet = XLSX.utils.json_to_sheet((content as any).real_headcount.employees);
      XLSX.utils.book_append_sheet(wb, empSheet, 'Plantilla Real');
    }

    // Fairness sheet
    if ((content as any)?.fairness?.analyses?.length > 0) {
      const fairSheet = XLSX.utils.json_to_sheet((content as any).fairness.analyses.map((a: any) => ({
        Nombre: a.analysis_name,
        Tipo: a.analysis_type,
        'Equity Score': a.overall_equity_score,
        'Gap %': a.gap_percentage,
        Afectados: a.affected_employees,
        Estado: a.status,
      })));
      XLSX.utils.book_append_sheet(wb, fairSheet, 'Fairness');
    }

    // Legal contracts sheet
    if ((content as any)?.legal?.contracts?.length > 0) {
      const legalSheet = XLSX.utils.json_to_sheet((content as any).legal.contracts.map((c: any) => ({
        Número: c.contract_number,
        Tipo: c.contract_type,
        Empleado: c.employee_name,
        Estado: c.status,
        Compliance: c.compliance_score,
      })));
      XLSX.utils.book_append_sheet(wb, legalSheet, 'Contratos');
    }

    XLSX.writeFile(wb, `${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exportado');
  }, []);

  // === EXPORT TO CSV ===
  const exportToCSV = useCallback((report: GeneratedReport) => {
    const content = report.content_snapshot || {};
    const rows: string[][] = [['Módulo', 'Origen', 'Registros', 'Timestamp']];
    Object.entries(report.data_sources || {}).forEach(([mod, ds]) => {
      rows.push([mod, ds.source, String(ds.count), ds.timestamp]);
    });

    if ((content as any)?.real_headcount?.employees) {
      rows.push([], ['--- Plantilla Real ---'], ['Departamento', 'Puesto', 'Salario', 'Estado']);
      ((content as any).real_headcount.employees as any[]).forEach((e: any) => {
        rows.push([e.department || '', e.job_title || '', String(e.base_salary || 0), e.employment_status || '']);
      });
    }

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  }, []);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (companyId) {
      fetchTemplates();
      fetchReports();
      fetchSchedules();
    }
  }, [companyId, fetchTemplates, fetchReports, fetchSchedules]);

  return {
    templates, reports, schedules, selectedReport,
    loading, generating,
    fetchTemplates, seedTemplates,
    generateReport, fetchReports, fetchReportDetail,
    fetchSchedules, createSchedule, toggleSchedule,
    exportToPDF, exportToExcel, exportToCSV,
    setSelectedReport,
  };
}

export default useHRReportingEngine;
