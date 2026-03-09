import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EnergyProposal } from './useEnergyProposals';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProposalPDFContext {
  companyName?: string;
  caseTitle?: string;
  customerName?: string;
  address?: string;
}

export function useEnergyProposalPDF() {
  const generatePDF = useCallback((proposal: EnergyProposal, ctx: ProposalPDFContext) => {
    const doc = new jsPDF();
    const fmtDate = (d: string | null) => {
      if (!d) return '—';
      try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
    };
    const fmtCurrency = (v: number | null) => v != null ? `${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—';

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 95);
    doc.text('PROPUESTA COMERCIAL', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Versión ${proposal.version} · ${fmtDate(proposal.issued_at || proposal.created_at)}`, 105, 33, { align: 'center' });

    // Company info
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(ctx.companyName || 'Consultoría Eléctrica', 14, 48);
    doc.setFontSize(9);
    doc.text(`Expediente: ${ctx.caseTitle || '—'}`, 14, 54);
    doc.text(`Cliente: ${ctx.customerName || '—'}`, 14, 60);
    doc.text(`Dirección: ${ctx.address || '—'}`, 14, 66);
    doc.text(`CUPS: ${proposal.cups || '—'}`, 14, 72);

    // Divider
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(14, 78, 196, 78);

    // Current situation vs Recommendation table
    autoTable(doc, {
      startY: 84,
      head: [['Concepto', 'Situación actual', 'Recomendación']],
      body: [
        ['Comercializadora', proposal.current_supplier || '—', proposal.recommended_supplier || '—'],
        ['Tarifa', proposal.current_tariff || '—', proposal.recommended_tariff || '—'],
        ['Coste anual', fmtCurrency(proposal.current_annual_cost), fmtCurrency(proposal.estimated_annual_cost)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    const afterTable = (doc as any).lastAutoTable?.finalY || 120;

    // Savings highlight
    doc.setFillColor(220, 245, 220);
    doc.roundedRect(14, afterTable + 6, 182, 20, 3, 3, 'F');
    doc.setFontSize(13);
    doc.setTextColor(20, 120, 60);
    doc.text(`AHORRO ESTIMADO ANUAL: ${fmtCurrency(proposal.estimated_annual_savings)}`, 105, afterTable + 19, { align: 'center' });

    let y = afterTable + 36;

    // Conditions
    if (proposal.conditions) {
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text('Condiciones:', 14, y);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(proposal.conditions, 178);
      doc.text(lines, 14, y + 6);
      y += 6 + lines.length * 4.5;
    }

    // Observations
    if (proposal.observations) {
      doc.setFontSize(10);
      doc.text('Observaciones:', 14, y + 4);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(proposal.observations, 178);
      doc.text(lines, 14, y + 10);
      y += 10 + lines.length * 4.5;
    }

    // Validity
    if (proposal.valid_until) {
      doc.setFontSize(9);
      doc.setTextColor(150, 50, 50);
      doc.text(`Propuesta válida hasta: ${fmtDate(proposal.valid_until)}`, 14, y + 10);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${fmtDate(new Date().toISOString())} · Ref: ${proposal.id.slice(0, 8)}`, 105, 285, { align: 'center' });

    return doc;
  }, []);

  const downloadPDF = useCallback((proposal: EnergyProposal, ctx: ProposalPDFContext) => {
    const doc = generatePDF(proposal, ctx);
    doc.save(`propuesta-v${proposal.version}-${proposal.id.slice(0, 8)}.pdf`);
    toast.success('PDF descargado');
  }, [generatePDF]);

  const uploadPDF = useCallback(async (proposal: EnergyProposal, ctx: ProposalPDFContext, caseId: string) => {
    try {
      const doc = generatePDF(proposal, ctx);
      const blob = doc.output('blob');
      const path = `proposals/${caseId}/propuesta-v${proposal.version}.pdf`;

      const { error: uploadErr } = await supabase.storage
        .from('energy-documents')
        .upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadErr) throw uploadErr;

      // Update proposal with pdf_path
      await supabase.from('energy_proposals')
        .update({ pdf_path: path } as any)
        .eq('id', proposal.id);

      toast.success('PDF guardado en el expediente');
      return path;
    } catch (err) {
      console.error('[useEnergyProposalPDF] upload error:', err);
      toast.error('Error al guardar PDF');
      return null;
    }
  }, [generatePDF]);

  /** Get PDF as base64 string for API transmission */
  const getBase64 = useCallback((proposal: EnergyProposal, ctx: ProposalPDFContext): string => {
    const doc = generatePDF(proposal, ctx);
    // output as base64 string (strip data URI prefix)
    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1] || '';
  }, [generatePDF]);

  return { generatePDF, downloadPDF, uploadPDF, getBase64 };
}
