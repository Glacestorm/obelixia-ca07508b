import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ExecutiveKPIs {
  totalCases: number;
  casesByStatus: Record<string, number>;
  pendingProposals: number;
  activeWorkflows: number;
  contractsExpiring30: number;
  contractsExpiring90: number;
  totalEstimatedSavings: number;
  totalValidatedSavings: number;
  closedCases: number;
  closeRate: number;
  avgCloseTimeDays: number;
  conversionRate: number;
  companyBreakdown: { companyId: string; companyName: string; cases: number; savings: number; closed: number }[];
}

export function useEnergyExecutiveReport() {
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMultiCompanyKPIs = useCallback(async (companyIds: string[]) => {
    if (!companyIds.length) return;
    setLoading(true);
    try {
      const now = new Date();
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const in90 = new Date(); in90.setDate(in90.getDate() + 90);

      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, company_id, status, estimated_annual_savings, contract_end_date, created_at, updated_at')
        .in('company_id', companyIds);

      if (!cases) { setLoading(false); return; }

      const { data: companies } = await supabase
        .from('erp_companies')
        .select('id, name')
        .in('id', companyIds);

      const companyMap = new Map((companies || []).map(c => [c.id, c.name]));
      const caseIds = cases.map(c => c.id);

      const [proposalRes, workflowRes, trackingRes] = await Promise.all([
        caseIds.length > 0
          ? supabase.from('energy_proposals').select('case_id, status').in('case_id', caseIds).in('status', ['draft', 'issued', 'sent'])
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from('energy_workflow_states').select('case_id, status, changed_at').in('case_id', caseIds).order('changed_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from('energy_tracking').select('case_id, observed_real_savings').in('case_id', caseIds)
          : Promise.resolve({ data: [] }),
      ]);

      const statusCount: Record<string, number> = {};
      cases.forEach(c => { statusCount[c.status] = (statusCount[c.status] || 0) + 1; });

      const closedCases = cases.filter(c => c.status === 'completed');
      const acceptedProposals = cases.filter(c => ['proposal', 'implementation', 'completed'].includes(c.status));

      // Avg close time
      let totalCloseDays = 0;
      closedCases.forEach(c => {
        const days = Math.round((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
        totalCloseDays += days;
      });

      // Company breakdown
      const byCompany = new Map<string, { cases: number; savings: number; closed: number }>();
      cases.forEach(c => {
        const entry = byCompany.get(c.company_id) || { cases: 0, savings: 0, closed: 0 };
        entry.cases++;
        entry.savings += c.estimated_annual_savings || 0;
        if (c.status === 'completed') entry.closed++;
        byCompany.set(c.company_id, entry);
      });

      const latestWfByCase = new Map<string, string>();
      (workflowRes.data || []).forEach((w: any) => {
        if (!latestWfByCase.has(w.case_id)) latestWfByCase.set(w.case_id, w.status);
      });
      const activeWf = [...latestWfByCase.values()].filter(s => !['cerrado', 'cancelado'].includes(s)).length;

      const validatedSavings = (trackingRes.data || []).reduce((s: number, t: any) => s + ((t.observed_real_savings || 0) * 12), 0);

      const result: ExecutiveKPIs = {
        totalCases: cases.length,
        casesByStatus: statusCount,
        pendingProposals: (proposalRes.data || []).length,
        activeWorkflows: activeWf,
        contractsExpiring30: cases.filter(c => c.contract_end_date && new Date(c.contract_end_date) <= in30 && new Date(c.contract_end_date) > now).length,
        contractsExpiring90: cases.filter(c => c.contract_end_date && new Date(c.contract_end_date) <= in90 && new Date(c.contract_end_date) > now).length,
        totalEstimatedSavings: cases.reduce((s, c) => s + (c.estimated_annual_savings || 0), 0),
        totalValidatedSavings: validatedSavings,
        closedCases: closedCases.length,
        closeRate: cases.length > 0 ? Math.round((closedCases.length / cases.length) * 100) : 0,
        avgCloseTimeDays: closedCases.length > 0 ? Math.round(totalCloseDays / closedCases.length) : 0,
        conversionRate: cases.length > 0 ? Math.round((acceptedProposals.length / cases.length) * 100) : 0,
        companyBreakdown: [...byCompany.entries()].map(([companyId, d]) => ({
          companyId, companyName: companyMap.get(companyId) || companyId, ...d,
        })),
      };

      setKpis(result);
    } catch (err) {
      console.error('[useEnergyExecutiveReport] error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportPDF = useCallback((data: ExecutiveKPIs) => {
    const doc = new jsPDF();
    const today = format(new Date(), 'dd/MM/yyyy', { locale: es });

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('INFORME EJECUTIVO · CONSULTORÍA ELÉCTRICA', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado: ${today}`, 105, 27, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      head: [['KPI', 'Valor']],
      body: [
        ['Total expedientes', String(data.totalCases)],
        ['Expedientes cerrados', String(data.closedCases)],
        ['Tasa de cierre', `${data.closeRate}%`],
        ['Tasa de conversión', `${data.conversionRate}%`],
        ['Tiempo medio de cierre', `${data.avgCloseTimeDays} días`],
        ['Ahorro estimado total', `${data.totalEstimatedSavings.toLocaleString('es-ES')} €`],
        ['Ahorro validado total', `${data.totalValidatedSavings.toLocaleString('es-ES')} €`],
        ['Contratos < 30d', String(data.contractsExpiring30)],
        ['Contratos < 90d', String(data.contractsExpiring90)],
        ['Propuestas pendientes', String(data.pendingProposals)],
        ['Workflows activos', String(data.activeWorkflows)],
      ],
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    });

    if (data.companyBreakdown.length > 1) {
      const afterY = (doc as any).lastAutoTable?.finalY || 140;
      autoTable(doc, {
        startY: afterY + 10,
        head: [['Empresa', 'Expedientes', 'Cerrados', 'Ahorro estimado']],
        body: data.companyBreakdown.map(c => [
          c.companyName, String(c.cases), String(c.closed), `${c.savings.toLocaleString('es-ES')} €`,
        ]),
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`informe-ejecutivo-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }, []);

  const exportExcel = useCallback((data: ExecutiveKPIs) => {
    const wb = XLSX.utils.book_new();

    const kpiRows = [
      ['KPI', 'Valor'],
      ['Total expedientes', data.totalCases],
      ['Cerrados', data.closedCases],
      ['Tasa cierre %', data.closeRate],
      ['Conversión %', data.conversionRate],
      ['Tiempo medio cierre (días)', data.avgCloseTimeDays],
      ['Ahorro estimado €', data.totalEstimatedSavings],
      ['Ahorro validado €', data.totalValidatedSavings],
      ['Contratos <30d', data.contractsExpiring30],
      ['Contratos <90d', data.contractsExpiring90],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'KPIs');

    if (data.companyBreakdown.length > 0) {
      const compRows = [
        ['Empresa', 'Expedientes', 'Cerrados', 'Ahorro estimado'],
        ...data.companyBreakdown.map(c => [c.companyName, c.cases, c.closed, c.savings]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(compRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Por empresa');
    }

    XLSX.writeFile(wb, `informe-ejecutivo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, []);

  return { kpis, loading, fetchMultiCompanyKPIs, exportPDF, exportExcel };
}
