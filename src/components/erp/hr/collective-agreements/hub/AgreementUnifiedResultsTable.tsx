import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';
import AgreementStatusBadges from './AgreementStatusBadges';

interface Props {
  rows: UnifiedAgreementRow[];
  loading?: boolean;
  onSelect: (row: UnifiedAgreementRow) => void;
  emptyHint?: string;
}

const ORIGIN_LABEL: Record<string, string> = {
  operative: 'Operativa',
  registry: 'Registry',
  both: 'Operativa + Registry',
  candidate: 'Candidato',
};

export function AgreementUnifiedResultsTable({ rows, loading, onSelect, emptyHint }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Buscando…</CardContent>
      </Card>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <Card data-testid="agreement-results-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <Badge variant="outline">NO_ENCONTRADO</Badge>
          <p>
            {emptyHint ??
              'No hay coincidencias. Si el convenio no aparece, abre la pestaña "No encontrado" para ver los pasos para incorporarlo.'}
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card data-testid="agreement-results-table">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resultados ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Convenio</th>
                <th className="py-2 pr-3">Origen</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{row.display_name}</div>
                    <div className="text-xs text-muted-foreground">{row.key}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant="secondary">{ORIGIN_LABEL[row.origin] ?? row.origin}</Badge>
                  </td>
                  <td className="py-2 pr-3">
                    <AgreementStatusBadges badges={row.badges} />
                  </td>
                  <td className="py-2 pr-3">
                    <Button size="sm" variant="outline" onClick={() => onSelect(row)}>
                      Ver detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default AgreementUnifiedResultsTable;