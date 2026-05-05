/**
 * B13.5C — Impact previews table (read-only).
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ImpactPreviewRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';

interface Props {
  previews: ImpactPreviewRow[];
  onView: (row: ImpactPreviewRow) => void;
  onMarkStale: (row: ImpactPreviewRow) => void;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function AgreementImpactPreviewTable({ previews, onView, onMarkStale }: Props) {
  if (previews.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground" data-testid="impact-previews-empty">
        Sin previews.
      </div>
    );
  }
  return (
    <Table data-testid="impact-previews-table">
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Δ mensual</TableHead>
          <TableHead className="text-right">Δ anual</TableHead>
          <TableHead className="text-right">Atrasos</TableHead>
          <TableHead className="text-right">Coste empresa</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {previews.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-mono text-xs">{p.employee_id}</TableCell>
            <TableCell>
              {p.blocked ? (
                <Badge variant="destructive">Bloqueado</Badge>
              ) : p.affected ? (
                <Badge>Afectado</Badge>
              ) : (
                <Badge variant="secondary">Sin impacto</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">{fmt(p.delta_monthly)}</TableCell>
            <TableCell className="text-right">{fmt(p.delta_annual)}</TableCell>
            <TableCell className="text-right">{fmt(p.arrears_estimate)}</TableCell>
            <TableCell className="text-right">{fmt(p.employer_cost_delta)}</TableCell>
            <TableCell className="space-x-1">
              <Button size="sm" variant="outline" onClick={() => onView(p)}>
                Ver detalle
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMarkStale(p)}>
                Marcar obsoleto
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default AgreementImpactPreviewTable;