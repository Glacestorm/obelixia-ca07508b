import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingRowsTable, type StagingRowAction } from './StagingRowsTable';

export interface ManualRowsTableProps {
  rows: StagingRowSummary[];
  onAction: (action: StagingRowAction, row: StagingRowSummary) => void;
}

export function ManualRowsTable({ rows, onAction }: ManualRowsTableProps) {
  const filtered = rows.filter(
    (r) => r.extraction_method === 'manual_csv' || r.extraction_method === 'manual_form',
  );
  return (
    <StagingRowsTable
      rows={filtered}
      onAction={onAction}
      emptyLabel="No hay filas manuales pendientes."
    />
  );
}

export default ManualRowsTable;