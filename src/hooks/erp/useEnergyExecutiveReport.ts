/**
 * useEnergyExecutiveReport - Multi-company executive KPIs with energy 360 support
 */
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
  totalGasSavings: number;
  totalSolarSavings: number;
  totalValidatedGas: number;
  totalValidatedSolar: number;
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
        .select('id, company_id, status, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings, contract_end_date, created_at, updated_at')
        .in('company_id', companyIds);

      if (!cases) { setLoading(false); return; }

      const { data: companies } = await supabase.from('erp_companies').select('id, name').in('id', companyIds);
      const companyMap = new Map((companies || []).map(c => [c.id, c.name]));
      const caseIds = cases.map(c => c.id);

      const [proposalRes, workflowRes, trackingRes] = await Promise.all([
        caseIds.length > 0 ? supabase.from('energy_proposals').select('case_id, status').in('case_id', caseIds).in('status', ['draft', 'issued', 'sent']) : Promise.resolve({ data: [] }),
        caseIds.length > 0 ? supabase.from('energy_workflow_states').select('case_id, status, changed_at').in('case_id', caseIds).order('changed_at', { ascending: false }) : Promise.resolve({ data: [] }),
        caseIds.length > 0 ? supabase.from('energy_tracking').select('case_id, observed_real_savings').in('case_id', caseIds) : Promise.resolve({ data: [] }),
      ]);

      const statusCount: Record<string, number> = {};
      cases.forEach(c => { statusCount[c.status] = (statusCount[c.status] || 0) + 1; });

      const closedCases = cases.filter(c => c.status === 'completed');
      const acceptedProposals = cases.filter(c => ['proposal', 'implementation', 'completed'].includes(c.status));

      let totalCloseDays = 0;
      closedCases.forEach(c => {
        totalCloseDays += Math.round((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
      });

      const byCompany = new Map<string, { cases: number; savings: number; closed: number }>();
      cases.forEach(c => {
        const entry = byCompany.get(c.company_id) || { cases: 0, savings: 0, closed: 0 };
        entry.cases++;
        entry.savings += (c.estimated_annual_savings || 0) + (c.estimated_gas_savings || 0) + (c.estimated_solar_savings || 0);
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
        totalGasSavings: cases.reduce((s, c) => s + (c.estimated_gas_savings || 0), 0),
        totalSolarSavings: cases.reduce((s, c) => s + (c.estimated_solar_savings || 0), 0),
        totalValidatedGas: cases.reduce((s, c) => s + (c.validated_gas_savings || 0), 0),
        totalValidatedSolar: cases.reduce((s, c) => s + (c.validated_solar_savings || 0), 0),
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
    const totalAll = data.totalEstimatedSavings + (data.totalGasSavings || 0) + (data.totalSolarSavings || 0);
    const totalValAll = data.totalValidatedSavings + (data.totalValidatedGas || 0) + (data.totalValidatedSolar || 0);

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('INFORME EJECUTIVO · CONSULTORÍA ENERGÉTICA 360', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generado: ${today}`, 105, 27, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      head: [['KPI', 'Valor']],
      body: [
        ['Total expedientes', String(data.totalCases)],
        ['Cerrados', String(data.closedCases)],
        ['Tasa de cierre', `${data.closeRate}%`],
        ['Conversión', `${data.conversionRate}%`],
        ['T. medio cierre', `${data.avgCloseTimeDays} días`],
        ['Ahorro total estimado', `${totalAll.toLocaleString('es-ES')} €`],
        ['  - Electricidad', `${data.totalEstimatedSavings.toLocaleString('es-ES')} €`],
        ['  - Gas', `${(data.totalGasSavings || 0).toLocaleString('es-ES')} €`],
        ['  - Solar', `${(data.totalSolarSavings || 0).toLocaleString('es-ES')} €`],
        ['Ahorro total validado', `${totalValAll.toLocaleString('es-ES')} €`],
        ['Contratos < 30d', String(data.contractsExpiring30)],
      ],
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    });

    if (data.companyBreakdown.length > 1) {
      const afterY = (doc as any).lastAutoTable?.finalY || 140;
      autoTable(doc, {
        startY: afterY + 10,
        head: [['Empresa', 'Expedientes', 'Cerrados', 'Ahorro total']],
        body: data.companyBreakdown.map(c => [
          c.companyName, String(c.cases), String(c.closed), `${c.savings.toLocaleString('es-ES')} €`,
        ]),
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`informe-ejecutivo-360-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }, []);

  const exportExcel = useCallback((data: ExecutiveKPIs) => {
    const wb = XLSX.utils.book_new();
    const totalAll = data.totalEstimatedSavings + (data.totalGasSavings || 0) + (data.totalSolarSavings || 0);

    const kpiRows = [
      ['KPI', 'Valor'],
      ['Total expedientes', data.totalCases],
      ['Cerrados', data.closedCases],
      ['Tasa cierre %', data.closeRate],
      ['Conversión %', data.conversionRate],
      ['T. medio cierre (días)', data.avgCloseTimeDays],
      ['Ahorro total estimado €', totalAll],
      ['Ahorro electricidad €', data.totalEstimatedSavings],
      ['Ahorro gas €', data.totalGasSavings || 0],
      ['Ahorro solar €', data.totalSolarSavings || 0],
      ['Ahorro validado total €', data.totalValidatedSavings + (data.totalValidatedGas || 0) + (data.totalValidatedSolar || 0)],
      ['Contratos <30d', data.contractsExpiring30],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPIs');

    if (data.companyBreakdown.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Empresa', 'Expedientes', 'Cerrados', 'Ahorro total'],
        ...data.companyBreakdown.map(c => [c.companyName, c.cases, c.closed, c.savings]),
      ]), 'Por empresa');
    }

    XLSX.writeFile(wb, `informe-ejecutivo-360-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, []);

  return { kpis, loading, fetchMultiCompanyKPIs, exportPDF, exportExcel };
}
