import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export interface AgreementSalaryRowsReviewTableProps {
  rows: Array<Record<string, unknown>>;
}

function formatNum(v: unknown): string {
  if (typeof v !== 'number') return '—';
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AgreementSalaryRowsReviewTable({ rows }: AgreementSalaryRowsReviewTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tablas salariales (lectura)</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay filas parseadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Mensual</TableHead>
                  <TableHead>Anual</TableHead>
                  <TableHead>Plus convenio</TableHead>
                  <TableHead>Otros pluses</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Pág.</TableHead>
                  <TableHead>Extracto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={(r.id as string) ?? i}>
                    <TableCell>{(r.professional_group as string) ?? '—'}</TableCell>
                    <TableCell>{(r.category as string) ?? '—'}</TableCell>
                    <TableCell>{(r.level as string) ?? '—'}</TableCell>
                    <TableCell>{formatNum(r.monthly_salary)}</TableCell>
                    <TableCell>{formatNum(r.annual_salary)}</TableCell>
                    <TableCell>{formatNum(r.agreement_plus)}</TableCell>
                    <TableCell>{formatNum(r.other_plus)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeof r.row_confidence === 'number'
                          ? `${Math.round((r.row_confidence as number) * 100)}%`
                          : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid="row-source-page">{(r.source_page as number) ?? '—'}</TableCell>
                    <TableCell
                      data-testid="row-source-excerpt"
                      className="max-w-xs truncate"
                      title={(r.source_excerpt as string) ?? ''}
                    >
                      {(r.source_excerpt as string) ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementSalaryRowsReviewTable;