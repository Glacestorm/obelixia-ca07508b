/**
 * B13.5C — Read-only CSV export of impact previews. No DB writes.
 */
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ImpactPreviewRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';

function toCsv(rows: ImpactPreviewRow[]): string {
  const headers = [
    'company_id',
    'employee_id',
    'contract_id',
    'affected',
    'blocked',
    'current_salary_monthly',
    'target_salary_monthly',
    'delta_monthly',
    'delta_annual',
    'arrears_estimate',
    'employer_cost_delta',
  ];
  const body = rows.map((r) =>
    headers
      .map((h) => {
        const v = (r as unknown as Record<string, unknown>)[h];
        return v === null || v === undefined ? '' : String(v);
      })
      .join(','),
  );
  return [headers.join(','), ...body].join('\n');
}

export function AgreementImpactExportPanel({ previews }: { previews: ImpactPreviewRow[] }) {
  function onExport() {
    const csv = toCsv(previews);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agreement-impact-previews-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={previews.length === 0}>
      <Download className="mr-1 h-4 w-4" /> Exportar CSV
    </Button>
  );
}

export default AgreementImpactExportPanel;