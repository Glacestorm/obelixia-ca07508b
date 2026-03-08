/**
 * useHRRegulatoryReporting — Compliance Regulatory Reporting hook
 * Extends the base Reporting Engine with regulatory-specific logic
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ExportFormat } from './useHRReportingEngine';

export interface RegulatoryTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  category: string;
  target_module: string | null;
  sections: string[];
  kpi_definitions: string[];
  supported_formats: string[];
  is_regulatory: boolean;
  regulatory_framework: string | null;
  legal_basis: string[];
  version: number;
}

export interface RegulatoryReport {
  id: string;
  report_name: string;
  report_type: string;
  format: string;
  status: string;
  review_status: string;
  regulatory_framework: string | null;
  disclaimer: string | null;
  generated_by: string;
  modules_included: string[];
  data_sources: Record<string, { source: string; count: number; timestamp: string }>;
  content_snapshot?: Record<string, unknown>;
  generation_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
}

export interface ReviewEntry {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  comments: string | null;
  reviewer_id: string;
  created_at: string;
}

export type ReviewStatus = 'draft' | 'generated' | 'reviewed' | 'approved' | 'rejected' | 'archived';

export function useHRRegulatoryReporting(companyId?: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<RegulatoryTemplate[]>([]);
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<RegulatoryReport | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('hr-regulatory-reporting', {
      body: { action, company_id: companyId, params },
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
      const data = await invoke('list_regulatory_templates');
      setTemplates(data || []);
    } catch (e) {
      console.error('fetchRegulatoryTemplates error:', e);
    } finally { setLoading(false); }
  }, [invoke, companyId]);

  const seedTemplates = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      await invoke('seed_regulatory_templates');
      toast.success('Plantillas regulatorias creadas');
      await fetchTemplates();
    } catch (e) {
      console.error('seedRegulatoryTemplates error:', e);
      toast.error('Error creando plantillas regulatorias');
    } finally { setLoading(false); }
  }, [invoke, companyId, fetchTemplates]);

  // === GENERATE ===
  const generateReport = useCallback(async (
    templateId: string,
    reportName: string,
    format: ExportFormat = 'pdf',
    filters: Record<string, unknown> = {},
    period?: string,
  ) => {
    if (!companyId) return null;
    setGenerating(true);
    try {
      const data = await invoke('generate_regulatory_report', {
        template_id: templateId,
        report_name: reportName,
        format,
        filters,
        period,
      });
      toast.success(`Informe regulatorio "${reportName}" generado`);
      await fetchReports();
      return data;
    } catch (e) {
      console.error('generateRegulatoryReport error:', e);
      toast.error('Error generando informe regulatorio');
      return null;
    } finally { setGenerating(false); }
  }, [invoke, companyId]);

  // === LIST REPORTS ===
  const fetchReports = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await invoke('list_regulatory_reports');
      setReports(data || []);
    } catch (e) {
      console.error('fetchRegulatoryReports error:', e);
    }
  }, [invoke, companyId]);

  // === REPORT DETAIL ===
  const fetchReportDetail = useCallback(async (reportId: string) => {
    try {
      // Use existing reporting engine for detail since it's the same table
      const { data, error } = await supabase.functions.invoke('hr-reporting-engine', {
        body: { action: 'get_report', company_id: companyId, params: { report_id: reportId } },
      });
      if (error) throw error;
      if (data?.success) {
        setSelectedReport(data.data as RegulatoryReport);
        return data.data;
      }
      return null;
    } catch (e) {
      console.error('fetchReportDetail error:', e);
      return null;
    }
  }, [companyId]);

  // === REVIEW STATUS ===
  const updateReviewStatus = useCallback(async (reportId: string, newStatus: ReviewStatus, comments?: string) => {
    try {
      await invoke('update_review_status', { report_id: reportId, new_status: newStatus, comments });
      const statusLabels: Record<string, string> = {
        reviewed: 'Informe marcado como revisado',
        approved: 'Informe aprobado',
        rejected: 'Informe rechazado',
        archived: 'Informe archivado',
      };
      toast.success(statusLabels[newStatus] || 'Estado actualizado');
      await fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, review_status: newStatus } : null);
      }
    } catch (e) {
      console.error('updateReviewStatus error:', e);
      toast.error('Error actualizando estado');
    }
  }, [invoke, fetchReports, selectedReport]);

  // === REVIEW HISTORY ===
  const fetchReviewHistory = useCallback(async (reportId: string) => {
    try {
      const data = await invoke('get_review_history', { report_id: reportId });
      setReviewHistory(data || []);
      return data;
    } catch (e) {
      console.error('fetchReviewHistory error:', e);
      return [];
    }
  }, [invoke]);

  // === EXPORT PDF ===
  const exportToPDF = useCallback((report: RegulatoryReport) => {
    const doc = new jsPDF();
    const content = report.content_snapshot || {};
    const aiContent = (content as any)?.ai_content || {};

    // Title block
    doc.setFontSize(20);
    doc.setTextColor(25, 25, 80);
    doc.text(report.report_name, 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${new Date(report.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);
    doc.text(`Estado: ${report.review_status?.toUpperCase() || 'BORRADOR'} | Marco: ${report.regulatory_framework || '—'}`, 14, 35);

    // Legal basis
    const legalBasis = (content as any)?.legal_basis;
    if (legalBasis?.length > 0) {
      doc.text(`Base legal: ${legalBasis.join(', ')}`, 14, 40);
    }

    // Disclaimer
    if (report.disclaimer) {
      doc.setFontSize(8);
      doc.setTextColor(180, 60, 60);
      const disclaimerLines = doc.splitTextToSize(`⚠ ${report.disclaimer}`, 180);
      doc.text(disclaimerLines, 14, 47);
    }

    // Data sources table
    let yPos = report.disclaimer ? 60 : 48;
    const dsEntries = Object.entries(report.data_sources || {});
    if (dsEntries.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(25, 25, 80);
      doc.text('Origen de Datos', 14, yPos);
      autoTable(doc, {
        startY: yPos + 4,
        head: [['Módulo', 'Origen', 'Registros', 'Fecha']],
        body: dsEntries.map(([mod, ds]) => [
          mod.replace(/_/g, ' '),
          ds.source.toUpperCase(),
          String(ds.count),
          new Date(ds.timestamp).toLocaleDateString('es-ES'),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 100] },
        styles: { fontSize: 8 },
      });
    }

    // Executive summary
    const summary = aiContent?.executive_summary;
    if (summary) {
      const currentY = (doc as any).lastAutoTable?.finalY || yPos + 30;
      if (currentY > 240) { doc.addPage(); }
      const sy = currentY > 240 ? 20 : currentY + 10;
      doc.setFontSize(13);
      doc.setTextColor(25, 25, 80);
      doc.text('Resumen Ejecutivo', 14, sy);
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const sLines = doc.splitTextToSize(summary, 180);
      doc.text(sLines, 14, sy + 8);
    }

    // AI Sections
    const sections = aiContent?.sections;
    if (Array.isArray(sections)) {
      let secY = (doc as any).lastAutoTable?.finalY || 180;
      for (const section of sections) {
        if (secY > 250) { doc.addPage(); secY = 20; }
        doc.setFontSize(11);
        doc.setTextColor(25, 25, 80);
        doc.text(section.title || '', 14, secY + 8);

        const srcBadge = section.data_source ? ` [${section.data_source.toUpperCase()}]` : '';
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(srcBadge, 14 + doc.getTextWidth(section.title || '') + 2, secY + 8);

        if (section.content) {
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          const cLines = doc.splitTextToSize(section.content, 180);
          doc.text(cLines, 14, secY + 14);
          secY += 14 + cLines.length * 4;
        }

        if (section.metrics?.length > 0) {
          autoTable(doc, {
            startY: secY + 2,
            head: [['Métrica', 'Valor']],
            body: section.metrics.map((m: any) => [m.label, m.value]),
            theme: 'plain',
            styles: { fontSize: 8 },
          });
          secY = (doc as any).lastAutoTable?.finalY || secY + 20;
        }
      }
    }

    // Findings
    const findings = aiContent?.findings;
    if (Array.isArray(findings) && findings.length > 0) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setTextColor(25, 25, 80);
      doc.text('Hallazgos y Recomendaciones', 14, 20);
      autoTable(doc, {
        startY: 26,
        head: [['Severidad', 'Descripción', 'Recomendación']],
        body: findings.map((f: any) => [f.severity?.toUpperCase(), f.description, f.recommendation]),
        theme: 'striped',
        headStyles: { fillColor: [120, 40, 40] },
        styles: { fontSize: 7, cellWidth: 'wrap' },
        columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 80 }, 2: { cellWidth: 80 } },
      });
    }

    doc.save(`${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF regulatorio exportado');
  }, []);

  // === EXPORT EXCEL ===
  const exportToExcel = useCallback((report: RegulatoryReport) => {
    const content = report.content_snapshot || {};
    const aiContent = (content as any)?.ai_content || {};
    const wb = XLSX.utils.book_new();

    // Summary
    const summaryRows = [
      ['Informe Regulatorio', report.report_name],
      ['Marco', report.regulatory_framework || '—'],
      ['Estado', report.review_status || 'draft'],
      ['Fecha', new Date(report.created_at).toLocaleString('es-ES')],
      ['Base Legal', ((content as any)?.legal_basis || []).join(', ')],
      [],
      ['Origen de Datos'],
      ['Módulo', 'Origen', 'Registros', 'Timestamp'],
      ...Object.entries(report.data_sources || {}).map(([m, d]) => [m, d.source, d.count, d.timestamp]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Resumen');

    // Sections
    if (Array.isArray(aiContent?.sections)) {
      const secRows = [['Sección', 'Contenido', 'Origen Dato']];
      for (const s of aiContent.sections) {
        secRows.push([s.title, s.content, s.data_source || '—']);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(secRows), 'Secciones');
    }

    // Findings
    if (Array.isArray(aiContent?.findings)) {
      const fRows = [['Severidad', 'Descripción', 'Recomendación']];
      for (const f of aiContent.findings) fRows.push([f.severity, f.description, f.recommendation]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fRows), 'Hallazgos');
    }

    // Employee data if present
    if ((content as any)?.employees?.data?.length > 0) {
      const empSheet = XLSX.utils.json_to_sheet((content as any).employees.data.map((e: any) => ({
        Nombre: `${e.first_name} ${e.last_name}`,
        Departamento: e.department,
        Puesto: e.job_title,
        'Salario Base': e.base_salary,
        Género: e.gender,
        Categoría: e.employee_category,
      })));
      XLSX.utils.book_append_sheet(wb, empSheet, 'Plantilla');
    }

    XLSX.writeFile(wb, `${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel regulatorio exportado');
  }, []);

  // === EXPORT CSV ===
  const exportToCSV = useCallback((report: RegulatoryReport) => {
    const aiContent = (report.content_snapshot as any)?.ai_content || {};
    const rows: string[][] = [
      ['Informe', report.report_name],
      ['Marco', report.regulatory_framework || ''],
      ['Estado', report.review_status || 'draft'],
      [],
      ['Módulo', 'Origen', 'Registros'],
      ...Object.entries(report.data_sources || {}).map(([m, d]) => [m, d.source, String(d.count)]),
    ];

    if (Array.isArray(aiContent?.findings)) {
      rows.push([], ['--- Hallazgos ---'], ['Severidad', 'Descripción', 'Recomendación']);
      for (const f of aiContent.findings) rows.push([f.severity, f.description, f.recommendation]);
    }

    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV regulatorio exportado');
  }, []);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (companyId) {
      fetchTemplates();
      fetchReports();
    }
  }, [companyId, fetchTemplates, fetchReports]);

  return {
    templates, reports, selectedReport, reviewHistory,
    loading, generating,
    fetchTemplates, seedTemplates,
    generateReport, fetchReports, fetchReportDetail,
    updateReviewStatus, fetchReviewHistory,
    exportToPDF, exportToExcel, exportToCSV,
    setSelectedReport,
  };
}

export default useHRRegulatoryReporting;
