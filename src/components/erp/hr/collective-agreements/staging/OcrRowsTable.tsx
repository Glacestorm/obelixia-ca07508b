import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingRowsTable, type StagingRowAction } from './StagingRowsTable';

export interface OcrRowsTableProps {
  rows: StagingRowSummary[];
  onAction: (action: StagingRowAction, row: StagingRowSummary) => void;
}

export function OcrRowsTable({ rows, onAction }: OcrRowsTableProps) {
  const filtered = rows.filter((r) => r.extraction_method === 'ocr');
  return (
    <StagingRowsTable
      rows={filtered}
      onAction={onAction}
      emptyLabel="No hay filas OCR pendientes."
    />
  );
}

export default OcrRowsTable;