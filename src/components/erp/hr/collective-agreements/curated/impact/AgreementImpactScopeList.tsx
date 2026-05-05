/**
 * B13.5C — Affected scopes table.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ImpactScopeRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';

export function AgreementImpactScopeList({ scopes }: { scopes: ImpactScopeRow[] }) {
  if (scopes.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground" data-testid="impact-scopes-empty">
        Sin scopes calculados.
      </div>
    );
  }
  return (
    <Table data-testid="impact-scopes-table">
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Convenio</TableHead>
          <TableHead>Versión</TableHead>
          <TableHead className="text-right">Empleados (est.)</TableHead>
          <TableHead>Calculado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scopes.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-mono text-xs">{s.company_id}</TableCell>
            <TableCell className="font-mono text-xs">{s.agreement_id}</TableCell>
            <TableCell className="font-mono text-xs">{s.version_id}</TableCell>
            <TableCell className="text-right">{s.employee_count_estimated}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{s.computed_at}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default AgreementImpactScopeList;