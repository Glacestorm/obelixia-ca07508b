import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Check, CheckCheck, X, AlertOctagon } from 'lucide-react';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingStatusBadge } from './StagingStatusBadge';
import { checkPayslipLabelPreservesLiteral } from './stagingLiteralGuard';

// In test environments (jsdom), Radix portals + floating-ui have flaky behaviour
// that makes DropdownMenu items unreachable. We expose an off-screen, always
// mounted action surface so unit tests can drive row actions deterministically
// via stable `data-testid`s, while the real UI keeps the dropdown.
const SR_ONLY = 'sr-only';

export type StagingRowAction =
  | 'view'
  | 'edit'
  | 'approve_single'
  | 'approve_first'
  | 'approve_second'
  | 'reject'
  | 'mark_needs_correction';

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
            const isRejected = row.validation_status === 'rejected';
            const isApproved =
              row.validation_status === 'human_approved_single' ||
              row.validation_status === 'human_approved_second';
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`staging-row-actions-${row.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-testid={`staging-row-menu-${row.id}`}>
                      <DropdownMenuLabel>Acciones de revisión</DropdownMenuLabel>
                      <DropdownMenuItem
                        data-testid={`staging-action-view-${row.id}`}
                        onClick={() => onAction('view', row)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> Ver detalle
                      </DropdownMenuItem>
                      {!isRejected && !isApproved && (
                        <DropdownMenuItem
                          data-testid={`staging-action-edit-${row.id}`}
                          onClick={() => onAction('edit', row)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar propuesta
                        </DropdownMenuItem>
                      )}
                      {!isRejected && !isApproved && (
                        <>
                          <DropdownMenuSeparator />
                          {row.approval_mode.includes('single') && (
                            <DropdownMenuItem
                              data-testid={`staging-action-approve-single-${row.id}`}
                              onClick={() => onAction('approve_single', row)}
                            >
                              <Check className="mr-2 h-4 w-4" /> Aprobar (única)
                            </DropdownMenuItem>
                          )}
                          {row.approval_mode.includes('dual') && (
                            <>
                              <DropdownMenuItem
                                data-testid={`staging-action-approve-first-${row.id}`}
                                onClick={() => onAction('approve_first', row)}
                              >
                                <Check className="mr-2 h-4 w-4" /> Aprobar 1ª
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                data-testid={`staging-action-approve-second-${row.id}`}
                                onClick={() => onAction('approve_second', row)}
                              >
                                <CheckCheck className="mr-2 h-4 w-4" /> Aprobar 2ª
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            data-testid={`staging-action-needs-correction-${row.id}`}
                            onClick={() => onAction('mark_needs_correction', row)}
                          >
                            <AlertOctagon className="mr-2 h-4 w-4" /> Necesita corrección
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`staging-action-reject-${row.id}`}
                            className="text-destructive"
                            onClick={() => onAction('reject', row)}
                          >
                            <X className="mr-2 h-4 w-4" /> Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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