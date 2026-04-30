import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingStatusBadge } from './StagingStatusBadge';
import { checkPayslipLabelPreservesLiteral } from './stagingLiteralGuard';
import { StagingRowActions, type StagingRowAction } from './StagingRowActions';

export type { StagingRowAction };

export interface StagingRowsTableProps {
  rows: StagingRowSummary[];
  onAction: (action: StagingRowAction, row: StagingRowSummary) => void;
  emptyLabel?: string;
}

function fmtMoney(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function StagingRowsTable({ rows, onAction, emptyLabel }: StagingRowsTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyLabel ?? 'No hay filas que mostrar.'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Año</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Concepto convenio</TableHead>
            <TableHead>Clave norm.</TableHead>
            <TableHead>Etiqueta payslip</TableHead>
            <TableHead className="text-right">Base anual</TableHead>
            <TableHead className="text-right">Base mensual</TableHead>
            <TableHead className="text-right">Plus conv.</TableHead>
            <TableHead className="text-right">Transporte</TableHead>
            <TableHead className="text-right">Antigüedad</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Modo</TableHead>
            <TableHead>Conf.</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pág.</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const r = row as any;
            const literal = checkPayslipLabelPreservesLiteral(
              row.concept_literal_from_agreement,
              row.payslip_label,
            );
            return (
              <TableRow key={row.id} data-testid={`staging-row-${row.id}`}>
                <TableCell>{row.year}</TableCell>
                <TableCell>{r.area_name ?? r.area_code ?? '—'}</TableCell>
                <TableCell>{row.professional_group}</TableCell>
                <TableCell>{row.level ?? '—'}</TableCell>
                <TableCell>{row.category ?? '—'}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={row.concept_literal_from_agreement}>
                  {row.concept_literal_from_agreement}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.normalized_concept_key}</TableCell>
                <TableCell className="max-w-[180px] truncate" title={row.payslip_label}>
                  <span className={literal.hasBlocker ? 'text-destructive' : ''}>
                    {row.payslip_label}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.salary_base_annual)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.salary_base_monthly)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMoney(r.plus_convenio_annual ?? r.plus_convenio_monthly)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.plus_transport)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtMoney(r.plus_antiguedad)}</TableCell>
                <TableCell className="text-xs">{row.extraction_method}</TableCell>
                <TableCell className="text-xs">{row.approval_mode}</TableCell>
                <TableCell className="text-xs">{row.row_confidence ?? '—'}</TableCell>
                <TableCell>
                  <StagingStatusBadge status={row.validation_status} />
                </TableCell>
                <TableCell className="text-xs">{row.source_page}</TableCell>
                <TableCell className="text-right">
                  <StagingRowActions row={row} onAction={onAction} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default StagingRowsTable;